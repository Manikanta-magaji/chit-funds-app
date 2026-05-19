## Why

UPI IDs are currently auto-derived from mobile numbers (`<mobile>@upi`) during profile setup and prize draw resolution. This derivation is unreliable — not every user's UPI handle matches their mobile number — and creates silent misrouted payment QR codes. UPI IDs should only be stored when explicitly provided by the user or an admin.

## What Changes

- **Remove UPI auto-derivation** from profile setup: if no UPI ID is provided, store `null` instead of inferring `<mobile>@upi`
- **Remove `mobile@upi` fallback** from prize draw UPI resolution (`_resolve_upi`)
- **Remove frontend auto-inference** in the Edit Contributor modal: mobile number changes no longer auto-populate the UPI field
- **UPI ID is no longer required for profile completion**: a user can complete their profile with just display name and mobile number
- **Admin can update UPI ID for any contributor** regardless of whether they are registered or offline:
  - Offline slot / sub-member: writes to `ContributorSlot.upi_id` / `SubMember.upi_id` (already possible, no change)
  - Registered/linked contributor: writes to `User.upi_id` globally via the slot edit endpoint
- **Registered user can update their own UPI ID** via profile settings (already possible, just no longer inferred)
- **"Pay Now" button absent when winner has no UPI**: replaced with a clear "No UPI ID configured" notice instead of silently hiding; the notice tells the admin or winner to add a UPI ID first

## Capabilities

### New Capabilities

- None

### Modified Capabilities

- `contributor-management`: Admin can now update UPI ID for a linked (registered) contributor slot, writing the change globally to `User.upi_id`; the Edit Contributor modal separates UPI-only editing for linked slots from full name/mobile/UPI editing for offline slots
- `upi-payment-initiation`: UPI ID derivation from mobile is removed; when winner has no UPI ID the UI shows an explicit "No UPI ID configured" notice rather than hiding the Pay Now button silently
- `user-auth`: UPI ID is no longer a required field for profile completion; `is_profile_complete` is set to `true` with only display name and mobile number provided

## Impact

- **Backend**: `backend/app/routers/users.py` (profile update), `backend/app/routers/draw.py` (`_resolve_upi`), `backend/app/routers/slots.py` (slot update cascades UPI to `User.upi_id` when linked)
- **Frontend**: `EditContributorModal.tsx` (remove `inferUpi`, split offline vs linked behavior), `UpiPaymentModal.tsx` / group dashboard (no-UPI notice), profile setup page (UPI no longer required)
- **Conflict**: The in-progress `winner-payout-submember-mobile` change added a "UPI handle derivation for offline winners" requirement in its delta spec for `upi-payment-initiation`. That requirement must be reversed before or during this change.
- **Existing data**: Users with previously auto-derived `upi_id` values retain those values — no migration needed; they can update them manually if wrong.
