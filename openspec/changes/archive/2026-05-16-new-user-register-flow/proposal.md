## Why

New users joining the app face three friction points: the registration CTA on the login page looks like a plain link (easy to miss), contributors who were added offline by an admin and later register with a slightly different name get confusingly mismatched displays, and non-admin group members cannot see sub-member breakdowns in the Contributors tab—leaving them in the dark about how a shared slot is split.

## What Changes

- **Login page CTA**: Style the "Create one" registration link as a visually prominent primary button so new users can find and use it easily.
- **Offline-to-registered name display**: When a contributor slot is linked to a registered user, show the user's registered `display_name` in the Contributors tab rather than the admin-typed slot name; the slot name is retained internally and used as a fallback when no user is linked.
- **Sub-member visibility for non-admins**: Members of a group (non-admins) can expand a multi-sub-member slot to see the read-only sub-member name list; admin-only actions (edit, add, remove sub-members) remain gated to admins.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `mobile-auth`: New requirement — when a user registers and is auto-linked to an existing offline contributor slot, the Contributors tab MUST display the user's registered `display_name` rather than the original admin-typed slot name.
- `contributor-management`: New requirement — non-admin group members SHALL be able to expand a slot to view sub-member names (read-only); the expand button is visible to all group members, not only admins.

## Impact

- **Frontend**:
  - `frontend/src/pages/LoginPage.tsx` — add `btn btn-primary` classes to the registration link
  - `frontend/src/pages/GroupDashboardPage.tsx` — (a) display `slot.linked_user_display_name ?? slot.name` in contributor rows; (b) remove `isAdmin` gate from sub-member expand button and view-mode rendering
- **Backend**: No API changes needed; `linked_user_display_name` is already returned by the slots API
- **Specs**: `mobile-auth/spec.md` and `contributor-management/spec.md` gain new scenarios
