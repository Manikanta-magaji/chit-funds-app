## Context

Currently the chit fund application enforces an implicit one-user-per-group constraint: a registered user can be linked to at most one contributor slot (as primary or sub-member) within a single group. The data model for `Contributor` and `SubMember` records likely carries a unique index or application-level guard on `(group_id, user_id)`.

In real-world chit funds it is common for a participant to take two slots (paying double) or to be a slot holder and also co-share another slot. The system must support this without losing per-slot payment granularity.

## Goals / Non-Goals

**Goals:**
- Allow a user to be linked to multiple contributor positions (primary slots and/or sub-member entries) within the same group.
- Show the user an aggregated installment total (sum of all their positions) alongside per-slot Mark Paid actions in the group dashboard.
- Maintain existing per-slot payment tracking — no new payment model needed.
- A user holding N slots is eligible to be drawn N times (once per slot they hold), giving proportional draw chances.

**Non-Goals:**
- Automatic payment splitting or combined payment workflows (each slot is still paid independently).
- Bulk Mark Paid across all of a user's slots in one click (future enhancement).

## Decisions

### Decision 1: Relax uniqueness at the DB layer, not just application layer
Remove (or replace) the unique constraint on `(group_id, user_id)` in the `Contributor` table and the equivalent on `SubMember`. Replace with an application-level check only where a business rule genuinely requires uniqueness (none currently does for multi-slot).

**Alternative considered**: Keep DB constraint, use a junction table linking a "membership" record to multiple slots. Rejected — over-engineered for the current scale and breaks backward compatibility with existing queries.

### Decision 2: Aggregate installment total computed on the frontend
The `/groups/{id}/installments` API already returns all slots with payment status. The frontend will sum amounts for slots where `linked_user_id == currentUser.id` to derive the aggregate total. No new API endpoint is needed.

**Alternative considered**: Add a dedicated `/me/groups/{id}/summary` endpoint. Rejected — unnecessary round-trip; all data is already available in the existing response.

### Decision 3: Per-slot Mark Paid — no UX change needed
Since Mark Paid is already per-slot (not per-user), the frontend only needs to display all slots belonging to the current user and let them act on each independently. A summary row showing the combined amount is added above the individual rows.

## Risks / Trade-offs

- [Risk] Admin may accidentally add the same user twice, creating unintended double billing. → Mitigation: The UI warns when assigning a user who is already linked to another slot in the same group, requiring explicit acknowledgement before saving.
- [Risk] Aggregate total display may confuse users unfamiliar with multi-slot membership. → Mitigation: Clear labeling ("You have 2 slots in this group — total due: ₹X") with expandable breakdown.
- [Risk] Existing integration tests that assert a user cannot appear twice in a group will break. → Mitigation: Update tests alongside the constraint removal.

## Migration Plan

1. Write an Alembic migration that drops the unique constraint on `contributor.user_id + group_id` (and equivalent on `sub_member`).
2. Deploy backend — no data migration needed (existing data already satisfies the relaxed constraint).
3. Deploy frontend — aggregate total row is additive; existing single-slot users see no change.
4. Rollback: re-add the unique constraint; ensure no existing rows would violate it first.

## Open Questions

- None outstanding. Draw eligibility is confirmed as per-slot: a user holding N slots gets N entries in the prize draw.
