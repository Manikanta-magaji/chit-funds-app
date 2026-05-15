## 1. Backend — Enrich group response with admin display names

- [x] 1.1 In `backend/app/routers/groups.py`, update `_group_to_out` to include an `admin_users` list: `[{"id": a.user_id, "display_name": a.user.display_name or a.user.email}]` using the `GroupAdmin.user` relationship
- [x] 1.2 Update `GroupOut` schema (or equivalent Pydantic model) in `backend/app/schemas/groups.py` to add `admin_users: list[dict]` alongside `admin_ids`
- [x] 1.3 Verify the `/groups/{group_id}` response includes `admin_users` with display names

## 2. Frontend — Contributors tab: remove payment status chip

- [x] 2.1 In `GroupDashboardPage.tsx` Contributors tab, remove the `<span className="payment-chip ...">` element (paid/unpaid/partially paid chip) from each slot row's `contributor-actions` div
- [x] 2.2 Verify no payment status is shown on any contributor slot row after the change

## 3. Frontend — Contributors tab: winner indicator icon only

- [x] 3.1 In `GroupDashboardPage.tsx`, replace `<span className="badge badge-winner">🏆 Winner</span>` with an inline `🏆` icon: `<span title="Prize winner this cycle" style={{ marginLeft: "4px" }}>🏆</span>` placed after the slot name

## 4. Frontend — Contributors tab: show admin-only users

- [x] 4.1 In `GroupDashboardPage.tsx`, compute `adminOnlyUsers`: admins in `group.admin_users` who are not linked to any contributor slot (`!slots.some(s => s.linked_user_id === admin.id)`)
- [x] 4.2 After the `slots.map(...)` list, render a separate section for `adminOnlyUsers` — each entry shows `admin.display_name` and a muted `"Admin"` badge (not editable, no remove/sub-member actions)
- [x] 4.3 Update `AdminManagementSection` (Settings tab) to use the `display_name` from `admin_users` via a prop instead of the slot-name fallback; remove the `User #${uid}` fallback

## 5. Frontend — InstallmentPanel: unify pending/partial badge labels

- [x] 5.1 In `InstallmentPanel.tsx`, update `statusBadgeClass` to return `"badge-warning"` for both `"pending"` and `"partial"` (removing `badge-partial` class usage)
- [x] 5.2 Add a `statusLabel` helper (or extend `statusBadgeClass`) that maps `"pending"` → `"In Progress"`, `"partial"` → `"In Progress"`, `"paid"` → `"Paid"`, `"unpaid"` → `"Unpaid"`
- [x] 5.3 Replace all inline `{item.status}` / `{smStatus}` badge text in the InstallmentPanel table rows with `statusLabel(item.status)` / `statusLabel(smStatus)`
- [x] 5.4 Update the summary stat row (pending count + partial count badges at the top of InstallmentPanel) to show a single "In Progress" count combining both `pending` and `partial` items
