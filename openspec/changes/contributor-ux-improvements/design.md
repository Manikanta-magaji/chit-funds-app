## Context

A batch of contributor management UX improvements and a fund start-date feature. Covers a React Query cache isolation bug, contributor/sub-member edit flows, modal UX refinements, and optional fund metadata.

## Decisions

### 1. Clear query cache on logout

`queryClient` is instantiated once in `main.tsx` and shared across the entire browser session. On logout, only `setUser(null)` is called — the cache is untouched. Calling `queryClient.clear()` before `setUser(null)` in the logout handler ensures the next user session starts with a fresh cache.

**Where**: Move `queryClient` to a shared `src/api/queryClient.ts` module; import it in both `main.tsx` and `AuthContext.tsx`. `AuthContext.logout()` calls `queryClient.clear()` then `setUser(null)`.

**Alternative considered**: `queryClient.invalidateQueries()` (mark stale but keep cache). Rejected — on logout we want data completely gone, not re-fetched in the background while the login page is showing.

**Alternative considered**: `refetchOnMount: "always"` on each query. Rejected — doesn't solve the cross-user data leak.

### 2. AddContributorModal with inline sub-member form

Extract the inline add-contributor form into `AddContributorModal`. When the admin selects "Sharing with others", the modal body expands to show a list of `SubDraft` rows — each row has name, amount (line 1), and mobile + UPI (line 2, appears once name is entered). The "Add Contributor" button posts the slot, then immediately posts each sub-member in sequence before closing.

**Toggle state**: `isShared` is `boolean | null` (null = not yet chosen). Neither button is pre-selected. The "Add Contributor" button stays disabled until a choice is made. This prevents accidentally submitting a solo slot when the admin intended shared.

**Toggle styling**: Both options use `btn-secondary` (outlined) when unselected. Selected option switches to `btn-primary` (filled). This gives equal visual weight to both options before selection.

**Sub-member drafts**: Minimum 2 sub-members required for a shared slot. A live total shows `sum / fund_amount` with ✓ (exact) or ✗ (mismatch). The "Add Contributor" button is disabled until validation passes.

**Scroll**: Modal has `maxHeight: 90vh; overflowY: auto` so long sub-member lists don't overflow the viewport.

**Alternative considered**: Keep sub-member editor inline on the page after slot creation (old approach). Rejected — required two separate actions and left a partially-created slot visible during the process.

### 3. Edit contributor / sub-member

New `EditContributorModal` is pre-filled with the target's current values. It uses a union type `SlotTarget | SubMemberTarget` to know whether to call `updateSlot` or `updateSubMember`. The amount field only appears for sub-members.

**Visibility rule**: Edit button only shown when `!isRegistered` (slot not linked to a user account). Registered users manage their own name/mobile/UPI from their profile — editing here would create a divergence.

**Backend**: Two new PATCH endpoints — `PATCH /{group_id}/slots/{slot_id}` and `PATCH /{group_id}/slots/{slot_id}/sub-members/{sub_member_id}`. Both require admin. All fields optional (only provided fields updated). Name validated non-empty if provided; amount validated positive if provided.

**Alternative considered**: Inline editing in the row. Rejected — harder to implement without disrupting the list layout; modal is consistent with the add flow.

### 4. Post-create redirect to Contributors tab

After `createGroup` succeeds, `navigate()` passes `{ state: { tab: "contributors" } }`. `GroupDashboardPage` reads `location.state?.tab` (via `useLocation`) to initialize `activeTab`. Defaults to `"overview"` if no state.

**Alternative considered**: Deep-link via URL param (e.g., `?tab=contributors`). Rejected — the tab state is ephemeral navigation intent, not a shareable URL; location state is more appropriate.

### 5. Fund start date

`start_date` (Date, nullable) added to `chit_groups`. The field represents the month the fund launched — stored as the 1st of that month (`YYYY-MM-01`).

**Frontend**: Two `<select>` dropdowns (Month and Year). Year range is current year ±5. Both fields must be filled together or both left empty (partial input is rejected with a validation message). The ISO date string is assembled in `handleSubmit`.

**Backend**: Alembic migration `c3d4e5f6a7b8` adds the column. `GroupCreateRequest` and `GroupOut` schemas include `start_date: Optional[date] = None`. Router passes it through on create and includes it in `_group_to_out`.

**Display**: The field is stored but not yet surfaced in the group dashboard UI. It can be shown in the overview tab in a future change.

### 6. User suggestion: mobile + email

Suggestion items show `mobile_number · email` (fields joined with ` · `; nulls filtered out) under the display name. Applied to both `UserSuggestion.tsx` (used in `AddContributorModal`) and the local `SubMemberSuggestion` component in `GroupDashboardPage`.

### 7. Sub-member row visual separation

Existing sub-member rows in the inline editor (`GroupDashboardPage`) get `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: 7px`, and `padding: .45rem .65rem` via the `.sub-member-existing .sub-member-row` CSS rule. Previously rows had no separation and blurred together visually.

## Risks / Trade-offs

- `queryClient.clear()` on logout also cancels any in-flight mutations (unlikely during logout)
- PATCH endpoints allow changing a sub-member's `split_amount` independently — admin must manually ensure split totals still add up to the fund amount (no backend validation of the sum across all sub-members)
- `start_date` is stored as `YYYY-MM-01` by convention; the day component carries no meaning
