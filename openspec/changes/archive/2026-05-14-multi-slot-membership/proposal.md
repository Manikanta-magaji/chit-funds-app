## Why

Currently, a registered user can only be linked to a single contributor slot per chit fund group. In practice, a member may want to participate with a higher obligation — either by holding two full slots or by being a primary slot holder and also a sub-member of another slot. This change enables that flexibility without disrupting the existing per-slot payment tracking.

## What Changes

- A registered user MAY be linked to more than one contributor slot (as primary or sub-member) within the same group.
- When a user holds multiple positions, the group dashboard shows their **combined installment obligation** for the current cycle.
- **Mark Paid** remains per-slot — each contributor position is paid independently, giving the user (or admin) granular control.
- Validation is updated to allow duplicate user links across slots while still enforcing slot capacity limits.

## Capabilities

### New Capabilities

- `multi-slot-membership`: Ability for a single registered user to be linked to multiple contributor positions (as primary slot holder and/or as sub-member) within the same group, with an aggregated installment view and per-slot payment actions.

### Modified Capabilities

- `contributor-management`: Remove the implicit one-user-per-group constraint so that the same user account may be linked to more than one slot or sub-member record within a group.
- `installment-tracking`: When a logged-in member holds multiple positions in a group, the installment panel MUST display the total due across all their positions alongside individual slot-level Mark Paid actions.
- `prize-draw`: The random draw pool treats each contributor slot as a distinct entry. A user holding N slots gets N draw chances; only the winning slot is removed from future draw pools.

## Impact

- **Backend**: `Contributor` / `SubMember` uniqueness constraints on `(group_id, user_id)` must be relaxed; installment summary queries must aggregate across all slots a user is linked to.
- **Frontend**: Group dashboard installment panel needs to handle the case where a user appears in multiple slots and must show aggregate total + individual Mark Paid per slot.
- **APIs**: No new endpoints required; existing contributor and installment endpoints cover the new scenarios once backend constraints are updated.
