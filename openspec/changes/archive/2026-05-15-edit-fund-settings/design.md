## Context

Currently `ChitGroup` has a `name`, `installment_amount`, and `total_cycles` that are set at creation and have no update pathway. The `GroupAdmin` table already supports adding admins, but the frontend/backend only exposes this for existing contributors. There is no guard preventing edits to financial fields after the fund has been running.

## Goals / Non-Goals

**Goals:**
- Allow name to be edited at any time by any group admin.
- Allow `installment_amount` and `total_cycles` to be edited only before the first prize winner is confirmed.
- Allow any registered user (not just contributors) to be added as a group admin.
- Surface a clear "locked" state in the UI for financial fields once frozen.

**Non-Goals:**
- Retroactively recalculating past installment records when `installment_amount` changes.
- Changing `total_cycles` to a value lower than the current cycle number.
- Allowing admins to be added by non-admin users.

## Decisions

### Decision 1: Single `PATCH /api/groups/{id}` endpoint for settings
Use a partial-update endpoint that accepts any subset of `{name, installment_amount, total_cycles}`. The endpoint applies the winner-lock rule only to the financial fields.

**Alternative considered**: Separate endpoints per field. Rejected — unnecessary proliferation for three fields.

### Decision 2: Winner-lock determined by draw history query
The endpoint checks `db.query(Cycle).filter(Cycle.group_id == id, Cycle.winner_slot_id != None).first()`. If any cycle has a winner, financial fields in the PATCH body are rejected with HTTP 409.

**Alternative considered**: Denormalized `first_winner_confirmed_at` column on `ChitGroup`. Rejected — the draw history already provides this and avoids schema migration.

### Decision 3: Admin grant extended to any registered user (not just contributors)
The existing `POST /api/groups/{id}/admins` already accepts a `user_id`; no model change needed. The only restriction to remove is the frontend gate that required the user to be a slot holder before showing the "Grant Admin" action.

### Decision 4: Financial fields shown as read-only (not hidden) when locked
The edit form displays the locked values with a 🔒 indicator rather than hiding the inputs, so admins can still read the values without ambiguity.

## Risks / Trade-offs

- [Risk] Admin edits `total_cycles` to a value smaller than the number of existing slots. → Mitigation: Backend validates `total_cycles >= current slot count`.
- [Risk] Admin edits `installment_amount` between cycles, causing confusion on outstanding amounts. → Mitigation: The lock after first winner prevents mid-fund changes; the pre-winner window is intentionally flexible.
- [Risk] Adding non-contributors as admin grants them admin UI without a stake in the fund. → Accepted trade-off — fund creators may need a co-admin who isn't a contributor (e.g., a family member helping manage).

## Migration Plan

1. No schema migration needed — no new columns or tables.
2. Add `PATCH /api/groups/{id}` backend endpoint.
3. Deploy backend, then frontend settings panel.
4. Rollback: remove the new endpoint; existing data unaffected.

## Open Questions

- None.
