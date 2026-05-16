## 1. Login Page CTA Styling

- [x] 1.1 In `frontend/src/pages/LoginPage.tsx`, add `className="btn btn-primary"` to the `<Link to="/register">Create one</Link>` element so it renders as a primary button
- [x] 1.2 Update the surrounding paragraph or layout so the button is not inline with the "Don't have an account?" text — present it as a standalone block below the login form

## 2. Registered Display Name in Contributor List

- [x] 2.1 In `frontend/src/pages/GroupDashboardPage.tsx`, find the contributor-row `<span className="contributor-name">` and change `{slot.name}` to `{slot.linked_user_display_name ?? slot.name}` so registered users' chosen names are shown

## 3. Sub-member Visibility for Non-admins

- [x] 3.1 In `frontend/src/pages/GroupDashboardPage.tsx`, remove the `isAdmin &&` condition from the sub-member expand/collapse button so it is visible to all group members when a slot has sub-members
- [x] 3.2 Remove the `isAdmin` condition from the outer `{isExpanded && isAdmin && (` guard on the sub-member section, so the read-only view is rendered for all users when a slot is expanded
- [x] 3.3 Ensure the admin-only edit controls (Edit button, input rows, Save/Cancel) remain inside the `editingSubsSlotId === slot.id` block, which is only triggered by the admin-only Edit button — verify no non-admin controls are accidentally exposed

## 4. Verification

- [x] 4.1 Run `npx tsc --noEmit` in the frontend directory to confirm no TypeScript errors
