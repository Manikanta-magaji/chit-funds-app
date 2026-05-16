## Problem

Several issues were degrading the admin experience when managing contributors and creating funds:

### 1. Groups list intermittently empty on home page

After logging in, the `/groups` page sometimes shows no funds even though they exist. Re-logging in fixes it. The root cause is that the React Query cache (`queryClient`) is created once for the entire browser session and is **never cleared on logout**. Stale or empty `["groups"]` cache from a previous session survives the logout/login boundary. This is also a data isolation bug — two users sharing a browser could briefly see each other's groups.

### 2. Add-contributor form expands inline on the page

The "Add Contributor" form rendered inline inside the contributor list, pushing existing rows down. The suggestion dropdown was also inline, making it hard to read. A modal dialog with a stable, contained form is more usable for non-tech admins.

### 3. No way to edit unregistered contributor details

Once added, an offline contributor's name, mobile, or UPI could only be fixed by removing and re-adding the slot. There was also no way to correct a sub-member's split amount post-add.

### 4. Adding shared contributors required two steps

Adding a slot first and then separately adding sub-members was an unnecessary two-step flow. Both should happen in one modal.

### 5. Toggle buttons looked asymmetric

"Just them" was shown as filled (primary) before any selection, making it appear pre-selected even when the admin hadn't made a choice.

### 6. Fund start date not recorded

There was no way to specify which month a chit fund was launched. The start date is useful for display and for calculating where in the cycle a group currently is.

### 7. User search suggestions showed only name and email

When searching for a user to link to a slot, suggestions only showed name + email. Users with the same name couldn't be distinguished if they had different mobile numbers.

## Proposed Solution

### Bug fix: clear query cache on logout

Move `queryClient` to a shared `src/api/queryClient.ts` module and call `queryClient.clear()` in the `AuthContext` logout handler.

### UX: Add-contributor modal with inline sub-member form

Replace the inline form with `AddContributorModal`. When "Sharing with others" is selected, the modal expands inline to show a list of sub-member draft rows (name, mobile, UPI, amount). Clicking "Add Contributor" saves the slot then all sub-members in one action.

- Toggle uses `btn-secondary` for unselected state (equally visible) and `btn-primary` for selected (filled). Neither option is pre-selected (`isShared` defaults to `null`).
- Live split validation shows total vs. fund amount with a ✓/✗ indicator.
- Modal has `maxHeight: 90vh` + scroll for long sub-member lists.

### Edit contributor / sub-member

New `EditContributorModal` component pre-filled with existing values. Edit buttons appear on unregistered contributor rows and unregistered sub-member rows (registered users manage their own profile). Two new PATCH endpoints on the backend handle the updates.

### Fund start date (optional)

`CreateGroupPage` gains two dropdowns — Month and Year (±5 years from today). Both must be filled or both left empty. The selected values are combined into an ISO date `YYYY-MM-01` and stored in a new nullable `start_date` column on `chit_groups`. This is for reference and display only.

### Post-create redirect to Contributors tab

After creating a group the admin is redirected to `GroupDashboardPage` with the Contributors tab pre-selected, so they can immediately start adding members.

### User suggestions: show mobile + email

Each suggestion item now shows `mobile_number · email` (or just whichever fields are present) under the display name so admins can distinguish users with the same name.

## Scope

**In scope:**
- Fix: `queryClient.clear()` on logout
- Fix: suggestion opacity (side effect of modal solid background)
- UX: Add-contributor modal with inline sub-member form
- UX: Edit unregistered contributor / sub-member
- UX: Post-create redirect to Contributors tab
- UX: Toggle button visual symmetry
- Feature: Optional fund start month/year
- Feature: Mobile + email in user suggestion dropdown

**Out of scope:**
- Displaying `start_date` on the dashboard (stored for future use)
- Editing registered user profile data from the group dashboard
- Any change to the prize draw or installment flows

## Impact

- Admins get a focused modal for adding contributors with sub-members in one step
- Intermittent empty groups list is permanently resolved
- Contributor and sub-member details can be corrected without removing and re-adding
- Fund creation captures start month so historical chit groups can be recorded accurately
- User search is unambiguous when multiple users share the same display name
