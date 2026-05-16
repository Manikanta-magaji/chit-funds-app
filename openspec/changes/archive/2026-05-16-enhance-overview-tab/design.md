## Context

The chit-fund frontend has three small usability gaps on the Overview tab and the fund creation flow. The current code uses `created_at` as the base date for computing cycle month labels — this means a fund created in May but started in January shows "May" for cycle 1. The `startMonth`/`startYear` fields on the creation form default to empty, forcing the user to always manually set them even though the current month is almost always the right answer. Slot rows with sub-members are collapsed on first render, hiding split-payment details behind an extra click.

All changes are **frontend-only**; no API or database changes are required. The backend already stores `start_date` on the group model and returns it in all group detail responses.

## Goals / Non-Goals

**Goals:**
- Pre-populate `Start Month` / `Start Year` on `CreateGroupPage` with the current calendar month and year.
- Make `InstallmentPanel.cycleLabel()` use `start_date` as the origin month when the group has one, falling back to `created_at` otherwise.
- Auto-expand slot rows that have sub-members when `InstallmentPanel` first renders.

**Non-Goals:**
- Not changing any backend API endpoints or data models.
- Not altering how History tab cycle month labels are computed (separate `new Date(group.created_at)` path at line 754 in `GroupDashboardPage` — same fix can be applied trivially but is out of scope for this change).
- Not adding a start-date picker to any other form or flow.

## Decisions

### 1. Use `start_date` over `created_at` for cycle label base date
**Decision**: Add an optional `groupStartDate` prop to `InstallmentPanel`. In `cycleLabel()`, prefer `groupStartDate` over `groupCreatedAt` when it is non-null/non-empty.

**Rationale**: `created_at` is a server-generated timestamp reflecting when the DB record was inserted; it has nothing to do with when the fund's first payment cycle began. `start_date` is explicitly set by the admin to record the real start month, making it the correct anchor. Falling back to `created_at` preserves backward compatibility for groups without a `start_date`.

**Alternative considered**: Pass a single `baseDate` prop computed in `GroupDashboardPage` (picking `start_date ?? created_at`). Rejected because it moves logic to the parent, spreading responsibility. Keeping the fallback inside the component keeps it self-contained.

### 2. Default start month/year to current date on CreateGroupPage
**Decision**: Initialise `startMonth` with `String(new Date().getMonth() + 1)` and `startYear` with `String(new Date().getFullYear())` using `useState`.

**Rationale**: The current month and year are the overwhelmingly common case — a fund admin creating a group almost always starts it in the current period. Defaulting saves two interactions per fund creation. Users can still clear or override the values if needed.

### 3. Auto-expand sub-member slots on initial render
**Decision**: Initialise `expandedSlots` with the set of all slot IDs that have more than one sub-member, computed from the `slots` prop after the installment data loads.

**Rationale**: Non-technical users are unlikely to know they need to click a row to see split details. Showing sub-members by default surfaces relevant payment information immediately. Since the slot list is small (typically < 30 rows), rendering all expanded rows up-front has negligible performance impact.

**Alternative considered**: Always expand all rows regardless of sub-members. Rejected because it adds visual noise for slots without sub-members, which is the common case.

## Risks / Trade-offs

- [Risk] Changing `cycleLabel()` signature could break if other callers rely on the old two-argument form → Mitigation: `groupStartDate` is an optional third parameter (or passed via a separate prop to `InstallmentPanel`); existing call sites remain valid with the fallback logic.
- [Risk] Auto-expanding slots on render could feel jarring if a user has previously collapsed them → Mitigation: The expansion state is local to the component instance (not persisted); once the user collapses a row it stays collapsed until the page reloads. Acceptable UX for the target audience.
