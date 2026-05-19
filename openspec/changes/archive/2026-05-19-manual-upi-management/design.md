## Context

UPI IDs are currently auto-derived in two places in the codebase:

1. **Profile setup** (`users.py`): if a user does not supply a UPI ID, the system stores `<mobile>@upi`
2. **Prize draw resolution** (`draw.py` `_resolve_upi()`): if neither the linked user nor the offline slot has an explicit UPI ID, the system derives `<mobile>@upi` at render time

Additionally, the frontend `EditContributorModal` auto-populates the UPI field as the user types a mobile number (`inferUpi()`).

The problem is that `<mobile>@upi` is a pattern used by some UPI apps (primarily BHIM) but not all — many users' actual handles are `name@bank` or similar. Silent derivation creates QR codes that route to the wrong or non-existent handle.

There is also a structural gap: when a contributor slot is linked to a registered user, the admin has no way to update that user's UPI ID. The slot edit endpoint writes to `ContributorSlot.upi_id`, but `_resolve_upi` ignores that and always reads `User.upi_id` when a linked user exists.

## Goals / Non-Goals

**Goals:**
- Remove all `mobile@upi` derivation from backend and frontend
- Allow admins to update `User.upi_id` for any linked contributor in their group
- Retain admin ability to set UPI for offline slots/sub-members (already works)
- Allow registered users to update their own UPI via profile settings (already works)
- Make UPI optional for profile completion
- Show a clear "No UPI ID configured" notice when a winner has no UPI, instead of silently hiding Pay Now

**Non-Goals:**
- UPI ID validation/verification (format checking only, no live API validation)
- Migrating or clearing previously auto-derived UPI values stored in the database
- Role-based access beyond "group admin" for the global UPI edit

## Decisions

### Decision 1: Admin UPI edit for linked users is a global write to `User.upi_id`

**Chosen**: When an admin edits the UPI ID for a linked contributor slot, the backend writes the value to `User.upi_id` directly, not to `ContributorSlot.upi_id`.

**Rationale**: UPI is a personal payment address — it belongs to the person, not to their slot in a specific fund. A group-scoped per-slot override would be confusing and inconsistent with how `_resolve_upi` reads `User.upi_id` as the first-priority source.

**Alternative considered**: Flip `_resolve_upi` priority so `ContributorSlot.upi_id` beats `User.upi_id`, and write to the slot. Rejected because it would allow admin of one group to silently override the UPI visible in another group without touching the user's profile.

**Authorization**: The caller must be a group admin of the group the slot belongs to. No cross-group admin restriction — any group admin can update UPI for any contributor in their group, which will globally affect that user.

### Decision 2: Slot edit endpoint cascades to `User.upi_id` when slot is linked

**Chosen**: The existing `PUT /api/groups/{gid}/slots/{sid}` endpoint (and the sub-member equivalent) detects whether the slot has a `linked_user_id`. If yes, the `upi_id` field in the request body writes to `User.upi_id` instead of `ContributorSlot.upi_id`.

**Rationale**: No new endpoint needed. The admin edit surface (Edit Contributor modal) stays the same. The backend handles the routing transparently.

**Side note**: Since `ContributorSlot.upi_id` is only meaningful for offline slots, the value will remain `null` for linked slots. `_resolve_upi` is unchanged except for the removal of the `mobile@upi` fallback.

### Decision 3: EditContributorModal splits behavior for offline vs linked slots

**Chosen**: When the target slot/sub-member is linked to a registered user, the modal shows only the UPI ID field (with a note: "This will update [name]'s UPI ID globally"). For offline slots/sub-members, the full form (name, mobile, UPI) is shown as before.

**Rationale**: Name and mobile are the user's own profile fields — admin should not edit those. Showing a restricted form avoids confusion and prevents accidental changes to a registered user's name.

### Decision 4: UPI not required for profile completion

**Chosen**: `is_profile_complete` is set to `true` when the user has a display name and mobile number, regardless of UPI ID.

**Rationale**: UPI is only needed when the user wins. Blocking access to the app over a missing UPI is disproportionate and creates friction for first-time users.

### Decision 5: No data migration for existing auto-derived UPI values

**Chosen**: Existing `upi_id` values that were auto-derived from mobile numbers are left as-is.

**Rationale**: They may be correct for some users (those using BHIM). Users and admins can update them manually. A migration that nullifies all `mobile@upi` values risks breaking functional payment flows for users where the derived value was actually correct.

## Risks / Trade-offs

- **Admin can change another user's UPI globally** → Any group admin can update a member's `User.upi_id`. For a chit fund context, admins are trusted participants. Acceptable risk.
- **Existing auto-derived values persist** → Some values like `91XXXXXXXXXX@upi` may be incorrect. Left to users/admins to fix manually. No automated notification.
- **`winner-payout-submember-mobile` conflict** → The in-progress change adds a "UPI handle derivation for offline winners" delta spec requirement. That requirement directly contradicts this change. The conflicting delta spec must be removed from `winner-payout-submember-mobile` before it is synced to main specs.

## Migration Plan

No schema migration needed — all fields exist and are nullable. Deployment is a drop-in backend + frontend update.

Rollback: revert commits. No state changes to undo (no migration, no data modification).

## Open Questions

- Should we add a visible indicator on the Edit Contributor modal that the UPI ID was auto-derived (e.g., a "derived from mobile" badge) to prompt users to verify? Not in scope for this change but worth tracking.
