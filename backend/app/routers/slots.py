from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List, Optional
from sqlalchemy import exists

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


def _user_already_in_group(
    db: Session,
    group_id: int,
    user_id: int,
    exclude_slot_id: Optional[int] = None,
) -> bool:
    """Return True if user_id is linked to any slot (primary or sub-member) in the group,
    optionally excluding a specific slot (e.g. the one just created)."""
    slot_q = db.query(ContributorSlot).filter(
        ContributorSlot.group_id == group_id,
        ContributorSlot.linked_user_id == user_id,
    )
    if exclude_slot_id is not None:
        slot_q = slot_q.filter(ContributorSlot.id != exclude_slot_id)
    if slot_q.first():
        return True

    sm_q = (
        db.query(SubMember)
        .join(ContributorSlot, SubMember.slot_id == ContributorSlot.id)
        .filter(
            ContributorSlot.group_id == group_id,
            SubMember.linked_user_id == user_id,
        )
    )
    if exclude_slot_id is not None:
        sm_q = sm_q.filter(ContributorSlot.id != exclude_slot_id)
    return sm_q.first() is not None


class SlotCreateRequest(BaseModel):
    name: str
    linked_user_id: Optional[int] = None
    mobile_number: Optional[str] = None
    upi_id: Optional[str] = None


class SubMemberInput(BaseModel):
    name: str
    linked_user_id: Optional[int] = None
    split_amount: float
    mobile_number: Optional[str] = None
    upi_id: Optional[str] = None


class SubMembersUpdateRequest(BaseModel):
    sub_members: List[SubMemberInput]


class LinkUserRequest(BaseModel):
    user_id: int


class SubMemberLinkRequest(BaseModel):
    user_id: int


# ---------------------------------------------------------------------------
# Add contributor slot
# ---------------------------------------------------------------------------

@router.post("/{group_id}/slots", status_code=201)
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
        mobile_number=(body.mobile_number or "").strip() or None,
        upi_id=(body.upi_id or "").strip() or None,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    duplicate_user_warning = bool(body.linked_user_id) and _user_already_in_group(
        db, group_id, body.linked_user_id, exclude_slot_id=slot.id
    )
    linked_user_display_name = None
    if slot.linked_user_id and slot.linked_user:
        linked_user_display_name = slot.linked_user.display_name or slot.linked_user.email

    return {
        "id": slot.id,
        "name": slot.name,
        "is_offline": slot.is_offline,
        "linked_user_id": slot.linked_user_id,
        "linked_user_display_name": linked_user_display_name,
        "mobile_number": slot.mobile_number,
        "upi_id": slot.upi_id,
        "sub_members": [],
        "duplicate_user_warning": duplicate_user_warning,
    }


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
            "mobile_number": slot.mobile_number,
            "upi_id": slot.upi_id,
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
                    "mobile_number": sm.mobile_number,
                    "upi_id": sm.upi_id,
                }
                for sm in slot.sub_members
            ],
            "current_cycle_payment_status": payment_status,
        })
    return result


# ---------------------------------------------------------------------------
# Set sub-member split configuration
# ---------------------------------------------------------------------------

@router.put("/{group_id}/slots/{slot_id}/sub-members")
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
        is_offline_sm = sm_data.linked_user_id is None
        if is_offline_sm and not (sm_data.mobile_number or "").strip():
            raise HTTPException(
                status_code=422,
                detail=f"Mobile number is required for offline sub-member '{sm_data.name}'.",
            )
        sm = SubMember(
            slot_id=slot.id,
            name=sm_data.name,
            linked_user_id=sm_data.linked_user_id,
            split_amount=sm_data.split_amount,
            mobile_number=(sm_data.mobile_number or "").strip() or None,
            upi_id=(sm_data.upi_id or "").strip() or None,
        )
        db.add(sm)

    db.commit()
    db.refresh(slot)

    duplicate_user_warning = any(
        sm_data.linked_user_id and _user_already_in_group(
            db, group_id, sm_data.linked_user_id, exclude_slot_id=slot.id
        )
        for sm_data in body.sub_members
    )
    linked_user_display_name = None
    if slot.linked_user_id and slot.linked_user:
        linked_user_display_name = slot.linked_user.display_name or slot.linked_user.email

    return {
        "id": slot.id,
        "name": slot.name,
        "is_offline": slot.is_offline,
        "linked_user_id": slot.linked_user_id,
        "linked_user_display_name": linked_user_display_name,
        "mobile_number": slot.mobile_number,
        "upi_id": slot.upi_id,
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
                "mobile_number": sm.mobile_number,
                "upi_id": sm.upi_id,
            }
            for sm in slot.sub_members
        ],
        "duplicate_user_warning": duplicate_user_warning,
    }


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
# Update a contributor slot (name / mobile / UPI)
# ---------------------------------------------------------------------------

class SlotUpdateRequest(BaseModel):
    name: Optional[str] = None
    mobile_number: Optional[str] = None
    upi_id: Optional[str] = None


@router.patch("/{group_id}/slots/{slot_id}")
def update_slot(
    group_id: int,
    slot_id: int,
    body: SlotUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)
    slot = _get_slot_or_404(db, group_id, slot_id)

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty.")
        slot.name = name
    if body.mobile_number is not None:
        slot.mobile_number = body.mobile_number.strip() or None
    if body.upi_id is not None:
        slot.upi_id = body.upi_id.strip() or None

    db.commit()
    return {"message": "Slot updated.", "id": slot.id}


# ---------------------------------------------------------------------------
# Update an individual sub-member (name / mobile / UPI / split_amount)
# ---------------------------------------------------------------------------

class SubMemberUpdateRequest(BaseModel):
    name: Optional[str] = None
    mobile_number: Optional[str] = None
    upi_id: Optional[str] = None
    split_amount: Optional[float] = None


@router.patch("/{group_id}/slots/{slot_id}/sub-members/{sub_member_id}")
def update_sub_member(
    group_id: int,
    slot_id: int,
    sub_member_id: int,
    body: SubMemberUpdateRequest,
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

    if body.name is not None:
        name = body.name.strip()
        if not name:
            raise HTTPException(status_code=422, detail="Name cannot be empty.")
        sub_member.name = name
    if body.mobile_number is not None:
        sub_member.mobile_number = body.mobile_number.strip() or None
    if body.upi_id is not None:
        sub_member.upi_id = body.upi_id.strip() or None
    if body.split_amount is not None:
        if body.split_amount <= 0:
            raise HTTPException(status_code=422, detail="Split amount must be positive.")
        sub_member.split_amount = body.split_amount

    db.commit()
    return {"message": "Sub-member updated.", "id": sub_member.id}


# ---------------------------------------------------------------------------
# Remove an individual sub-member
# ---------------------------------------------------------------------------

@router.delete("/{group_id}/slots/{slot_id}/sub-members/{sub_member_id}")
def remove_sub_member(
    group_id: int,
    slot_id: int,
    sub_member_id: int,
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
    if sub_member.linked_user_id:
        raise HTTPException(status_code=400, detail="Cannot remove a registered sub-member.")

    db.delete(sub_member)
    db.commit()
    return {"message": "Sub-member removed."}


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
