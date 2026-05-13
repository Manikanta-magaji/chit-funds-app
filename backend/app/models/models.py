import enum
from datetime import datetime
from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, func,
)
from sqlalchemy.orm import relationship

from app.db.base import Base


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=True)          # null for Google-only accounts
    google_id = Column(String, unique=True, nullable=True)
    display_name = Column(String, nullable=True)
    mobile = Column(String, nullable=True)
    upi_id = Column(String, nullable=True)
    is_profile_complete = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # relationships
    admin_of = relationship("GroupAdmin", back_populates="user", cascade="all, delete-orphan")
    contributor_slots = relationship("ContributorSlot", back_populates="linked_user", foreign_keys="ContributorSlot.linked_user_id")
    sub_memberships = relationship("SubMember", back_populates="linked_user", foreign_keys="SubMember.linked_user_id")


# ---------------------------------------------------------------------------
# Chit Group
# ---------------------------------------------------------------------------

class ChitGroup(Base):
    __tablename__ = "chit_groups"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    installment_amount = Column(Float, nullable=False)
    total_cycles = Column(Integer, nullable=False)
    current_cycle = Column(Integer, default=1, nullable=False)
    exclude_arrears_from_draw = Column(Boolean, default=True, nullable=False)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    # relationships
    admins = relationship("GroupAdmin", back_populates="group", cascade="all, delete-orphan")
    slots = relationship("ContributorSlot", back_populates="group", cascade="all, delete-orphan")
    cycles = relationship("Cycle", back_populates="group", cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Group Admin (join table)
# ---------------------------------------------------------------------------

class GroupAdmin(Base):
    __tablename__ = "group_admins"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("chit_groups.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)

    group = relationship("ChitGroup", back_populates="admins")
    user = relationship("User", back_populates="admin_of")


# ---------------------------------------------------------------------------
# Contributor Slot
# ---------------------------------------------------------------------------

class ContributorSlot(Base):
    __tablename__ = "contributor_slots"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("chit_groups.id"), nullable=False)
    name = Column(String, nullable=False)
    is_offline = Column(Boolean, default=False, nullable=False)
    linked_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    group = relationship("ChitGroup", back_populates="slots")
    linked_user = relationship("User", back_populates="contributor_slots", foreign_keys=[linked_user_id])
    sub_members = relationship("SubMember", back_populates="slot", cascade="all, delete-orphan")
    installment_payments = relationship("InstallmentPayment", back_populates="slot")
    won_cycles = relationship("Cycle", back_populates="winner_slot", foreign_keys="Cycle.winner_slot_id")


# ---------------------------------------------------------------------------
# Sub Member (for shared slots)
# ---------------------------------------------------------------------------

class SubMember(Base):
    __tablename__ = "sub_members"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("contributor_slots.id"), nullable=False)
    name = Column(String, nullable=False)
    linked_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    split_amount = Column(Float, nullable=False)

    slot = relationship("ContributorSlot", back_populates="sub_members")
    linked_user = relationship("User", back_populates="sub_memberships", foreign_keys=[linked_user_id])
    installment_payments = relationship("InstallmentPayment", back_populates="sub_member")


# ---------------------------------------------------------------------------
# Cycle
# ---------------------------------------------------------------------------

class Cycle(Base):
    __tablename__ = "cycles"

    id = Column(Integer, primary_key=True, index=True)
    group_id = Column(Integer, ForeignKey("chit_groups.id"), nullable=False)
    cycle_number = Column(Integer, nullable=False)
    winner_slot_id = Column(Integer, ForeignKey("contributor_slots.id"), nullable=True)
    is_closed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    group = relationship("ChitGroup", back_populates="cycles")
    winner_slot = relationship("ContributorSlot", back_populates="won_cycles", foreign_keys=[winner_slot_id])
    installment_payments = relationship("InstallmentPayment", back_populates="cycle", cascade="all, delete-orphan")
    payout_record = relationship("PayoutRecord", back_populates="cycle", uselist=False, cascade="all, delete-orphan")


# ---------------------------------------------------------------------------
# Installment Payment
# ---------------------------------------------------------------------------

class PaymentStatus(str, enum.Enum):
    unpaid = "unpaid"
    pending = "pending"
    paid = "paid"


class InstallmentPayment(Base):
    __tablename__ = "installment_payments"

    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("cycles.id"), nullable=False)
    slot_id = Column(Integer, ForeignKey("contributor_slots.id"), nullable=False)
    sub_member_id = Column(Integer, ForeignKey("sub_members.id"), nullable=True)
    status = Column(Enum(PaymentStatus), default=PaymentStatus.unpaid, nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    paid_at = Column(DateTime, nullable=True)

    cycle = relationship("Cycle", back_populates="installment_payments")
    slot = relationship("ContributorSlot", back_populates="installment_payments")
    sub_member = relationship("SubMember", back_populates="installment_payments")


# ---------------------------------------------------------------------------
# Payout Record
# ---------------------------------------------------------------------------

class PayoutRecord(Base):
    __tablename__ = "payout_records"

    id = Column(Integer, primary_key=True, index=True)
    cycle_id = Column(Integer, ForeignKey("cycles.id"), nullable=False, unique=True)
    winner_slot_id = Column(Integer, ForeignKey("contributor_slots.id"), nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    payout_date = Column(DateTime, nullable=True)
    confirmed_by_winner = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=func.now(), nullable=False)

    cycle = relationship("Cycle", back_populates="payout_record")
