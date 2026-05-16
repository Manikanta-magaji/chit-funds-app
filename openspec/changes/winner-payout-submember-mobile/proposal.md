## Why

When a winning contributor slot is shared among multiple sub-members, the current system only shows a single "Pay Now" button that targets the slot as a whole, making it unclear how each sub-member should receive their share of the payout. Additionally, offline (non-registered) contributors added without a mobile number cannot participate in UPI-based payouts because a mobile number is required to generate a valid UPI intent URL — meaning admins discover this gap only at payout time.

## What Changes

- When the winning slot has sub-members, the Pay Now UI displays a separate "Pay Now" button for each sub-member, each targeting that sub-member's UPI ID and proportional payout share.
- When adding an offline (non-registered) contributor as a full-slot contributor or sub-member, the mobile number field becomes mandatory (previously optional/absent).
- The UPI payment modal is updated to accommodate per-sub-member UPI generation when the winner is a shared slot.
- Backend contributor-creation and sub-member-creation endpoints enforce mobile number for offline entries.
- When a new user completes registration (email/password or OAuth mobile setup), the backend automatically links their account to any offline contributor slots or sub-members whose stored mobile number matches the registering user's mobile.

## Capabilities

### New Capabilities
- `winner-submember-payout`: Capability for displaying per-sub-member Pay Now options when the prize-winning slot is a shared slot with multiple sub-members. Each sub-member's button encodes their individual UPI ID, name, and proportional payout amount.

### Modified Capabilities
- `contributor-management`: Offline contributor and sub-member creation now requires a mobile number (mandatory field). The field was previously optional or absent for offline entries.
- `upi-payment-initiation`: The Pay Now UI is extended to render one UPI button per sub-member when the winner slot has sub-members, rather than a single button for the whole slot.
- `mobile-auth`: After a user is created (registration or OAuth mobile setup), the system auto-links their account to any offline contributor slots and sub-members whose stored mobile number matches.

## Impact

- **Frontend**: `GroupDashboardPage.tsx`, `UpiPaymentModal.tsx` — winner announcement area must iterate sub-members and render per-sub-member Pay Now controls; contributor add forms must add a required mobile field for offline entries.
- **Backend**: `routers/groups.py` (or contributors router) — validate mobile is present when adding an offline contributor or sub-member; `routers/payouts.py` — return sub-member UPI details in winner payload.
- **API**: Winner payout response needs to include sub-member breakdown (UPI ID, name, share amount) when the winning slot is a shared slot.
- **Data**: New `mobile_number` and `upi_id` columns on `contributor_slots` and `sub_members` (both nullable, Alembic migration required).
- **Registration flow**: `routers/auth.py` register endpoint and OAuth mobile-setup endpoint — after persisting a new user, query offline slots/sub-members by mobile and set `linked_user_id`.
