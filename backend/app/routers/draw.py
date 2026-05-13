import secrets
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional

from app.core.jwt import require_complete_profile
from app.db.session import get_db
from app.models.models import (
    ChitGroup, ContributorSlot, Cycle, GroupAdmin,
    InstallmentPayment, PaymentStatus, User,
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


def _eligible_slots(db: Session, group: ChitGroup, cycle: Cycle):
    """Return slots eligible for the draw (not already won, optionally not in arrears)."""
    all_slots = db.query(ContributorSlot).filter(ContributorSlot.group_id == group.id).all()

    # Slots that already won in previous cycles of this group
    past_winner_ids = {
        c.winner_slot_id
        for c in db.query(Cycle).filter(
            Cycle.group_id == group.id,
            Cycle.winner_slot_id != None,
        ).all()
    }

    eligible = [s for s in all_slots if s.id not in past_winner_ids]

    if group.exclude_arrears_from_draw:
        # Exclude slots with no confirmed paid installment for current cycle
        paid_slot_ids = {
            p.slot_id
            for p in db.query(InstallmentPayment).filter(
                InstallmentPayment.cycle_id == cycle.id,
                InstallmentPayment.status == PaymentStatus.paid,
            ).all()
        }
        eligible = [s for s in eligible if s.id in paid_slot_ids] or eligible  # fallback: don't exclude all

    return eligible


class ManualDrawRequest(BaseModel):
    slot_id: int
    override_eligibility: bool = False


class ConfirmDrawRequest(BaseModel):
    slot_id: int


# ---------------------------------------------------------------------------
# Random draw
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/{cycle_number}/draw/random")
def random_draw(
    group_id: int,
    cycle_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _require_admin(db, group_id, current_user.id)
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    cycle = _get_cycle_or_404(db, group_id, cycle_number)

    if cycle.winner_slot_id:
        raise HTTPException(status_code=400, detail="A winner has already been selected for this cycle.")

    eligible = _eligible_slots(db, group, cycle)
    if not eligible:
        raise HTTPException(status_code=400, detail="No eligible slots for the draw. All contributors may have already won.")

    chosen = secrets.choice(eligible)
    return {
        "candidate_slot_id": chosen.id,
        "candidate_slot_name": chosen.name,
        "message": "Confirm this winner with POST /draw/confirm",
    }


# ---------------------------------------------------------------------------
# Manual draw
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/{cycle_number}/draw/manual")
def manual_draw(
    group_id: int,
    cycle_number: int,
    body: ManualDrawRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _require_admin(db, group_id, current_user.id)
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    cycle = _get_cycle_or_404(db, group_id, cycle_number)

    if cycle.winner_slot_id:
        raise HTTPException(status_code=400, detail="A winner has already been selected for this cycle.")

    slot = db.query(ContributorSlot).filter(
        ContributorSlot.id == body.slot_id,
        ContributorSlot.group_id == group_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    eligible = _eligible_slots(db, group, cycle)
    is_eligible = any(s.id == body.slot_id for s in eligible)

    if not is_eligible and not body.override_eligibility:
        return {
            "warning": "This slot has already won in a previous cycle or is in arrears.",
            "slot_id": body.slot_id,
            "slot_name": slot.name,
            "hint": "Set override_eligibility=true to select anyway.",
        }

    return {
        "candidate_slot_id": slot.id,
        "candidate_slot_name": slot.name,
        "message": "Confirm this winner with POST /draw/confirm",
    }


# ---------------------------------------------------------------------------
# Confirm draw
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/{cycle_number}/draw/confirm")
def confirm_draw(
    group_id: int,
    cycle_number: int,
    body: ConfirmDrawRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _require_admin(db, group_id, current_user.id)
    cycle = _get_cycle_or_404(db, group_id, cycle_number)

    if cycle.winner_slot_id:
        raise HTTPException(status_code=400, detail="A winner has already been confirmed for this cycle.")

    slot = db.query(ContributorSlot).filter(
        ContributorSlot.id == body.slot_id,
        ContributorSlot.group_id == group_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found.")

    cycle.winner_slot_id = body.slot_id
    now = datetime.now(timezone.utc)

    # Auto-mark the winner's installment(s) as paid.
    # If the slot has sub-members, create a paid record for each one.
    # Otherwise create a single slot-level record.
    if slot.sub_members:
        for sm in slot.sub_members:
            existing = db.query(InstallmentPayment).filter(
                InstallmentPayment.cycle_id == cycle.id,
                InstallmentPayment.slot_id == body.slot_id,
                InstallmentPayment.sub_member_id == sm.id,
            ).first()
            if existing:
                existing.status = PaymentStatus.paid
                existing.paid_at = now
                existing.confirmed_by = current_user.id
            else:
                db.add(InstallmentPayment(
                    cycle_id=cycle.id,
                    slot_id=body.slot_id,
                    sub_member_id=sm.id,
                    status=PaymentStatus.paid,
                    paid_at=now,
                    confirmed_by=current_user.id,
                ))
    else:
        existing = db.query(InstallmentPayment).filter(
            InstallmentPayment.cycle_id == cycle.id,
            InstallmentPayment.slot_id == body.slot_id,
            InstallmentPayment.sub_member_id == None,
        ).first()
        if existing:
            existing.status = PaymentStatus.paid
            existing.paid_at = now
            existing.confirmed_by = current_user.id
        else:
            db.add(InstallmentPayment(
                cycle_id=cycle.id,
                slot_id=body.slot_id,
                status=PaymentStatus.paid,
                paid_at=now,
                confirmed_by=current_user.id,
            ))

    db.commit()
    return {
        "message": f"Winner confirmed: {slot.name}",
        "cycle_number": cycle_number,
        "winner_slot_id": slot.id,
        "winner_slot_name": slot.name,
    }


# ---------------------------------------------------------------------------
# Draw history
# ---------------------------------------------------------------------------

@router.get("/{group_id}/draw-history")
def draw_history(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    cycles = db.query(Cycle).filter(Cycle.group_id == group_id).order_by(Cycle.cycle_number).all()
    from app.models.models import PayoutRecord
    result = []
    for cycle in cycles:
        payout = db.query(PayoutRecord).filter(PayoutRecord.cycle_id == cycle.id).first()
        winner_slot = None
        if cycle.winner_slot_id:
            ws = db.query(ContributorSlot).filter(ContributorSlot.id == cycle.winner_slot_id).first()
            winner_slot = {"id": ws.id, "name": ws.name} if ws else None
        result.append({
            "cycle_number": cycle.cycle_number,
            "is_closed": cycle.is_closed,
            "winner_slot": winner_slot,
            "payout_status": "completed" if payout else "pending",
        })
    return result
