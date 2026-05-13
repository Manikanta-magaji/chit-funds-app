from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.jwt import require_complete_profile
from app.db.session import get_db
from app.models.models import ChitGroup, ContributorSlot, Cycle, GroupAdmin, InstallmentPayment, PaymentStatus, SubMember, User
from app.schemas.groups import SlotOut

router = APIRouter()


def _require_admin(db: Session, group_id: int, user_id: int):
    if not db.query(GroupAdmin).filter(
        GroupAdmin.group_id == group_id,
        GroupAdmin.user_id == user_id,
    ).first():
        raise HTTPException(status_code=403, detail="Admin access required.")


def _get_group_or_404(db: Session, group_id: int) -> ChitGroup:
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    return group


def _get_slot_or_404(db: Session, group_id: int, slot_id: int) -> ContributorSlot:
    slot = db.query(ContributorSlot).filter(
        ContributorSlot.id == slot_id,
        ContributorSlot.group_id == group_id,
    ).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Contributor slot not found.")
    return slot


class SlotCreateRequest(BaseModel):
    name: str
    linked_user_id: Optional[int] = None


class SubMemberInput(BaseModel):
    name: str
    linked_user_id: Optional[int] = None
    split_amount: float


class SubMembersUpdateRequest(BaseModel):
    sub_members: List[SubMemberInput]


class LinkUserRequest(BaseModel):
    user_id: int


class SubMemberLinkRequest(BaseModel):
    user_id: int


# ---------------------------------------------------------------------------
# Add contributor slot
# ---------------------------------------------------------------------------

@router.post("/{group_id}/slots", response_model=SlotOut, status_code=201)
def add_slot(
    group_id: int,
    body: SlotCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)

    existing_count = db.query(ContributorSlot).filter(ContributorSlot.group_id == group_id).count()
    if existing_count >= group.total_cycles:
        raise HTTPException(status_code=400, detail="Group is full. Cannot add more contributor slots.")

    is_offline = body.linked_user_id is None
    slot = ContributorSlot(
        group_id=group_id,
        name=body.name,
        is_offline=is_offline,
        linked_user_id=body.linked_user_id,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


# ---------------------------------------------------------------------------
# List slots with payment status for current cycle
# ---------------------------------------------------------------------------

@router.get("/{group_id}/slots", response_model=List[dict])
def list_slots(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    current_cycle = db.query(Cycle).filter(
        Cycle.group_id == group_id,
        Cycle.cycle_number == group.current_cycle,
    ).first()

    slots = db.query(ContributorSlot).filter(ContributorSlot.group_id == group_id).all()
    result = []
    for slot in slots:
        payment_status = "unpaid"
        if current_cycle:
            payments = db.query(InstallmentPayment).filter(
                InstallmentPayment.cycle_id == current_cycle.id,
                InstallmentPayment.slot_id == slot.id,
            ).all()
            sub_member_count = len(slot.sub_members)
            if sub_member_count > 1:
                # For slots with sub-members, check each sub-member individually
                paid_count = sum(
                    1 for p in payments
                    if p.sub_member_id is not None and p.status == PaymentStatus.paid
                )
                if paid_count == sub_member_count:
                    payment_status = "paid"
                elif paid_count > 0:
                    payment_status = "partial"
                else:
                    payment_status = "unpaid"
            elif payments:
                statuses = [p.status for p in payments]
                if all(s == PaymentStatus.paid for s in statuses):
                    payment_status = "paid"
                elif all(s == PaymentStatus.unpaid for s in statuses):
                    payment_status = "unpaid"
                else:
                    payment_status = "partial"

        linked_user_display_name: str | None = None
        if slot.linked_user_id and slot.linked_user:
            linked_user_display_name = slot.linked_user.display_name or slot.linked_user.email
        result.append({
            "id": slot.id,
            "name": slot.name,
            "is_offline": slot.is_offline,
            "linked_user_id": slot.linked_user_id,
            "linked_user_display_name": linked_user_display_name,
            "sub_members": [
                {
                    "id": sm.id,
                    "name": sm.name,
                    "linked_user_id": sm.linked_user_id,
                    "linked_user_display_name": (
                        sm.linked_user.display_name or sm.linked_user.email
                        if sm.linked_user_id and sm.linked_user else None
                    ),
                    "split_amount": sm.split_amount,
                }
                for sm in slot.sub_members
            ],
            "current_cycle_payment_status": payment_status,
        })
    return result


# ---------------------------------------------------------------------------
# Set sub-member split configuration
# ---------------------------------------------------------------------------

@router.put("/{group_id}/slots/{slot_id}/sub-members", response_model=SlotOut)
def set_sub_members(
    group_id: int,
    slot_id: int,
    body: SubMembersUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)
    slot = _get_slot_or_404(db, group_id, slot_id)

    total_split = sum(sm.split_amount for sm in body.sub_members)
    if abs(total_split - group.installment_amount) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"Split amounts must total {group.installment_amount}. Got {total_split}.",
        )

    # Replace existing sub_members
    for sm in slot.sub_members:
        db.delete(sm)
    db.flush()

    for sm_data in body.sub_members:
        sm = SubMember(
            slot_id=slot.id,
            name=sm_data.name,
            linked_user_id=sm_data.linked_user_id,
            split_amount=sm_data.split_amount,
        )
        db.add(sm)

    db.commit()
    db.refresh(slot)
    return slot


# ---------------------------------------------------------------------------
# Link offline slot to a registered user
# ---------------------------------------------------------------------------

@router.put("/{group_id}/slots/{slot_id}/link")
def link_slot_to_user(
    group_id: int,
    slot_id: int,
    body: LinkUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)
    slot = _get_slot_or_404(db, group_id, slot_id)

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    slot.linked_user_id = body.user_id
    slot.is_offline = False
    db.commit()
    return {"message": "Slot linked to user."}


# ---------------------------------------------------------------------------
# Remove a contributor slot
# ---------------------------------------------------------------------------

@router.delete("/{group_id}/slots/{slot_id}")
def remove_slot(
    group_id: int,
    slot_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)
    slot = _get_slot_or_404(db, group_id, slot_id)

    # Block removal after cycle 1 has any payments or a winner
    cycle1 = db.query(Cycle).filter(Cycle.group_id == group_id, Cycle.cycle_number == 1).first()
    if cycle1:
        has_payments = db.query(InstallmentPayment).filter(
            InstallmentPayment.cycle_id == cycle1.id
        ).first()
        if has_payments or cycle1.winner_slot_id:
            raise HTTPException(
                status_code=400,
                detail="Cannot remove a slot after the first cycle has started.",
            )

    db.delete(slot)
    db.commit()
    return {"message": "Slot removed."}


# ---------------------------------------------------------------------------
# Link an individual sub-member to a registered user
# ---------------------------------------------------------------------------

@router.put("/{group_id}/slots/{slot_id}/sub-members/{sub_member_id}/link")
def link_sub_member_to_user(
    group_id: int,
    slot_id: int,
    sub_member_id: int,
    body: SubMemberLinkRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)
    _get_slot_or_404(db, group_id, slot_id)

    sub_member = db.query(SubMember).filter(
        SubMember.id == sub_member_id,
        SubMember.slot_id == slot_id,
    ).first()
    if not sub_member:
        raise HTTPException(status_code=404, detail="Sub-member not found.")

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    sub_member.linked_user_id = body.user_id
    db.commit()
    return {"message": "Sub-member linked to user.", "sub_member_id": sub_member_id, "user_id": body.user_id}
