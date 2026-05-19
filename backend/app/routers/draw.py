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
    InstallmentPayment, PaymentStatus, SubMember, User,
)

router = APIRouter()


def _resolve_upi(linked_user, explicit_upi: str | None, mobile: str | None) -> str | None:
    """Resolve effective UPI handle: linked user UPI > explicit offline UPI."""
    if linked_user and linked_user.upi_id:
        return linked_user.upi_id
    if explicit_upi:
        return explicit_upi
    return None


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

    def _mark_slot_paid(target_slot: ContributorSlot) -> None:
        """Auto-mark all installment positions for a slot as paid for this cycle."""
        if target_slot.sub_members:
            for sm in target_slot.sub_members:
                existing = db.query(InstallmentPayment).filter(
                    InstallmentPayment.cycle_id == cycle.id,
                    InstallmentPayment.slot_id == target_slot.id,
                    InstallmentPayment.sub_member_id == sm.id,
                ).first()
                if existing:
                    existing.status = PaymentStatus.paid
                    existing.paid_at = now
                    existing.confirmed_by = current_user.id
                else:
                    db.add(InstallmentPayment(
                        cycle_id=cycle.id,
                        slot_id=target_slot.id,
                        sub_member_id=sm.id,
                        status=PaymentStatus.paid,
                        paid_at=now,
                        confirmed_by=current_user.id,
                    ))
        else:
            existing = db.query(InstallmentPayment).filter(
                InstallmentPayment.cycle_id == cycle.id,
                InstallmentPayment.slot_id == target_slot.id,
                InstallmentPayment.sub_member_id == None,
            ).first()
            if existing:
                existing.status = PaymentStatus.paid
                existing.paid_at = now
                existing.confirmed_by = current_user.id
            else:
                db.add(InstallmentPayment(
                    cycle_id=cycle.id,
                    slot_id=target_slot.id,
                    status=PaymentStatus.paid,
                    paid_at=now,
                    confirmed_by=current_user.id,
                ))

    def _mark_sub_member_paid(slot_id: int, sm: SubMember) -> None:
        """Auto-mark a single sub-member payment as paid for this cycle."""
        existing = db.query(InstallmentPayment).filter(
            InstallmentPayment.cycle_id == cycle.id,
            InstallmentPayment.slot_id == slot_id,
            InstallmentPayment.sub_member_id == sm.id,
        ).first()
        if existing:
            existing.status = PaymentStatus.paid
            existing.paid_at = now
            existing.confirmed_by = current_user.id
        else:
            db.add(InstallmentPayment(
                cycle_id=cycle.id,
                slot_id=slot_id,
                sub_member_id=sm.id,
                status=PaymentStatus.paid,
                paid_at=now,
                confirmed_by=current_user.id,
            ))

    # Mark the winning slot as paid.
    _mark_slot_paid(slot)

    # Collect all user IDs associated with the winning slot:
    #   - the slot's own linked user (full/standalone slot), OR
    #   - each sub-member's linked user (shared slot with sub-members).
    winner_user_ids: set[int] = set()
    if slot.linked_user_id is not None:
        winner_user_ids.add(slot.linked_user_id)
    for sm in (slot.sub_members or []):
        if sm.linked_user_id is not None:
            winner_user_ids.add(sm.linked_user_id)

    # For each winning user, mark every other position they hold in this group as paid.
    for winner_user_id in winner_user_ids:
        # Full slots directly owned by this user (excluding the winning slot itself)
        other_full_slots = db.query(ContributorSlot).filter(
            ContributorSlot.group_id == group_id,
            ContributorSlot.linked_user_id == winner_user_id,
            ContributorSlot.id != slot.id,
        ).all()
        for other_slot in other_full_slots:
            _mark_slot_paid(other_slot)

        # Sub-member shares in shared slots not already covered
        covered_slot_ids = {slot.id} | {s.id for s in other_full_slots}
        sub_member_entries = db.query(SubMember).filter(
            SubMember.linked_user_id == winner_user_id,
        ).all()
        for sm_entry in sub_member_entries:
            parent_slot = db.query(ContributorSlot).filter(
                ContributorSlot.id == sm_entry.slot_id,
                ContributorSlot.group_id == group_id,
            ).first()
            if parent_slot and parent_slot.id not in covered_slot_ids:
                _mark_sub_member_paid(parent_slot.id, sm_entry)

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
    from app.models.models import InstallmentPayment, PaymentStatus
    result = []
    for cycle in cycles:
        winner_slot = None
        if cycle.winner_slot_id:
            ws = db.query(ContributorSlot).filter(ContributorSlot.id == cycle.winner_slot_id).first()
            if ws:
                linked_user = db.query(User).filter(User.id == ws.linked_user_id).first() if ws.linked_user_id else None
                # Build sub-member payout details when slot has sub-members
                sub_members_out = []
                for sm in (ws.sub_members or []):
                    sm_linked_user = db.query(User).filter(User.id == sm.linked_user_id).first() if sm.linked_user_id else None
                    sub_members_out.append({
                        "id": sm.id,
                        "name": sm.name,
                        "upi_id": _resolve_upi(sm_linked_user, sm.upi_id, sm.mobile_number),
                        "share_amount": sm.split_amount,
                    })
                winner_slot = {
                    "id": ws.id,
                    "name": ws.name,
                    "upi_id": _resolve_upi(linked_user, ws.upi_id, ws.mobile_number),
                    "display_name": linked_user.display_name if linked_user else ws.name,
                    "sub_members": sub_members_out,
                }
        # Auto-derive payout status: completed when all non-winner slots have paid
        if cycle.winner_slot_id:
            non_winner_slots = [
                s for s in db.query(ContributorSlot).filter(
                    ContributorSlot.group_id == group_id
                ).all()
                if s.id != cycle.winner_slot_id
            ]
            def _slot_fully_paid(s):
                payments = db.query(InstallmentPayment).filter(
                    InstallmentPayment.cycle_id == cycle.id,
                    InstallmentPayment.slot_id == s.id,
                ).all()
                sub_count = len(s.sub_members)
                if sub_count > 1:
                    return sum(1 for p in payments if p.sub_member_id is not None and p.status == PaymentStatus.paid) == sub_count
                return bool(payments) and all(p.status == PaymentStatus.paid for p in payments)
            all_paid = bool(non_winner_slots) and all(_slot_fully_paid(s) for s in non_winner_slots)
            payout_status = "completed" if all_paid else "pending"
        else:
            payout_status = None
        result.append({
            "cycle_number": cycle.cycle_number,
            "is_closed": cycle.is_closed,
            "winner_slot": winner_slot,
            "payout_status": payout_status,
        })
    return result
