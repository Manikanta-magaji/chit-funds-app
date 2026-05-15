from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.jwt import require_complete_profile
from app.db.session import get_db
from app.models.models import (
    ChitGroup, ContributorSlot, Cycle, GroupAdmin,
    InstallmentPayment, PaymentStatus, PayoutRecord, User,
)

router = APIRouter()


def _require_admin(db: Session, group_id: int, user_id: int):
    if not db.query(GroupAdmin).filter(
        GroupAdmin.group_id == group_id,
        GroupAdmin.user_id == user_id,
    ).first():
        raise HTTPException(status_code=403, detail="Admin access required.")


def _get_cycle_or_404(db: Session, group_id: int, cycle_number: int) -> Cycle:
    cycle = db.query(Cycle).filter(
        Cycle.group_id == group_id,
        Cycle.cycle_number == cycle_number,
    ).first()
    if not cycle:
        raise HTTPException(status_code=404, detail="Cycle not found.")
    return cycle


def _get_slot_or_404(db: Session, group_id: int, slot_id: int) -> ContributorSlot:
    slot = db.query(ContributorSlot).filter(
        ContributorSlot.id == slot_id,
        ContributorSlot.group_id == group_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")
    return slot


class PaymentActionRequest(BaseModel):
    action: str  # "pay" or "unpay"
    sub_member_id: Optional[int] = None


class ConfirmPaymentRequest(BaseModel):
    approve: bool


# ---------------------------------------------------------------------------
# Get installment status for a cycle
# ---------------------------------------------------------------------------

@router.get("/{group_id}/cycles/{cycle_number}/installments")
def get_installments(
    group_id: int,
    cycle_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    cycle = _get_cycle_or_404(db, group_id, cycle_number)
    slots = db.query(ContributorSlot).filter(ContributorSlot.group_id == group_id).all()
    result = []
    for slot in slots:
        payments = db.query(InstallmentPayment).filter(
            InstallmentPayment.cycle_id == cycle.id,
            InstallmentPayment.slot_id == slot.id,
        ).all()

        # Aggregate status for the slot
        sub_member_count = len(slot.sub_members)
        if sub_member_count > 1:
            paid_count = sum(
                1 for p in payments
                if p.sub_member_id is not None and p.status == PaymentStatus.paid
            )
            if paid_count == sub_member_count:
                agg_status = "paid"
            elif paid_count > 0:
                agg_status = "partial"
            elif any(p.status == PaymentStatus.pending for p in payments):
                agg_status = "pending"
            else:
                agg_status = "unpaid"
        elif not payments:
            agg_status = "unpaid"
        elif all(p.status == PaymentStatus.paid for p in payments):
            agg_status = "paid"
        elif any(p.status == PaymentStatus.pending for p in payments):
            agg_status = "pending"
        else:
            agg_status = "unpaid"

        # Find the payment record that is paid/pending for audit info
        audit_payment = next(
            (p for p in payments if p.status in (PaymentStatus.paid, PaymentStatus.pending)),
            None
        )
        confirmed_by_name = None
        paid_at = None
        is_self_reported = False
        if audit_payment:
            paid_at = audit_payment.paid_at.isoformat() if audit_payment.paid_at else None
            if audit_payment.confirmed_by:
                confirmer = db.query(User).filter(User.id == audit_payment.confirmed_by).first()
                confirmed_by_name = confirmer.display_name if confirmer else None
            else:
                is_self_reported = True  # status=pending with no confirmed_by = self-reported

        def _confirmer_name(user_id):
            if not user_id:
                return None
            u = db.query(User).filter(User.id == user_id).first()
            return u.display_name if u else None

        result.append({
            "slot_id": slot.id,
            "slot_name": slot.name,
            "status": agg_status,
            "confirmed_by_name": confirmed_by_name,
            "is_self_reported": is_self_reported,
            "paid_at": paid_at,
            "payments": [
                {
                    "id": p.id,
                    "sub_member_id": p.sub_member_id,
                    "status": p.status.value if hasattr(p.status, "value") else p.status,
                    "paid_at": p.paid_at.isoformat() if p.paid_at else None,
                    "confirmed_by": p.confirmed_by,
                    "confirmed_by_name": _confirmer_name(p.confirmed_by),
                }
                for p in payments
            ],
        })
    return result


# ---------------------------------------------------------------------------
# Mark slot installment as paid / unpaid (admin or slot member)
# ---------------------------------------------------------------------------

@router.put("/{group_id}/cycles/{cycle_number}/installments/{slot_id}")
def update_installment(
    group_id: int,
    cycle_number: int,
    slot_id: int,
    body: PaymentActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    cycle = _get_cycle_or_404(db, group_id, cycle_number)
    slot = _get_slot_or_404(db, group_id, slot_id)

    # Allow group admins OR the slot's linked member / the specific sub-member being updated
    is_admin = db.query(GroupAdmin).filter(
        GroupAdmin.group_id == group_id, GroupAdmin.user_id == current_user.id
    ).first() is not None

    # For past cycles, only admins may make changes
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    is_past_cycle = group and cycle_number < group.current_cycle
    if is_past_cycle and not is_admin:
        raise HTTPException(status_code=403, detail="Only admins can update installments for past cycles.")

    if not is_admin:
        if body.sub_member_id is not None:
            # Must be the specific sub-member being marked
            is_slot_member = any(
                sm.linked_user_id == current_user.id
                for sm in slot.sub_members
                if sm.id == body.sub_member_id
            )
        else:
            is_slot_member = slot.linked_user_id == current_user.id
        if not is_slot_member:
            raise HTTPException(status_code=403, detail="Not authorised to update this slot's payment.")

    payment = db.query(InstallmentPayment).filter(
        InstallmentPayment.cycle_id == cycle.id,
        InstallmentPayment.slot_id == slot.id,
        InstallmentPayment.sub_member_id == body.sub_member_id,
    ).first()

    if body.action == "pay":
        if payment:
            payment.status = PaymentStatus.paid
            payment.paid_at = datetime.now(timezone.utc)
            payment.confirmed_by = current_user.id
        else:
            payment = InstallmentPayment(
                cycle_id=cycle.id,
                slot_id=slot.id,
                sub_member_id=body.sub_member_id,
                status=PaymentStatus.paid,
                confirmed_by=current_user.id,
                paid_at=datetime.now(timezone.utc),
            )
            db.add(payment)
    elif body.action == "unpay":
        if payment:
            db.delete(payment)
    else:
        raise HTTPException(status_code=400, detail="action must be 'pay' or 'unpay'.")

    db.commit()
    return {"message": "Payment updated."}


# ---------------------------------------------------------------------------
# Contributor self-reports payment (pending)
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/{cycle_number}/installments/{slot_id}/self-report")
def self_report_payment(
    group_id: int,
    cycle_number: int,
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    cycle = _get_cycle_or_404(db, group_id, cycle_number)
    slot = _get_slot_or_404(db, group_id, slot_id)

    # Self-report is only allowed on the current cycle
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    if group and cycle_number != group.current_cycle:
        raise HTTPException(status_code=403, detail="Self-reporting is only allowed for the current cycle.")

    # Verify user is linked to this slot or a sub-member
    if slot.linked_user_id != current_user.id:
        is_sub = any(sm.linked_user_id == current_user.id for sm in slot.sub_members)
        if not is_sub:
            raise HTTPException(status_code=403, detail="You are not linked to this slot.")

    existing = db.query(InstallmentPayment).filter(
        InstallmentPayment.cycle_id == cycle.id,
        InstallmentPayment.slot_id == slot.id,
        InstallmentPayment.sub_member_id == None,
    ).first()
    if existing and existing.status == PaymentStatus.paid:
        raise HTTPException(status_code=400, detail="Payment already confirmed as paid.")

    if existing:
        existing.status = PaymentStatus.paid
        existing.paid_at = datetime.now(timezone.utc)
    else:
        db.add(InstallmentPayment(
            cycle_id=cycle.id,
            slot_id=slot.id,
            status=PaymentStatus.paid,
            paid_at=datetime.now(timezone.utc),
        ))
    db.commit()
    return {"message": "Payment recorded."}


# ---------------------------------------------------------------------------
# Admin confirms / rejects pending payment
# ---------------------------------------------------------------------------

@router.put("/{group_id}/cycles/{cycle_number}/installments/{slot_id}/confirm")
def confirm_payment(
    group_id: int,
    cycle_number: int,
    slot_id: int,
    body: ConfirmPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _require_admin(db, group_id, current_user.id)
    cycle = _get_cycle_or_404(db, group_id, cycle_number)
    slot = _get_slot_or_404(db, group_id, slot_id)

    payment = db.query(InstallmentPayment).filter(
        InstallmentPayment.cycle_id == cycle.id,
        InstallmentPayment.slot_id == slot.id,
        InstallmentPayment.status == PaymentStatus.pending,
    ).first()
    if not payment:
        raise HTTPException(status_code=404, detail="No pending payment found for this slot.")

    if body.approve:
        payment.status = PaymentStatus.paid
        payment.paid_at = datetime.now(timezone.utc)
        payment.confirmed_by = current_user.id
    else:
        payment.status = PaymentStatus.unpaid
    db.commit()
    return {"message": "Payment confirmed." if body.approve else "Payment rejected."}


# ---------------------------------------------------------------------------
# Advance cycle
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/advance")
def advance_cycle(
    group_id: int,
    force: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _require_admin(db, group_id, current_user.id)
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")

    current_cycle = db.query(Cycle).filter(
        Cycle.group_id == group_id,
        Cycle.cycle_number == group.current_cycle,
    ).first()
    if not current_cycle:
        raise HTTPException(status_code=404, detail="Current cycle not found.")
    if not current_cycle.winner_slot_id:
        raise HTTPException(status_code=400, detail="Cannot advance: no prize winner set for this cycle.")

    # Check for unpaid installments
    slots = db.query(ContributorSlot).filter(ContributorSlot.group_id == group_id).all()
    unpaid_slots = []
    for slot in slots:
        payment = db.query(InstallmentPayment).filter(
            InstallmentPayment.cycle_id == current_cycle.id,
            InstallmentPayment.slot_id == slot.id,
            InstallmentPayment.status == PaymentStatus.paid,
        ).first()
        if not payment:
            unpaid_slots.append(slot.name)

    if unpaid_slots and not force:
        return {
            "warning": "Some installments are unpaid.",
            "unpaid_slots": unpaid_slots,
            "hint": "Pass ?force=true to advance anyway.",
        }

    if group.current_cycle >= group.total_cycles:
        raise HTTPException(status_code=400, detail="All cycles are complete. The fund is finished.")

    current_cycle.is_closed = True
    group.current_cycle += 1
    next_cycle = Cycle(group_id=group_id, cycle_number=group.current_cycle)
    db.add(next_cycle)
    db.commit()
    return {"message": f"Advanced to cycle {group.current_cycle}."}
