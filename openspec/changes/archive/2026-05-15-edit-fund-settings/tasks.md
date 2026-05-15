## 1. Backend — Fund Settings Endpoint

- [x] 1.1 Add a `GroupUpdateRequest` Pydantic schema with optional fields: `name`, `installment_amount`, `total_cycles`
- [x] 1.2 Add `PATCH /api/groups/{group_id}` endpoint that applies partial updates to the group
- [x] 1.3 In the endpoint, reject changes to `installment_amount` or `total_cycles` with HTTP 409 if any cycle already has a `winner_slot_id` set
- [x] 1.4 In the endpoint, reject `total_cycles` values lower than the current contributor slot count
- [x] 1.5 Return the updated group object using the existing `GroupOut` schema

## 2. Frontend — Fund Settings Panel

- [x] 2.1 Add an `updateGroupSettings` API helper in `endpoints.ts` calling `PATCH /api/groups/{id}`
- [x] 2.2 On the Group Dashboard, add a ⚙ Settings button (admin-only) that reveals an inline settings form
- [x] 2.3 The settings form has three fields: Fund Name, Monthly Installment (₹), Number of Cycles
- [x] 2.4 Detect whether the fund is "locked" (any cycle has a winner) from the existing draw history data and mark `installment_amount` and `total_cycles` fields as read-only with a 🔒 label when locked
- [x] 2.5 On save, call the PATCH endpoint and refresh group data on success; show field-level validation errors on failure

## 3. Frontend — Add Any User as Admin

- [x] 3.1 In the Group Dashboard admin section, add a user-search input (reuse the existing `UserSuggestion` component) to find any registered user by name, email, or mobile
- [x] 3.2 Allow the admin to grant admin rights to the found user by calling the existing `POST /api/groups/{id}/admins` endpoint regardless of whether the user is a contributor
- [x] 3.3 Display the current admin list with a Revoke button for each admin (excluding the last one)

## 4. Testing

- [x] 4.1 Backend: PATCH updates name successfully
- [x] 4.2 Backend: PATCH updates financial fields before any winner — succeeds
- [x] 4.3 Backend: PATCH rejects financial field changes after a winner is set (HTTP 409)
- [x] 4.4 Backend: PATCH rejects `total_cycles` below current slot count
- [x] 4.5 Backend: grant admin succeeds for a non-contributor registered user
