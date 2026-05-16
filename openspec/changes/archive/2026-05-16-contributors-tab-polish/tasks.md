## 1. Registration Status — Colour-coded Backgrounds

- [x] 1.1 In `frontend/src/index.css`, add `.slot-registered { background: #f0fdf4; }` utility class for contributor blocks
- [x] 1.2 In `GroupDashboardPage.tsx`, replace `badge-registered` / `badge-offline` spans on contributor rows with `.slot-registered` class applied to `.contributor-block` (add to existing className)
- [x] 1.3 Remove the `badge-registered` / `badge-offline` span inside sub-member draft rows in the sub-member editor

## 2. Sub-member Editor — Remove Instructional Text

- [x] 2.1 In `GroupDashboardPage.tsx`, delete the `<p className="text-muted">` paragraph containing "Edit or rearrange below — saving replaces all sub-members:" / "Add the people sharing this slot…" text

## 3. Sub-member List — Bulk Edit Mode with Total Validation

- [x] 3.1 In `GroupDashboardPage.tsx`, add a single **Edit** button in the sub-member section header (not per-row); clicking it sets `editingSubsSlotId` to that slot's ID and populates `editSubsDrafts` with all current sub-members
- [x] 3.2 Edit mode renders all sub-members as input rows; view mode renders name-only read-only rows
- [x] 3.3 Each edit row shows all four fields — name, mobile, UPI, amount — in a **single flex row** (no two-row layout); registered sub-member name is read-only text, all other fields are inputs
- [x] 3.4 Live total indicator (`₹X / ₹Y ✓/✗`) shown at the bottom of the edit section; Save disabled until total matches installment amount
- [x] 3.5 **Remove button** shown only in edit mode (not in view mode); clicking Remove removes the row from `editSubsDrafts` and recalculates the total immediately; API DELETE fires only as part of Save
- [x] 3.6 Save calls PATCH for changed rows and DELETE for removed rows, then invalidates slots query
- [x] 3.7 Cancel discards `editSubsDrafts` changes (no API calls); returns to view mode

## 7. Add Contributor — Pre-check Before Opening Modal

- [x] 7.1 In `GroupDashboardPage.tsx`, before calling `setShowAddContributor(true)`, check if `slots.length >= group.total_cycles`
- [x] 7.2 If the group is full, show an inline error message near the Add Contributor button instead of opening the modal
- [x] 7.3 If the group has capacity, open the modal as normal

## 4. Always-Expanded Sub-members on Tab Load

- [x] 4.1 Replace `expandedSlotId: number | null` state with `expandedSlotIds: Set<number>` in `GroupDashboardPage.tsx`
- [x] 4.2 Add a `useEffect` that seeds `expandedSlotIds` with all slot IDs where `sub_members.length > 0`, running when `activeTab === "contributors"` or `slots` changes
- [x] 4.3 Update all `isExpanded` checks from `expandedSlotId === slot.id` to `expandedSlotIds.has(slot.id)`
- [x] 4.4 Update expand/collapse toggle: clicking “Sub-members” adds slot.id to Set; “Close” removes it
- [x] 4.5 Keep `subDrafts` for the “Add new sub-member” workflow (adding sub-members to a slot for the first time); the per-row edit flow uses `editingSubMemberId` + local input state instead

## 5. AddContributorModal — Footer Padding

- [x] 5.1 In `frontend/src/index.css`, add `padding-bottom: 1rem;` to `.modal-footer` rule (or add if rule doesn't exist)

## 8. Sub-member Edit Mode — Add Sub-member & Consistent +Split Form

- [x] 8.1 In `GroupDashboardPage.tsx`, add a `+ Add Sub-member` button in the sub-member section header while `editingSubsSlotId === slot.id`; clicking it appends a blank offline draft row to `editSubsDrafts`
- [x] 8.2 Change `saveSubMemberEdits` to use `setSubMembers` PUT (replace-all) instead of individual PATCH/DELETE; include `linked_user_id` for registered sub-members in the payload
- [x] 8.3 Update `editSubsDrafts` type to include `linked_user_id?: number`; populate it when entering edit mode for registered sub-members
- [x] 8.4 In `openSubMembers`, pre-populate the first draft's `mobile_number` with `slot.mobile_number` (and `upi_id` with `slot.upi_id`)
- [x] 8.5 Rewrite the `+Split` first-time add form to render each draft as a single flex row: name/suggestion (flex 3) · mobile (flex 2) · UPI (flex 2) · amount (flex 1) — no conditional secondary row

## 9. Mobile Number Normalization and Validation

- [x] 9.1 Create `frontend/src/utils/normalizeMobile.ts` exporting `normalizeMobile(raw: string): string | null` — strips spaces, country code (+91 / 91 / 0091), dashes, parentheses; returns 10-digit string starting with 6–9 or `null` if invalid
- [x] 9.2 In `AddContributorModal.tsx`, call `normalizeMobile` on the offline single-contributor `mobile` field and on each `subDrafts[].mobile_number` before mutating; throw with an inline error message if any result is `null`
- [x] 9.3 In `GroupDashboardPage.tsx`, call `normalizeMobile` in both `saveSubMembers` (the +Split form) and `saveSubMemberEdits` (bulk edit mode) on every offline mobile field; set the error state with the invalid-number message instead of proceeding

## 10. Registered Sub-member Edit UX

- [x] 10.1 In `GroupDashboardPage.tsx` edit mode rows, show the Remove button for **all** sub-members (remove the `!d.isRegistered` condition from the Remove button)
- [x] 10.2 For registered sub-members in edit mode, render mobile and UPI ID as disabled `<input>` elements (showing stored value) instead of hiding those fields
- [x] 10.3 In `saveSubMemberEdits`, guard against saving with zero sub-members: if `editSubsDrafts.length === 0`, set error "At least one sub-member is required." and return early

## 6. Verification

- [ ] 6.1 Contributor slots show green tint for registered, default background for offline — no Registered/Unregistered text badges visible
- [ ] 6.2 Sub-member drafts render as a single row with name · mobile · UPI · amount fields
- [ ] 6.3 No instructional paragraph visible in the sub-member editor
- [ ] 6.4 Switching to Contributors tab auto-expands all slots that have sub-members
- [ ] 6.5 AddContributorModal footer buttons have visible gap from modal bottom border
