from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.jwt import get_current_user, require_complete_profile
from app.core.mobile import normalize_mobile
from app.db.session import get_db
from app.models.models import User
from app.schemas.auth import ProfileUpdateRequest, UserOut

router = APIRouter()


@router.put("/me/profile", response_model=UserOut)
def update_profile(
    body: ProfileUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Enforce globally unique display_name
    conflict = db.query(User).filter(
        User.display_name == body.display_name,
        User.id != current_user.id,
    ).first()
    if conflict:
        raise HTTPException(
            status_code=400,
            detail="Display name is already taken. Please choose a different name.",
        )
    current_user.display_name = body.display_name
    current_user.mobile_number = normalize_mobile(body.mobile_number)
    # Infer UPI ID from mobile if not provided
    current_user.upi_id = body.upi_id if body.upi_id else f"{normalize_mobile(body.mobile_number)}@upi"
    current_user.is_profile_complete = True
    db.commit()
    db.refresh(current_user)
    return current_user


@router.get("/search", response_model=List[UserOut])
def search_users(
    q: str = Query(..., min_length=1, description="Partial display name, email, or exact mobile number to match"),
    db: Session = Depends(get_db),
    _: User = Depends(require_complete_profile),
):
    """Return users matching by partial display_name/email or exact mobile number."""
    pattern = f"%{q}%"
    # Also try matching as normalized mobile
    mobile_q = normalize_mobile(q)
    results = db.query(User).filter(
        User.display_name.ilike(pattern)
        | (User.email.isnot(None) & User.email.ilike(pattern))
        | (User.mobile_number == mobile_q)
    ).all()
    return results


@router.get("/me/payout-history")
def payout_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    """Return all cycles where the current user's linked slot won, with payout status."""
    from app.models.models import ContributorSlot, Cycle, PayoutRecord

    # Find all slots linked to this user
    slot_ids = [s.id for s in db.query(ContributorSlot).filter(
        ContributorSlot.linked_user_id == current_user.id
    ).all()]

    results = []
    if slot_ids:
        won_cycles = db.query(Cycle).filter(
            Cycle.winner_slot_id.in_(slot_ids)
        ).all()
        for cycle in won_cycles:
            payout = db.query(PayoutRecord).filter(PayoutRecord.cycle_id == cycle.id).first()
            results.append({
                "group_id": cycle.group_id,
                "cycle_number": cycle.cycle_number,
                "payout_completed": payout is not None,
                "confirmed_by_winner": payout.confirmed_by_winner if payout else False,
            })
    return results
