## Bug Fix: Query Cache Isolation

- [x] 1.1 Create `frontend/src/api/queryClient.ts` exporting a shared `QueryClient` instance
- [x] 1.2 Update `frontend/src/main.tsx` to import `queryClient` from the shared module instead of creating it locally
- [x] 1.3 Update `frontend/src/context/AuthContext.tsx` to import `queryClient` and call `queryClient.clear()` in the `logout` function

## UX: Add-Contributor Modal

- [x] 2.1 Create `frontend/src/components/AddContributorModal.tsx` with the form (name input, UserSuggestion, solo/sharing toggle, mobile, UPI, Add/Cancel buttons)
- [x] 2.2 Remove the inline `{addingSlot && ...}` form block from `GroupDashboardPage.tsx`
- [x] 2.3 Wire the `+ Add Contributor` button to open the modal (`setAddingSlot(true)` → `setShowAddModal(true)`)
- [x] 2.4 Move form state (`newSlotName`, `newSlotLinkedUser`, `newSlotMobile`, `newSlotUpi`, `newSlotIsShared`) and `addSlotMutation` into `AddContributorModal` or keep lifted in page and pass as props — confirm approach
- [x] 2.5 On modal success: close modal, invalidate `["slots", groupId]` and `["group", groupId]`, auto-expand shared slot sub-member editor (carry over existing logic)
- [x] 2.6 Verify suggestion dropdown renders correctly on modal's solid background (opacity fix as side effect)

## UX: Post-Create Redirect

- [x] 4.1 In `CreateGroupPage.tsx`, pass `{ state: { tab: "contributors" } }` to `navigate()` after group creation
- [x] 4.2 In `GroupDashboardPage.tsx`, read `location.state?.tab` to initialize `activeTab` (defaults to `"overview"`)

## Edit Contributor / Sub-member

- [x] 5.1 Backend: `PATCH /{group_id}/slots/{slot_id}` — update slot name, mobile_number, upi_id (admin only)
- [x] 5.2 Backend: `PATCH /{group_id}/slots/{slot_id}/sub-members/{sub_member_id}` — update sub-member name, mobile_number, upi_id, split_amount (admin only)
- [x] 5.3 Frontend: add `updateSlot` and `updateSubMember` to `endpoints.ts`
- [x] 5.4 Create `frontend/src/components/EditContributorModal.tsx` — modal with name, mobile, UPI fields; optional amount field for sub-members
- [x] 5.5 Add Edit button on contributor rows in `GroupDashboardPage.tsx` (next to Remove); opens `EditContributorModal` pre-filled
- [x] 5.6 Add Edit button on each sub-member row in the sub-member section; opens `EditContributorModal` pre-filled with amount

## AddContributorModal Improvements

- [x] 6.1 Change "Just them" / "Sharing with others" toggle from primary/ghost to secondary/primary styling (both equally visible, selected is filled)
- [x] 6.2 When "Sharing with others" is selected, expand the modal inline to show a sub-member form (name, mobile, UPI, amount per person)
- [x] 6.3 "Add Contributor" click saves the slot first, then immediately saves sub-members in sequence, then closes modal — no extra step required
- [x] 6.4 Sub-member rows in the inline form have clear card/border separation from each other

## UI Polish

- [x] 7.1 Existing sub-member rows in the sub-member editor (GroupDashboardPage) get card-style separation (border, padding, border-radius per row)

## Fund Start Date

- [x] 8.1 Backend: add `start_date` (Date, nullable) column to `chit_groups` via Alembic migration `c3d4e5f6a7b8`
- [x] 8.2 Backend: add `start_date: Optional[date] = None` to `GroupCreateRequest`, `GroupOut` schemas and `ChitGroup` model
- [x] 8.3 Backend: pass `start_date` when creating group in router; include in `_group_to_out`
- [x] 8.4 Frontend: add `start_date?: string` to `GroupDetail` type and `createGroup` endpoint
- [x] 8.5 Frontend: add optional Start Month/Year dropdowns to `CreateGroupPage` (month select + year select ±5 years); constructs ISO date `YYYY-MM-01` on submit

## User Suggestion: Show Mobile

- [x] 9.1 `UserSuggestion.tsx`: display `mobile_number · email` (or whichever fields are present) under the user name in suggestion items
- [x] 9.2 `GroupDashboardPage.tsx` `SubMemberSuggestion`: same change — show mobile and email together

## Verification

- [ ] 3.1 Log in, navigate to /groups — groups load correctly every time
- [ ] 3.2 Log out, log back in — no stale data shown
- [ ] 3.3 Two users: log in as A, log out, log in as B — B sees only their own groups
- [ ] 3.4 Add contributor via modal — form opens in modal, page list stays stable
- [ ] 3.5 Add offline contributor — suggestions show on white background with readable text
- [ ] 3.6 Add shared contributor — sub-members form appears inline in modal, saved in one step
- [ ] 3.7 Create a new group — should land on Contributors tab automatically
- [ ] 3.8 Create a new group with start month/year — value stored and returned in API response
- [ ] 3.9 Search for a user — suggestion shows name + mobile + email together

## Modal: Widen for Better Alignment

- [x] 10.1 Increase `AddContributorModal` `maxWidth` from 480 to 560px for better form alignment

## Sub-member Inline Editing

- [x] 11.1 Remove the read-only `.sub-member-existing` display section from the sub-member editor — the editable draft rows already contain the same data (populated from existing sub-members in `openSubMembers`); showing both causes duplication
- [x] 11.2 Remove the Edit button from existing sub-member rows (the sub-member editor is now the single editing surface)
- [x] 11.3 Update the explanatory hint text now that there is no "existing" vs "draft" distinction

## Start Date Editing in Fund Settings

- [x] 12.1 Backend: add `start_date: Optional[date] = None` to `GroupUpdateRequest` schema
- [x] 12.2 Backend: handle `start_date` update in `update_group` router — locked after first winner is drawn (same rule as installment/cycles)
- [x] 12.3 Frontend: add `start_date?: string` to `updateGroupSettings` endpoint
- [x] 12.4 Frontend: add `settingStartMonth` / `settingStartYear` state; populate from `group.start_date` in `openSettings`
- [x] 12.5 Frontend: add Month/Year dropdowns to Settings tab form, disabled when `winnerDeclared`; include `start_date` in patch on save
