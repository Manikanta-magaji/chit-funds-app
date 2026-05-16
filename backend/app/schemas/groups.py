from datetime import date, datetime
from pydantic import BaseModel, field_validator
from typing import Optional, List
from app.schemas.auth import UserOut


class GroupCreateRequest(BaseModel):
    name: str
    installment_amount: float
    total_cycles: int
    exclude_arrears_from_draw: bool = True
    start_date: Optional[date] = None  # optional fund start month (day is ignored)

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


class GroupUpdateRequest(BaseModel):
    name: Optional[str] = None
    installment_amount: Optional[float] = None
    total_cycles: Optional[int] = None
    start_date: Optional[date] = None


class AdminIn(BaseModel):
    user_id: int


class SubMemberOut(BaseModel):
    id: int
    name: str
    linked_user_id: Optional[int]
    linked_user_display_name: Optional[str] = None
    split_amount: float
    mobile_number: Optional[str] = None
    upi_id: Optional[str] = None

    model_config = {"from_attributes": True}


class SlotOut(BaseModel):
    id: int
    name: str
    is_offline: bool
    linked_user_id: Optional[int]
    linked_user_display_name: Optional[str] = None
    mobile_number: Optional[str] = None
    upi_id: Optional[str] = None
    sub_members: List[SubMemberOut] = []

    model_config = {"from_attributes": True}


class CycleOut(BaseModel):
    id: int
    cycle_number: int
    winner_slot_id: Optional[int]
    is_closed: bool

    model_config = {"from_attributes": True}


class AdminUserOut(BaseModel):
    id: int
    display_name: Optional[str]

    model_config = {"from_attributes": True}


class GroupOut(BaseModel):
    id: int
    name: str
    installment_amount: float
    total_cycles: int
    current_cycle: int
    exclude_arrears_from_draw: bool
    start_date: Optional[date] = None
    created_by: int
    created_at: datetime
    admin_ids: List[int] = []
    admin_users: List[AdminUserOut] = []
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
