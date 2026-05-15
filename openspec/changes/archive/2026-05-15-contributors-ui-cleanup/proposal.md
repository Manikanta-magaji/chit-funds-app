## Why

The Contributors tab has grown visually cluttered with overlapping badges (winner, paid, unpaid, registered, admin) that create noise for a non-technical audience. Payment status is already visible on the Overview tab, so repeating it on Contributors adds confusion rather than clarity. Similarly, admin users who are not contributors appear as generic "User #N" labels with no clear explanation, making the group roster misleading.

A secondary issue exists in the Installment Tracking panel: the `pending` and `partial` badge labels are technically distinct but visually confusing — users cannot intuitively tell them apart. Consolidating them under a single "In Progress" label reduces cognitive load.

## What Changes

- Remove per-slot paid/unpaid status badges from the Contributors tab; payment status belongs exclusively in the Installment Tracking panel.
- Replace the full "🏆 Winner" text badge on contributor rows with a plain trophy icon (🏆) — no text label needed.
- Show admin users who hold no contributor slot with their actual display name plus an "Admin only" indicator, instead of the generic "User #N" placeholder.
- Rename the `pending` and `partial` installment status badges to a single **"In Progress"** label in the frontend display (backend enum values unchanged).

## Capabilities

### New Capabilities

_None._

### Modified Capabilities

- `group-dashboard-tabs`: Requirements for what is displayed on the Contributors tab and the Installment Tracking panel are changing — winner indicator display, payment status display policy, admin-user display, and installment badge labels.

## Impact

- **Frontend only** — no API or backend changes required.
- `frontend/src/pages/GroupDashboardPage.tsx`: Contributors tab slot rendering (winner badge, paid/unpaid badges, admin-only non-contributor display).
- `frontend/src/components/InstallmentPanel.tsx`: `statusBadgeClass` / badge label mapping (`pending` + `partial` → "In Progress").
- No breaking changes.
