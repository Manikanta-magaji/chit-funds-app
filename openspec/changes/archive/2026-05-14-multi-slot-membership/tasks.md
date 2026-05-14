## 1. Database Migration

- [x] 1.1 Write Alembic migration to drop the unique constraint on `(group_id, user_id)` in the `contributor` table
- [x] 1.2 Write Alembic migration to drop the unique constraint on `(slot_id, user_id)` (or equivalent) in the `sub_member` table
- [x] 1.3 Run and verify the migration locally; confirm existing data is unaffected

## 2. Backend — Contributor & Sub-member Validation

- [x] 2.1 Remove application-level guard in the "add contributor" endpoint that rejects a user already linked in the same group
- [x] 2.2 Remove application-level guard in the "add sub-member" endpoint that rejects a user already present in the same group
- [x] 2.3 Add a helper that checks whether a given `user_id` is already linked to any slot or sub-member in a group (used for warning, not blocking)
- [x] 2.4 Return a `duplicate_user_warning: true` flag in the contributor/sub-member creation response when the user is already present elsewhere in the group

## 3. Backend — Installment Summary

- [x] 3.1 Verify the existing `/groups/{id}/installments` (or equivalent) endpoint returns `linked_user_id` on each slot and sub-member row
- [x] 3.2 Ensure payment status and amount are included per row so the frontend can aggregate without an extra request

## 4. Frontend — Admin: Duplicate User Warning

- [x] 4.1 When adding a contributor slot, detect a `duplicate_user_warning` flag in the API response and surface a confirmation dialog: "This user is already a contributor in this group. Add them to another slot?"
- [x] 4.2 When adding a sub-member, apply the same confirmation dialog pattern

## 5. Frontend — Member: Aggregate Installment View

- [x] 5.1 In the group dashboard installment panel, collect all slot/sub-member rows where `linked_user_id === currentUser.id`
- [x] 5.2 If the count is greater than 1, render a summary row: "You have N slots in this group — Total due: ₹<sum of unpaid amounts>"
- [x] 5.3 Render each individual slot row below the summary with its own payment status and Mark Paid button
- [x] 5.4 After marking one slot as paid, refresh only the affected row and recalculate the summary total

## 6. Testing

- [x] 6.1 Update backend unit tests that assert a user cannot appear in more than one slot in the same group
- [x] 6.2 Add backend test: user linked to two slots can independently mark each as paid
- [x] 6.3 Add backend test: user linked as primary slot and sub-member in the same group — both positions visible
- [x] 6.4 Add frontend test: aggregate summary row appears when current user has multiple slots
- [x] 6.5 Add frontend test: single-slot user sees no summary row (no regression)
