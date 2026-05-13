from datetime import datetime
from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.schemas.auth import UserOut


class GroupCreateRequest(BaseModel):
    name: str
    installment_amount: float
    total_cycles: int
    exclude_arrears_from_draw: bool = True

    @field_validator("installment_amount")
    @classmethod
    def positive_amount(cls, v):
        if v <= 0:
            raise ValueError("Installment amount must be positive.")
        return v

    @field_validator("total_cycles")
    @classmethod
    def positive_cycles(cls, v):
        if v <= 0:
            raise ValueError("Total cycles must be at least 1.")
        return v


class AdminIn(BaseModel):
    user_id: int


class SubMemberOut(BaseModel):
    id: int
    name: str
    linked_user_id: Optional[int]
    linked_user_display_name: Optional[str] = None
    split_amount: float

    model_config = {"from_attributes": True}


class SlotOut(BaseModel):
    id: int
    name: str
    is_offline: bool
    linked_user_id: Optional[int]
    linked_user_display_name: Optional[str] = None
    sub_members: List[SubMemberOut] = []

    model_config = {"from_attributes": True}


class CycleOut(BaseModel):
    id: int
    cycle_number: int
    winner_slot_id: Optional[int]
    is_closed: bool

    model_config = {"from_attributes": True}


class GroupOut(BaseModel):
    id: int
    name: str
    installment_amount: float
    total_cycles: int
    current_cycle: int
    exclude_arrears_from_draw: bool
    created_by: int
    created_at: datetime
    admin_ids: List[int] = []
    slots: List[SlotOut] = []

    model_config = {"from_attributes": True}


class GroupSummary(BaseModel):
    id: int
    name: str
    installment_amount: float
    total_cycles: int
    current_cycle: int
    is_admin: bool

    model_config = {"from_attributes": True}
