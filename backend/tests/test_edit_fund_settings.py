"""
Backend tests for the edit-fund-settings feature.

Covers:
  4.1 PATCH updates name successfully
  4.2 PATCH updates financial fields before any winner — succeeds
  4.3 PATCH rejects financial field changes after a winner is set (HTTP 409)
  4.4 PATCH rejects total_cycles below current slot count
  4.5 grant admin succeeds for a non-contributor registered user
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.db.base import Base
from app.db.session import get_db
from app.models.models import User, ChitGroup, GroupAdmin, ContributorSlot, Cycle
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


def _add_slot(db, group: ChitGroup, name: str, linked_user_id: int | None = None) -> ContributorSlot:
    slot = ContributorSlot(group_id=group.id, name=name, linked_user_id=linked_user_id)
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot


def _declare_winner(db, group: ChitGroup, slot: ContributorSlot) -> Cycle:
    cycle = Cycle(
        group_id=group.id,
        cycle_number=group.current_cycle,
        is_closed=True,
        winner_slot_id=slot.id,
    )
    db.add(cycle)
    db.commit()
    db.refresh(cycle)
    return cycle


def _login(client, email: str) -> dict:
    resp = client.post("/api/auth/login", json={"identifier": email, "password": "password"})
    assert resp.status_code == 200, resp.text
    return resp.cookies


# ---------------------------------------------------------------------------
# Test 4.1 — PATCH updates name
# ---------------------------------------------------------------------------

def test_patch_updates_name(client, db):
    """Admin can rename the fund."""
    admin = _create_user(db, "admin@test.com", "Admin")
    group = _create_group(db, admin, name="Old Name")
    cookies = _login(client, "admin@test.com")

    resp = client.patch(f"/api/groups/{group.id}", json={"name": "New Name"}, cookies=cookies)
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "New Name"


# ---------------------------------------------------------------------------
# Test 4.2 — PATCH updates financial fields before any winner
# ---------------------------------------------------------------------------

def test_patch_financial_fields_before_winner(client, db):
    """Admin can change installment_amount and total_cycles when no winner yet."""
    admin = _create_user(db, "admin@test.com", "Admin")
    group = _create_group(db, admin, total_cycles=6)
    cookies = _login(client, "admin@test.com")

    resp = client.patch(
        f"/api/groups/{group.id}",
        json={"installment_amount": 2000.0, "total_cycles": 8},
        cookies=cookies,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["installment_amount"] == 2000.0
    assert data["total_cycles"] == 8


# ---------------------------------------------------------------------------
# Test 4.3 — PATCH rejects financial changes after winner declared
# ---------------------------------------------------------------------------

def test_patch_financial_fields_after_winner_rejected(client, db):
    """Financial fields locked after first draw — endpoint returns HTTP 409."""
    admin = _create_user(db, "admin@test.com", "Admin")
    group = _create_group(db, admin, total_cycles=5)
    slot = _add_slot(db, group, "Alice")
    _declare_winner(db, group, slot)
    cookies = _login(client, "admin@test.com")

    resp = client.patch(
        f"/api/groups/{group.id}",
        json={"installment_amount": 3000.0},
        cookies=cookies,
    )
    assert resp.status_code == 409, resp.text


def test_patch_name_after_winner_still_allowed(client, db):
    """Name change is allowed even after a winner has been declared."""
    admin = _create_user(db, "admin@test.com", "Admin")
    group = _create_group(db, admin, total_cycles=5)
    slot = _add_slot(db, group, "Alice")
    _declare_winner(db, group, slot)
    cookies = _login(client, "admin@test.com")

    resp = client.patch(f"/api/groups/{group.id}", json={"name": "Renamed"}, cookies=cookies)
    assert resp.status_code == 200, resp.text
    assert resp.json()["name"] == "Renamed"


# ---------------------------------------------------------------------------
# Test 4.4 — PATCH rejects total_cycles below slot count
# ---------------------------------------------------------------------------

def test_patch_total_cycles_below_slot_count_rejected(client, db):
    """Setting total_cycles to fewer than existing contributor slots is rejected (HTTP 400)."""
    admin = _create_user(db, "admin@test.com", "Admin")
    group = _create_group(db, admin, total_cycles=5)
    _add_slot(db, group, "Alice")
    _add_slot(db, group, "Bob")
    _add_slot(db, group, "Carol")  # 3 slots
    cookies = _login(client, "admin@test.com")

    resp = client.patch(f"/api/groups/{group.id}", json={"total_cycles": 2}, cookies=cookies)
    assert resp.status_code == 400, resp.text


# ---------------------------------------------------------------------------
# Test 4.5 — grant admin to non-contributor user
# ---------------------------------------------------------------------------

def test_grant_admin_to_non_contributor(client, db):
    """An admin can grant admin rights to any registered user, not just contributors."""
    admin = _create_user(db, "admin@test.com", "Admin")
    outsider = _create_user(db, "outsider@test.com", "Outsider")
    group = _create_group(db, admin)
    cookies = _login(client, "admin@test.com")

    resp = client.post(
        f"/api/groups/{group.id}/admins",
        json={"user_id": outsider.id},
        cookies=cookies,
    )
    assert resp.status_code == 201, resp.text

    group_resp = client.get(f"/api/groups/{group.id}", cookies=cookies)
    assert group_resp.status_code == 200
    assert outsider.id in group_resp.json()["admin_ids"]
