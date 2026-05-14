## Why

When a user holds multiple contributor positions in a chit fund group — either as two separate full-slot contributors, or as one full-slot contributor plus a sub-member share in another slot — clicking "Pay Now" currently opens a UPI payment modal showing only the single installment amount. This causes under-payment confusion: the user pays once and assumes they are done, when in fact they owe for each of their positions.

## What Changes

- The "Pay Now" button's amount calculation accounts for all of the current user's contributor positions in the group for the current cycle
- Positions that are already marked as paid are excluded from the total (only unpaid amounts are shown)
- If only one position is unpaid, the amount is the same as today — no behavior change for single-position users
- A breakdown of each position (slot name + amount) is shown in the UPI modal so the user knows what they are paying for
- The UPI deep-link and QR code are generated with the consolidated total amount

## Capabilities

### New Capabilities
- `multi-slot-pay-now`: Consolidated payment amount calculation and display for users with multiple contributor positions in a group

### Modified Capabilities
- `installment-tracking`: The Pay Now flow now considers the total unpaid amount across all of a user's positions, not a flat per-slot amount

## Impact

- **Frontend only** — no backend changes required; all position/payment status data is already available in the existing `slots` + `installments` API responses
- `GroupDashboardPage.tsx` — amount passed to `UpiPaymentModal` changes from `group.installment_amount` to a computed total
- `UpiPaymentModal.tsx` — optionally receives and displays a per-position breakdown
- No API changes, no migration needed
