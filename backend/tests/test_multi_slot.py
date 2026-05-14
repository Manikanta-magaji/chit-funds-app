"""
Backend tests for multi-slot membership feature.

Covers:
  6.1 Users cannot be asserted as exclusive to one slot (constraint no longer enforced)
  6.2 User linked to two slots can independently mark each as paid
  6.3 User linked as primary slot and sub-member in the same group — both visible
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.models import User, ChitGroup, GroupAdmin, ContributorSlot, SubMember, Cycle
from app.core.security import hash_password

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
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _create_user(db, email: str, display_name: str = "Test User") -> User:
    user = User(
        email=email,
        hashed_password=hash_password("password"),
        display_name=display_name,
        is_profile_complete=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _create_group(db, admin: User, name: str = "Test Fund", total_cycles: int = 5) -> ChitGroup:
    group = ChitGroup(
        name=name,
        installment_amount=1000.0,
        total_cycles=total_cycles,
        current_cycle=1,
        created_by=admin.id,
    )
    db.add(group)
    db.commit()
    db.refresh(group)
    ga = GroupAdmin(group_id=group.id, user_id=admin.id)
    db.add(ga)
    db.commit()
    return group


def _login(client, email: str) -> dict:
    resp = client.post("/api/auth/login", json={"email": email, "password": "password"})
    assert resp.status_code == 200, resp.text
    return resp.cookies


def _add_slot(client, cookies, group_id: int, name: str, linked_user_id: int | None = None) -> dict:
    body = {"name": name}
    if linked_user_id:
        body["linked_user_id"] = linked_user_id
    resp = client.post(f"/api/groups/{group_id}/slots", json=body, cookies=cookies)
    assert resp.status_code == 201, resp.text
    return resp.json()


def _create_cycle(db, group: ChitGroup) -> Cycle:
    cycle = Cycle(group_id=group.id, cycle_number=group.current_cycle, is_closed=False)
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle


# ---------------------------------------------------------------------------
# Test 6.1 — user can appear in more than one slot (no unique constraint)
# ---------------------------------------------------------------------------

def test_same_user_can_be_linked_to_two_slots(client, db):
    """Linking the same registered user to two separate slots is allowed."""
    admin = _create_user(db, "admin@test.com", "Admin")
    member = _create_user(db, "member@test.com", "Member")
    group = _create_group(db, admin)
    cookies = _login(client, "admin@test.com")

    result1 = _add_slot(client, cookies, group.id, "Slot A", member.id)
    result2 = _add_slot(client, cookies, group.id, "Slot B", member.id)

    assert result1["linked_user_id"] == member.id
    assert result2["linked_user_id"] == member.id
    assert result1["id"] != result2["id"]


def test_duplicate_user_warning_is_returned_on_second_slot(client, db):
    """Adding a user to a second slot returns duplicate_user_warning=True."""
    admin = _create_user(db, "admin@test.com", "Admin")
    member = _create_user(db, "member@test.com", "Member")
    group = _create_group(db, admin)
    cookies = _login(client, "admin@test.com")

    first = _add_slot(client, cookies, group.id, "Slot A", member.id)
    assert first["duplicate_user_warning"] is False

    second = _add_slot(client, cookies, group.id, "Slot B", member.id)
    assert second["duplicate_user_warning"] is True


def test_no_warning_for_unique_user(client, db):
    """Adding a user who is not yet in the group returns duplicate_user_warning=False."""
    admin = _create_user(db, "admin@test.com", "Admin")
    member = _create_user(db, "member@test.com", "Member")
    group = _create_group(db, admin)
    cookies = _login(client, "admin@test.com")

    result = _add_slot(client, cookies, group.id, "Slot A", member.id)
    assert result["duplicate_user_warning"] is False


# ---------------------------------------------------------------------------
# Test 6.2 — user with two slots can mark each independently
# ---------------------------------------------------------------------------

def test_user_with_two_slots_can_mark_each_paid_independently(client, db):
    """A user linked to two slots can pay them in any order; paying one doesn't affect the other."""
    admin = _create_user(db, "admin@test.com", "Admin")
    member = _create_user(db, "member@test.com", "Member")
    group = _create_group(db, admin)
    cycle = _create_cycle(db, group)

    # Simulate a winner so Mark Paid is unblocked
    cycle.winner_slot_id = None  # will be set after slot creation
    db.commit()

    cookies = _login(client, "admin@test.com")
    slot1 = _add_slot(client, cookies, group.id, "Slot A", member.id)
    slot2 = _add_slot(client, cookies, group.id, "Slot B", member.id)

    # Set a winner to unblock Mark Paid
    cycle.winner_slot_id = slot1["id"]
    db.commit()

    # Mark slot1 as paid
    resp = client.put(
        f"/api/groups/{group.id}/cycles/{group.current_cycle}/installments/{slot1['id']}",
        json={"action": "pay"},
        cookies=cookies,
    )
    assert resp.status_code == 200, resp.text

    # slot2 should still be unpaid
    installments_resp = client.get(
        f"/api/groups/{group.id}/cycles/{group.current_cycle}/installments",
        cookies=cookies,
    )
    assert installments_resp.status_code == 200
    installments = installments_resp.json()
    slot1_status = next(i for i in installments if i["slot_id"] == slot1["id"])
    slot2_status = next(i for i in installments if i["slot_id"] == slot2["id"])
    assert slot1_status["status"] == "paid"
    assert slot2_status["status"] == "unpaid"


# ---------------------------------------------------------------------------
# Test 6.3 — user as primary slot and sub-member in the same group
# ---------------------------------------------------------------------------

def test_user_as_primary_slot_and_submember_both_visible(client, db):
    """A user linked to a primary slot and also as sub-member of another slot appears in both."""
    admin = _create_user(db, "admin@test.com", "Admin")
    member = _create_user(db, "member@test.com", "Member")
    other = _create_user(db, "other@test.com", "Other")
    group = _create_group(db, admin, total_cycles=5)
    cookies = _login(client, "admin@test.com")

    # member as a primary slot
    _add_slot(client, cookies, group.id, "Primary Slot", member.id)

    # member as sub-member of a shared slot
    shared_slot_resp = _add_slot(client, cookies, group.id, "Shared Slot")  # offline
    shared_slot_id = shared_slot_resp["id"]
    resp = client.put(
        f"/api/groups/{group.id}/slots/{shared_slot_id}/sub-members",
        json={
            "sub_members": [
                {"name": member.display_name, "linked_user_id": member.id, "split_amount": 500.0},
                {"name": other.display_name, "linked_user_id": other.id, "split_amount": 500.0},
            ]
        },
        cookies=cookies,
    )
    assert resp.status_code == 200, resp.text

    # Fetch slots and verify member appears in both
    slots_resp = client.get(f"/api/groups/{group.id}/slots", cookies=cookies)
    assert slots_resp.status_code == 200
    slots = slots_resp.json()

    primary = next((s for s in slots if s["name"] == "Primary Slot"), None)
    shared = next((s for s in slots if s["name"] == "Shared Slot"), None)

    assert primary is not None
    assert primary["linked_user_id"] == member.id

    assert shared is not None
    member_sm = next((sm for sm in shared["sub_members"] if sm["linked_user_id"] == member.id), None)
    assert member_sm is not None, "Member should appear as sub-member of the shared slot"


def test_set_sub_members_warns_when_user_already_in_another_slot(client, db):
    """set_sub_members returns duplicate_user_warning=True when a sub-member is already a primary slot holder."""
    admin = _create_user(db, "admin@test.com", "Admin")
    member = _create_user(db, "member@test.com", "Member")
    other = _create_user(db, "other@test.com", "Other")
    group = _create_group(db, admin, total_cycles=5)
    cookies = _login(client, "admin@test.com")

    # member already holds a primary slot
    _add_slot(client, cookies, group.id, "Primary Slot", member.id)

    # add a shared slot and assign member as sub-member
    shared = _add_slot(client, cookies, group.id, "Shared Slot")
    resp = client.put(
        f"/api/groups/{group.id}/slots/{shared['id']}/sub-members",
        json={
            "sub_members": [
                {"name": "Member", "linked_user_id": member.id, "split_amount": 500.0},
                {"name": "Other", "linked_user_id": other.id, "split_amount": 500.0},
            ]
        },
        cookies=cookies,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["duplicate_user_warning"] is True
