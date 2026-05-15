## Why

Fund settings like name, installment amount, and cycle count cannot be changed after creation, forcing admins to delete and recreate a group if a mistake was made or circumstances change. Additionally, fund creators currently cannot promote other members to admin without them already being slot holders. These gaps cause unnecessary friction in day-to-day fund management.

## What Changes

- Group admins can edit the **fund name** at any time after creation.
- Group admins can edit the **monthly installment amount** and **number of cycles** only before the first prize winner is declared. After the first winner is confirmed, these fields become read-only.
- The fund creator (and any admin) can **add any registered user as an admin** directly — the user does not need to be a contributor slot holder first.
- The existing admin-grant flow (which already exists for group members) is extended to also accept users who are not yet contributors.

## Capabilities

### New Capabilities

- `fund-settings-edit`: Ability for admins to edit fund name, installment amount, and cycle count, with enforcement that financial fields (amount, cycles) are locked once the first winner is declared.

### Modified Capabilities

- `chit-group-management`: The admin role management requirement is updated to allow adding any registered user as admin (not restricted to existing slot holders).

## Impact

- **Backend**: New `PATCH /groups/{id}` endpoint (or reuse `PUT`) with partial update support; business rule check against draw history before allowing financial field edits.
- **Frontend**: Group settings panel (or modal) with editable fields; financial fields show a lock indicator once frozen.
- **APIs**: No breaking changes — existing group creation and detail endpoints unchanged.
