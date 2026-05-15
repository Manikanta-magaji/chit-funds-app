from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.core.jwt import require_complete_profile
from app.db.session import get_db
from app.models.models import ChitGroup, ContributorSlot, Cycle, GroupAdmin, SubMember, User
from app.schemas.groups import AdminIn, GroupCreateRequest, GroupOut, GroupSummary, GroupUpdateRequest

router = APIRouter()


def _is_admin(db: Session, group_id: int, user_id: int) -> bool:
    return db.query(GroupAdmin).filter(
        GroupAdmin.group_id == group_id,
        GroupAdmin.user_id == user_id,
    ).first() is not None


def _get_group_or_404(db: Session, group_id: int) -> ChitGroup:
    group = db.query(ChitGroup).filter(ChitGroup.id == group_id).first()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found.")
    return group


def _require_admin(db: Session, group_id: int, user_id: int):
    if not _is_admin(db, group_id, user_id):
        raise HTTPException(status_code=403, detail="Admin access required.")


# ---------------------------------------------------------------------------
# Create group
# ---------------------------------------------------------------------------

@router.post("", response_model=GroupOut, status_code=201)
def create_group(
    body: GroupCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = ChitGroup(
        name=body.name,
        installment_amount=body.installment_amount,
        total_cycles=body.total_cycles,
        exclude_arrears_from_draw=body.exclude_arrears_from_draw,
        created_by=current_user.id,
    )
    db.add(group)
    db.flush()  # get group.id before commit

    # Auto-assign creator as admin
    admin = GroupAdmin(group_id=group.id, user_id=current_user.id)
    db.add(admin)

    # Create Cycle 1
    cycle = Cycle(group_id=group.id, cycle_number=1)
    db.add(cycle)

    db.commit()
    db.refresh(group)
    return _group_to_out(group)


# ---------------------------------------------------------------------------
# List groups
# ---------------------------------------------------------------------------

@router.get("", response_model=List[GroupSummary])
def list_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    # Groups where user is admin
    admin_group_ids = {
        a.group_id for a in db.query(GroupAdmin).filter(GroupAdmin.user_id == current_user.id).all()
    }
    # Groups where user is a linked contributor slot
    slot_group_ids = {
        s.group_id for s in db.query(ContributorSlot).filter(
            ContributorSlot.linked_user_id == current_user.id
        ).all()
    }
    # Groups where user is a linked sub-member
    sub_slot_ids = [
        sm.slot_id for sm in db.query(SubMember).filter(SubMember.linked_user_id == current_user.id).all()
    ]
    sub_member_group_ids = {
        s.group_id for s in db.query(ContributorSlot).filter(
            ContributorSlot.id.in_(sub_slot_ids)
        ).all()
    } if sub_slot_ids else set()
    all_ids = admin_group_ids | slot_group_ids | sub_member_group_ids
    groups = db.query(ChitGroup).filter(ChitGroup.id.in_(all_ids)).all()
    return [
        GroupSummary(
            id=g.id,
            name=g.name,
            installment_amount=g.installment_amount,
            total_cycles=g.total_cycles,
            current_cycle=g.current_cycle,
            is_admin=g.id in admin_group_ids,
        )
        for g in groups
    ]


# ---------------------------------------------------------------------------
# Get group details
# ---------------------------------------------------------------------------

@router.get("/{group_id}", response_model=GroupOut)
def get_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _assert_member(db, group, current_user.id)
    return _group_to_out(group)


# ---------------------------------------------------------------------------
# Update group settings
# ---------------------------------------------------------------------------

@router.patch("/{group_id}", response_model=GroupOut)
def update_group(
    group_id: int,
    body: GroupUpdateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)

    financial_change = body.installment_amount is not None or body.total_cycles is not None
    if financial_change:
        has_winner = db.query(Cycle).filter(
            Cycle.group_id == group_id,
            Cycle.winner_slot_id.isnot(None),
        ).first()
        if has_winner:
            raise HTTPException(
                status_code=409,
                detail="Installment amount and cycle count cannot be changed after the first winner has been declared.",
            )

    if body.total_cycles is not None:
        slot_count = db.query(ContributorSlot).filter(ContributorSlot.group_id == group_id).count()
        if body.total_cycles < slot_count:
            raise HTTPException(
                status_code=400,
                detail=f"Total cycles cannot be less than the current number of contributor slots ({slot_count}).",
            )

    if body.name is not None:
        group.name = body.name
    if body.installment_amount is not None:
        group.installment_amount = body.installment_amount
    if body.total_cycles is not None:
        group.total_cycles = body.total_cycles

    db.commit()
    db.refresh(group)
    return _group_to_out(group)


# ---------------------------------------------------------------------------
# Grant admin
# ---------------------------------------------------------------------------

@router.post("/{group_id}/admins", status_code=201)
def grant_admin(
    group_id: int,
    body: AdminIn,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)

    user = db.query(User).filter(User.id == body.user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    existing = db.query(GroupAdmin).filter(
        GroupAdmin.group_id == group_id, GroupAdmin.user_id == body.user_id
    ).first()
    if existing:
        return {"message": "User is already an admin."}

    db.add(GroupAdmin(group_id=group_id, user_id=body.user_id))
    db.commit()
    return {"message": "Admin granted."}


# ---------------------------------------------------------------------------
# Revoke admin
# ---------------------------------------------------------------------------

@router.delete("/{group_id}/admins/{user_id}")
def revoke_admin(
    group_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)

    admins = db.query(GroupAdmin).filter(GroupAdmin.group_id == group_id).all()
    if len(admins) <= 1:
        raise HTTPException(status_code=400, detail="Cannot remove the last admin.")

    target = db.query(GroupAdmin).filter(
        GroupAdmin.group_id == group_id, GroupAdmin.user_id == user_id
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Admin record not found.")

    db.delete(target)
    db.commit()
    return {"message": "Admin revoked."}


# ---------------------------------------------------------------------------
# Delete group
# ---------------------------------------------------------------------------

@router.delete("/{group_id}", status_code=204)
def delete_group(
    group_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_complete_profile),
):
    group = _get_group_or_404(db, group_id)
    _require_admin(db, group_id, current_user.id)
    db.delete(group)
    db.commit()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _assert_member(db: Session, group: ChitGroup, user_id: int):
    is_admin = _is_admin(db, group.id, user_id)
    is_contributor = db.query(ContributorSlot).filter(
        ContributorSlot.group_id == group.id,
        ContributorSlot.linked_user_id == user_id,
    ).first() is not None
    is_sub_member = False
    if not is_contributor:
        slot_ids = [
            s.id for s in db.query(ContributorSlot).filter(ContributorSlot.group_id == group.id).all()
        ]
        if slot_ids:
            is_sub_member = db.query(SubMember).filter(
                SubMember.slot_id.in_(slot_ids),
                SubMember.linked_user_id == user_id,
            ).first() is not None
    if not is_admin and not is_contributor and not is_sub_member:
        raise HTTPException(status_code=403, detail="Not a member of this group.")


def _group_to_out(group: ChitGroup) -> GroupOut:
    return GroupOut(
        id=group.id,
        name=group.name,
        installment_amount=group.installment_amount,
        total_cycles=group.total_cycles,
        current_cycle=group.current_cycle,
        exclude_arrears_from_draw=group.exclude_arrears_from_draw,
        created_by=group.created_by,
        created_at=group.created_at,
        admin_ids=[a.user_id for a in group.admins],
        admin_users=[
            {"id": a.user_id, "display_name": a.user.display_name or a.user.email}
            for a in group.admins
        ],
        slots=[
            {
                "id": s.id,
                "name": s.name,
                "is_offline": s.is_offline,
                "linked_user_id": s.linked_user_id,
                "sub_members": [
                    {
                        "id": sm.id,
                        "name": sm.name,
                        "linked_user_id": sm.linked_user_id,
                        "split_amount": sm.split_amount,
                    }
                    for sm in s.sub_members
                ],
            }
            for s in group.slots
        ],
    )
