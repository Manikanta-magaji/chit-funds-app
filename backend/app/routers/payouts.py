from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.jwt import require_complete_profile
from app.db.session import get_db
from app.models.models import ContributorSlot, Cycle, GroupAdmin, PayoutRecord, User

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


# ---------------------------------------------------------------------------
# Admin records payout as completed
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/{cycle_number}/payout")
def record_payout(
    group_id: int,
    cycle_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _require_admin(db, group_id, current_user.id)
    cycle = _get_cycle_or_404(db, group_id, cycle_number)

    if not cycle.winner_slot_id:
        raise HTTPException(status_code=400, detail="No winner set for this cycle. Cannot record payout.")

    existing = db.query(PayoutRecord).filter(PayoutRecord.cycle_id == cycle.id).first()
    if existing:
        return {"message": "Payout already recorded.", "payout_id": existing.id}

    payout = PayoutRecord(
        cycle_id=cycle.id,
        winner_slot_id=cycle.winner_slot_id,
        confirmed_by=current_user.id,
        payout_date=datetime.now(timezone.utc),
    )
    db.add(payout)
    db.commit()
    db.refresh(payout)
    return {"message": "Payout recorded.", "payout_id": payout.id}


# ---------------------------------------------------------------------------
# Winner self-confirms receipt of payout
# ---------------------------------------------------------------------------

@router.post("/{group_id}/cycles/{cycle_number}/payout/winner-confirm")
def winner_confirm_payout(
    group_id: int,
    cycle_number: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    cycle = _get_cycle_or_404(db, group_id, cycle_number)

    if not cycle.winner_slot_id:
        raise HTTPException(status_code=400, detail="No winner set for this cycle.")

    # Verify the current user is linked to the winning slot
    winner_slot = db.query(ContributorSlot).filter(
        ContributorSlot.id == cycle.winner_slot_id
    ).first()
    if not winner_slot or winner_slot.linked_user_id != current_user.id:
        raise HTTPException(status_code=403, detail="You are not the prize winner for this cycle.")

    payout = db.query(PayoutRecord).filter(PayoutRecord.cycle_id == cycle.id).first()
    if not payout:
        # Create the payout record from the winner's side
        payout = PayoutRecord(
            cycle_id=cycle.id,
            winner_slot_id=cycle.winner_slot_id,
            payout_date=datetime.now(timezone.utc),
            confirmed_by_winner=True,
        )
        db.add(payout)
    else:
        payout.confirmed_by_winner = True

    db.commit()
    return {"message": "Payout receipt confirmed by winner."}
