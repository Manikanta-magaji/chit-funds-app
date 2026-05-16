## Why

The Overview tab has several small UX friction points that reduce clarity for non-technical users: the fund creation form forces users to manually select the current month and year for start date, the cycle labels in the Installment panel are offset from the real start month when a start date is set, and slots with sub-members are collapsed by default requiring an extra click to see payment details. These fixes bring the display in line with real-world fund data and reduce manual steps.

## What Changes

- **CreateGroupPage**: `Start Month` and `Start Year` fields default to the current calendar month and year instead of blank.
- **InstallmentPanel**: `cycleLabel()` uses the group's `start_date` (when available) as the base date for computing cycle month labels; falls back to `created_at` when `start_date` is null.
- **InstallmentPanel**: Slots that have sub-members are expanded by default on initial render so split-payment rows are immediately visible without a manual click.

## Capabilities

### New Capabilities
<!-- None -->

### Modified Capabilities
- `chit-group-management`: Start date fields in create form now default to current month/year instead of empty.
- `group-dashboard-tabs`: Overview tab cycle labels now respect `start_date` as the origin month; InstallmentPanel expanded state initialises with all sub-member slots open.

## Impact

- `frontend/src/pages/CreateGroupPage.tsx` — default state for `startMonth` / `startYear`.
- `frontend/src/components/InstallmentPanel.tsx` — `cycleLabel` signature and initial `expandedSlots` state.
- `frontend/src/pages/GroupDashboardPage.tsx` — pass `start_date` prop alongside `created_at` to `InstallmentPanel`.
- No backend changes required.
- No breaking API changes.
