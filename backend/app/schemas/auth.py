from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    display_name: Optional[str]
    mobile: Optional[str]
    upi_id: Optional[str]
    is_profile_complete: bool

    model_config = {"from_attributes": True}


class ProfileUpdateRequest(BaseModel):
    display_name: str
    mobile: str
    upi_id: Optional[str] = None
