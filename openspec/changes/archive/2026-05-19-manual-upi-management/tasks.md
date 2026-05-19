## 1. Backend: Remove UPI Auto-Derivation

- [x] 1.1 In `backend/app/routers/users.py` `update_profile`: remove the `mobile@upi` inference — store `body.upi_id` if provided, otherwise store `null` (do not fall back to mobile)
- [x] 1.2 In `backend/app/routers/draw.py` `_resolve_upi()`: remove the `mobile@upi` fallback branch — function should return `None` when no explicit UPI is found on either the linked user or the slot/sub-member

## 2. Backend: Admin UPI Edit for Linked Contributors

- [x] 2.1 In `backend/app/routers/slots.py` slot update endpoint (`PUT /{group_id}/slots/{slot_id}`): when the slot has a `linked_user_id`, write the incoming `upi_id` value to `User.upi_id` instead of `ContributorSlot.upi_id`
- [x] 2.2 In `backend/app/routers/slots.py` sub-member update endpoint (`PUT /{group_id}/slots/{slot_id}/sub-members`): for each sub-member entry with a `linked_user_id`, write the incoming `upi_id` to `User.upi_id` instead of `SubMember.upi_id`

## 3. Frontend: Remove UPI Inference from Edit Contributor Modal

- [x] 3.1 In `EditContributorModal.tsx`: remove the `inferUpi()` function and all call-sites
- [x] 3.2 Remove the `onChange` side-effect on the mobile field that auto-populates the UPI field
- [x] 3.3 Update the UPI input placeholder from "Leave blank to use {mobile}@upi" to a neutral prompt (e.g., "e.g. name@bank or phone@upi")

## 4. Frontend: Split Offline vs Linked Behavior in Edit Contributor Modal

- [x] 4.1 Add an `isLinked` (or `linked_user_id`) flag to the `SlotTarget` and `SubMemberTarget` interfaces in `EditContributorModal.tsx`
- [x] 4.2 When `isLinked` is true: render only the UPI ID field; hide the name and mobile fields
- [x] 4.3 When `isLinked` is true: show an inline notice "This will update [name]'s UPI ID globally across all groups"
- [x] 4.4 Pass the `linked_user_id` (or a boolean) from the slots list to the modal when opening it for a linked slot or sub-member

## 5. Frontend: Profile Setup — Make UPI Optional

- [x] 5.1 In the profile setup page: remove any UPI auto-fill or hint derived from the mobile number input
- [x] 5.2 Mark the UPI ID field as optional in the profile setup form (update label and validation)
- [x] 5.3 Ensure the "Complete Profile" submit button enables when only display name and mobile number are filled (UPI is not required)

## 6. Frontend: "No UPI ID Configured" Notice

- [x] 6.1 In the group dashboard winner area: when the winner's resolved UPI is `null` or empty, replace the Pay Now button with a "No UPI ID configured" notice
- [x] 6.2 The notice should include a short instruction: e.g., "Ask [winner name] to add their UPI ID in Profile Settings, or an admin can add it via Edit Contributor."
- [x] 6.3 For shared winning slots: apply the same logic per sub-member — show Pay Now for sub-members with a UPI, and the notice for those without

## 7. Conflict Resolution: winner-payout-submember-mobile

- [x] 7.1 In `openspec/changes/winner-payout-submember-mobile/specs/upi-payment-initiation/spec.md`: remove the "ADDED Requirements" section that introduces "UPI handle derivation for offline winners" — this requirement is superseded by this change

## 8. Testing

- [x] 8.1 Test: update profile without UPI ID → profile marked complete, `upi_id` is `null`
- [x] 8.2 Test: draw prize on slot with no UPI ID → Pay Now is absent, "No UPI ID configured" notice shown
- [x] 8.3 Test: admin edits UPI for linked contributor slot → `User.upi_id` updated, `ContributorSlot.upi_id` unchanged
- [x] 8.4 Test: admin edits UPI for offline contributor slot → `ContributorSlot.upi_id` updated, no `User` record affected
- [x] 8.5 Test: `_resolve_upi()` with linked user having no UPI and slot having a mobile number → returns `None` (no derivation)
- [x] 8.6 Test: Edit Contributor modal for linked slot → shows UPI-only form with global-change notice
