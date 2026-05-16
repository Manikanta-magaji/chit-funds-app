## 1. Database Migration

- [x] 1.1 Create Alembic migration: add `mobile_number VARCHAR(20)` and `upi_id VARCHAR` (both nullable) to `contributor_slots` table
- [x] 1.2 Create Alembic migration: add `mobile_number VARCHAR(20)` and `upi_id VARCHAR` (both nullable) to `sub_members` table
- [x] 1.3 Run migration and verify columns exist in SQLite schema

## 2. Backend — Pydantic Schemas

- [x] 2.1 Add optional `mobile_number` and `upi_id` fields to `ContributorSlotCreate` schema
- [x] 2.2 Add optional `mobile_number` and `upi_id` fields to `SubMemberCreate` schema
- [x] 2.3 Add `mobile_number` and `upi_id` to `ContributorSlotRead` / `SubMemberRead` response schemas
- [x] 2.4 Add `sub_members` array to the winner/payout response schema; each entry includes `id`, `name`, `upi_id` (resolved), and `share_amount`

## 3. Backend — Validation

- [x] 3.1 In the contributor-slot create endpoint, enforce that `mobile_number` is non-empty when `linked_user_id` is null (offline slot); return HTTP 422 with clear message otherwise
- [x] 3.2 In the sub-member create endpoint, enforce that `mobile_number` is non-empty when `linked_user_id` is null (offline sub-member); return HTTP 422 with clear message otherwise

## 4. Backend — Winner Payout Response

- [x] 4.1 In the winner/payout detail endpoint, resolve each sub-member's effective UPI: use `linked_user.upi_id` if linked, else `sub_member.upi_id`, else derive `<mobile>@upi` from `sub_member.mobile_number`
- [x] 4.2 Return `sub_members` array in the winner payload when the winning slot has ≥1 sub-member; each entry must include `name`, resolved `upi_id`, and `share_amount`
- [ ] 4.3 Write unit tests for UPI handle resolution logic (linked user UPI, explicit offline UPI, derived mobile@upi, missing contact)

## 5. Frontend — Contributor Add Form

- [x] 5.1 Add a required `Mobile Number` text field to the contributor slot add form; show it for offline entries (no linked user selected)
- [x] 5.2 Add a required `Mobile Number` text field to the sub-member add form; show it when the sub-member is being saved as offline (no registered user selected)
- [x] 5.3 Add optional `UPI ID` text field to both forms (offline only); hint text: "Leave blank to use `<mobile>@upi`"
- [x] 5.4 Validate that mobile is filled before form submission when offline; display inline error "Mobile number is required for offline contributors/sub-members"
- [x] 5.5 Wire the new fields to the API payload (`mobile_number`, `upi_id`) on submit

## 6. Frontend — Winner Pay Now (Sub-member Payout)

- [x] 6.1 Update `GroupDashboardPage` winner section: when winner payload contains `sub_members` array with >1 entry, render a list of per-sub-member Pay Now buttons instead of a single button
- [x] 6.2 Each per-sub-member button is labelled "Pay [Name]" and opens `UpiPaymentModal` pre-populated with that sub-member's resolved UPI ID and `share_amount`
- [x] 6.3 When a sub-member has no resolvable UPI (neither linked user UPI, explicit UPI, nor mobile), show their name and share amount with a greyed-out "No UPI available" label instead of a button
- [x] 6.4 When winner slot has exactly one sub-member, keep existing single Pay Now button behaviour (no visual change)
- [x] 6.5 Update `UpiPaymentModal` to accept `payeeName` and `amount` as props so it can be reused for per-sub-member modals without hard-coding slot-level values

## 7. Backend — Auto-link on Registration

- [x] 7.1 Add a helper function `link_offline_entries_by_mobile(db, user)` that queries `ContributorSlot` (offline, `linked_user_id` IS NULL) and `SubMember` (`linked_user_id` IS NULL) by mobile number and sets `linked_user_id` to the new user's ID
- [x] 7.2 Call `link_offline_entries_by_mobile` inside the `POST /auth/register` endpoint after the user is persisted, within the same DB transaction
- [x] 7.3 Call `link_offline_entries_by_mobile` inside the OAuth mobile-setup endpoint (profile setup save) after the mobile number is committed to the user record

## 8. Testing & Verification

- [ ] 8.1 Test: add offline contributor without mobile → expect validation error in UI and API
- [ ] 8.2 Test: add offline sub-member without mobile → expect validation error in UI and API
- [ ] 8.3 Test: draw prize on a shared slot with 2 sub-members → expect 2 Pay Now buttons on dashboard
- [ ] 8.4 Test: one sub-member has no UPI/mobile → expect "No UPI available" label for that sub-member
- [ ] 8.5 Test: single-member winning slot → expect existing single Pay Now button behaviour unchanged
- [ ] 8.6 Test: register new user whose mobile matches an offline contributor slot → slot `linked_user_id` is set; slot no longer shown as offline
- [ ] 8.7 Test: register new user whose mobile matches offline entries in two different groups → both are linked
- [ ] 8.8 Test: register new user with mobile that matches no offline entry → no side effects
