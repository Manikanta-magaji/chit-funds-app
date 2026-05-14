from pydantic import BaseModel, EmailStr
from typing import Optional


class RegisterRequest(BaseModel):
    mobile_number: str
    display_name: str
    password: str
    email: Optional[EmailStr] = None


class LoginRequest(BaseModel):
    identifier: str   # mobile number or email
    password: str


class UserOut(BaseModel):
    id: int
    email: Optional[str]
    display_name: Optional[str]
    mobile_number: Optional[str]
    upi_id: Optional[str]
    is_profile_complete: bool

    model_config = {"from_attributes": True}


class ProfileUpdateRequest(BaseModel):
    display_name: str
    mobile_number: str
    upi_id: Optional[str] = None
