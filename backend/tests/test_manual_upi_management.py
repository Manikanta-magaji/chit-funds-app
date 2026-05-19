"""
Backend tests for the manual-upi-management feature.

Covers:
  8.1 update_profile without UPI → profile marked complete, upi_id is None
  8.2 _resolve_upi() with linked user having no UPI and slot having mobile → returns None
  8.3 admin edits UPI for linked contributor slot → User.upi_id updated, slot.upi_id unchanged
  8.4 admin edits UPI for offline contributor slot → slot.upi_id updated, no User affected
  8.5 admin edits UPI for linked sub-member → User.upi_id updated
  8.6 admin edits UPI for offline sub-member → sub_member.upi_id updated

  UPI inheritance on registration / profile setup:
  R.1 user registers with mobile matching an admin-set UPI on offline slot → user.upi_id inherits slot UPI
  R.2 user completes profile without UPI, mobile matches offline slot with UPI → user.upi_id inherits slot UPI
  R.3 user completes profile WITH an explicit UPI → explicit UPI wins, slot UPI not copied
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.models import User, ChitGroup, GroupAdmin, ContributorSlot, SubMember
from app.core.security import hash_password
from app.routers.draw import _resolve_upi

# ---------------------------------------------------------------------------
# In-memory SQLite test database
# ---------------------------------------------------------------------------

SQLALCHEMY_TEST_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_TEST_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


def _create_admin_user(db, email="admin@test.com", password="password123"):
    user = User(
        email=email,
        hashed_password=hash_password(password),
        display_name="Admin User",
        mobile_number="9876543210",
        is_profile_complete=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client, email="admin@test.com", password="password123"):
    resp = client.post("/api/auth/login", json={"identifier": email, "password": password})
    assert resp.status_code == 200
    return resp


def _create_group_with_admin(db, admin_user: User):
    group = ChitGroup(
        name="Test Group",
        installment_amount=1000,
        total_cycles=5,
        current_cycle=1,
        created_by=admin_user.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    ga = GroupAdmin(group_id=group.id, user_id=admin_user.id)
    db.add(ga)
    db.commit()
    return group


# ---------------------------------------------------------------------------
# 8.1 update_profile without UPI → profile marked complete, upi_id is None
# ---------------------------------------------------------------------------

def test_update_profile_without_upi_leaves_upi_null(client, db):
    """Submitting profile update without a UPI ID should result in upi_id = None."""
    user = User(
        email="newuser@test.com",
        hashed_password=hash_password("password123"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    _login(client, "newuser@test.com")
    resp = client.put(
        "/api/users/me/profile",
        json={"display_name": "New User", "mobile_number": "9123456789"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["upi_id"] is None
    assert data["is_profile_complete"] is True


def test_update_profile_with_upi_stores_upi(client, db):
    """Submitting profile update with an explicit UPI ID should store it."""
    user = User(
        email="upiuser@test.com",
        hashed_password=hash_password("password123"),
    )
    db.add(user)
    db.commit()

    _login(client, "upiuser@test.com")
    resp = client.put(
        "/api/users/me/profile",
        json={"display_name": "UPI User", "mobile_number": "9123456789", "upi_id": "user@bank"},
    )
    assert resp.status_code == 200
    assert resp.json()["upi_id"] == "user@bank"


# ---------------------------------------------------------------------------
# 8.2 _resolve_upi() with linked user no UPI and slot with mobile → returns None
# ---------------------------------------------------------------------------

def test_resolve_upi_no_derivation_from_mobile():
    """_resolve_upi should return None when user has no UPI even if mobile is available.
    Mobile-based derivation (mobile@upi) was removed."""

    class FakeUser:
        upi_id = None

    result = _resolve_upi(linked_user=FakeUser(), explicit_upi=None, mobile="9876543210")
    assert result is None


def test_resolve_upi_returns_linked_user_upi():
    """_resolve_upi should return the linked user's upi_id when set."""

    class FakeUser:
        upi_id = "winner@bank"

    result = _resolve_upi(linked_user=FakeUser(), explicit_upi=None, mobile="9876543210")
    assert result == "winner@bank"


def test_resolve_upi_returns_explicit_upi_when_no_linked_user():
    """_resolve_upi should fall back to explicit_upi for offline entries."""
    result = _resolve_upi(linked_user=None, explicit_upi="offline@pay", mobile="9876543210")
    assert result == "offline@pay"


def test_resolve_upi_returns_none_when_no_upi_at_all():
    """_resolve_upi returns None when neither linked user nor explicit UPI is available."""
    result = _resolve_upi(linked_user=None, explicit_upi=None, mobile="9876543210")
    assert result is None


# ---------------------------------------------------------------------------
# 8.3 Admin edits UPI for linked contributor slot → User.upi_id updated
# ---------------------------------------------------------------------------

def test_admin_edit_upi_for_linked_slot_updates_user(client, db):
    """When admin PATCHes a linked slot's UPI, the linked User.upi_id should be updated."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    linked_user = User(
        email="member@test.com",
        hashed_password=hash_password("password123"),
        display_name="Member",
        mobile_number="9000000001",
        is_profile_complete=True,
        upi_id=None,
    )
    db.add(linked_user)
    db.commit()
    db.refresh(linked_user)

    slot = ContributorSlot(
        group_id=group.id,
        name="Member",
        linked_user_id=linked_user.id,
        upi_id=None,
        mobile_number="9000000001",
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    _login(client)
    resp = client.patch(
        f"/api/groups/{group.id}/slots/{slot.id}",
        json={"upi_id": "member@bank"},
    )
    assert resp.status_code == 200

    db.refresh(linked_user)
    db.refresh(slot)
    assert linked_user.upi_id == "member@bank"
    # slot.upi_id should NOT be updated for linked slots
    assert slot.upi_id is None


# ---------------------------------------------------------------------------
# 8.4 Admin edits UPI for offline contributor slot → slot.upi_id updated
# ---------------------------------------------------------------------------

def test_admin_edit_upi_for_offline_slot_updates_slot(client, db):
    """When admin PATCHes an offline slot's UPI, only ContributorSlot.upi_id is updated."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    slot = ContributorSlot(
        group_id=group.id,
        name="Offline Member",
        linked_user_id=None,
        upi_id=None,
        mobile_number="9000000002",
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    _login(client)
    resp = client.patch(
        f"/api/groups/{group.id}/slots/{slot.id}",
        json={"upi_id": "offline@pay"},
    )
    assert resp.status_code == 200

    db.refresh(slot)
    assert slot.upi_id == "offline@pay"


# ---------------------------------------------------------------------------
# 8.5 Admin edits UPI for linked sub-member → User.upi_id updated
# ---------------------------------------------------------------------------

def test_admin_edit_upi_for_linked_sub_member_updates_user(client, db):
    """When admin PATCHes a linked sub-member's UPI, the linked User.upi_id is updated."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    linked_user = User(
        email="submember@test.com",
        hashed_password=hash_password("password123"),
        display_name="Sub Member",
        mobile_number="9000000003",
        is_profile_complete=True,
        upi_id=None,
    )
    db.add(linked_user)
    db.commit()
    db.refresh(linked_user)

    slot = ContributorSlot(
        group_id=group.id,
        name="Shared Slot",
        linked_user_id=None,
        upi_id=None,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    sub = SubMember(
        slot_id=slot.id,
        name="Sub Member",
        linked_user_id=linked_user.id,
        upi_id=None,
        split_amount=1000,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    _login(client)
    resp = client.patch(
        f"/api/groups/{group.id}/slots/{slot.id}/sub-members/{sub.id}",
        json={"upi_id": "submember@bank"},
    )
    assert resp.status_code == 200

    db.refresh(linked_user)
    db.refresh(sub)
    assert linked_user.upi_id == "submember@bank"
    assert sub.upi_id is None  # not written directly for linked sub-members


# ---------------------------------------------------------------------------
# 8.6 Admin edits UPI for offline sub-member → sub_member.upi_id updated
# ---------------------------------------------------------------------------

def test_admin_edit_upi_for_offline_sub_member_updates_sub_member(client, db):
    """When admin PATCHes an offline sub-member's UPI, SubMember.upi_id is updated."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    slot = ContributorSlot(
        group_id=group.id,
        name="Shared Slot",
        linked_user_id=None,
        upi_id=None,
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)

    sub = SubMember(
        slot_id=slot.id,
        name="Offline Sub",
        linked_user_id=None,
        upi_id=None,
        split_amount=1000,
    )
    db.add(sub)
    db.commit()
    db.refresh(sub)

    _login(client)
    resp = client.patch(
        f"/api/groups/{group.id}/slots/{slot.id}/sub-members/{sub.id}",
        json={"upi_id": "offlinesub@pay"},
    )
    assert resp.status_code == 200

    db.refresh(sub)
    assert sub.upi_id == "offlinesub@pay"


# ---------------------------------------------------------------------------
# R.1 User registers with mobile matching admin-set offline slot → inherits UPI
# ---------------------------------------------------------------------------

def test_register_inherits_upi_from_offline_slot(client, db):
    """When a user registers with a mobile matching an offline slot that has a UPI set by admin,
    the user's upi_id should be automatically populated from the slot."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    slot = ContributorSlot(
        group_id=group.id,
        name="Offline Member",
        linked_user_id=None,
        is_offline=True,
        mobile_number="9111111111",
        upi_id="adminset@bank",
    )
    db.add(slot)
    db.commit()

    resp = client.post("/api/auth/register", json={
        "display_name": "New Member",
        "mobile_number": "9111111111",
        "password": "password123",
    })
    assert resp.status_code == 201
    assert resp.json()["upi_id"] == "adminset@bank"


# ---------------------------------------------------------------------------
# R.2 User completes profile without UPI, mobile matches slot → inherits UPI
# ---------------------------------------------------------------------------

def test_profile_setup_without_upi_inherits_from_slot(client, db):
    """When a user completes profile setup without a UPI, and their mobile matches an offline slot
    with an admin-set UPI, the user's upi_id should be populated from the slot."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    slot = ContributorSlot(
        group_id=group.id,
        name="Offline Member",
        linked_user_id=None,
        is_offline=True,
        mobile_number="9222222222",
        upi_id="adminset2@bank",
    )
    db.add(slot)
    db.commit()

    # Create a user without mobile yet (like Google-auth user)
    user = User(
        email="gmailuser@test.com",
        hashed_password=hash_password("password123"),
    )
    db.add(user)
    db.commit()

    _login(client, "gmailuser@test.com")
    resp = client.put("/api/users/me/profile", json={
        "display_name": "Gmail User",
        "mobile_number": "9222222222",
        # no upi_id submitted
    })
    assert resp.status_code == 200
    assert resp.json()["upi_id"] == "adminset2@bank"


# ---------------------------------------------------------------------------
# R.3 User provides explicit UPI during profile setup → explicit UPI wins
# ---------------------------------------------------------------------------

def test_profile_setup_explicit_upi_wins_over_slot(client, db):
    """When a user provides an explicit UPI during profile setup, it takes precedence
    over any admin-set UPI on the linked slot."""
    admin = _create_admin_user(db)
    group = _create_group_with_admin(db, admin)

    slot = ContributorSlot(
        group_id=group.id,
        name="Offline Member",
        linked_user_id=None,
        is_offline=True,
        mobile_number="9333333333",
        upi_id="adminset3@bank",
    )
    db.add(slot)
    db.commit()

    user = User(
        email="explicit@test.com",
        hashed_password=hash_password("password123"),
    )
    db.add(user)
    db.commit()

    _login(client, "explicit@test.com")
    resp = client.put("/api/users/me/profile", json={
        "display_name": "Explicit User",
        "mobile_number": "9333333333",
        "upi_id": "myown@upi",
    })
    assert resp.status_code == 200
    assert resp.json()["upi_id"] == "myown@upi"
