## Why

Contributors need a fast, frictionless way to pay the prize winner after a draw is performed. Currently the app tracks payments but provides no payment initiation mechanism, requiring participants to look up the winner's UPI ID manually and switch apps. Adding in-app UPI payment initiation reduces friction and error.

## What Changes

- Add a **"Pay Now"** button on the prize draw result view (visible after a winner is drawn) that opens a payment modal/panel.
- The payment panel shows a **QR code** generated from the winner's UPI payment URI so payers can scan it with any UPI app.
- Below the QR code, a **"Open in UPI App"** button encodes the payment intent as a `upi://pay?...` deep-link URL that opens a UPI-capable app directly on the device.
- The UPI URI is composed from the winner's stored UPI ID, display name, the group's installment amount, and a descriptive transaction note.
- No actual payment processing occurs — the feature initiates payment intent only; recording the payment is still done via the existing Mark Paid flow.

## Capabilities

### New Capabilities

- `upi-payment-initiation`: In-app UPI payment initiation via QR code and deep-link for paying the prize winner after a draw.

### Modified Capabilities

*(none — existing installment tracking and prize draw requirements are unchanged)*

## Impact

- **Frontend**: New `UpiPaymentModal` component; `GroupDashboardPage` and/or `InstallmentPanel` updated to show the Pay Now button after a winner is drawn.
- **Backend**: No new endpoints required. Winner's UPI ID and display name are already returned by existing draw/slot APIs.
- **Dependencies**: QR code generation library needed on the frontend (e.g., `qrcode.react`).
- **APIs**: UPI deep-link format: `upi://pay?pa={UPI_ID}&pn={Name}&am={Amount}&cu=INR&tn={Note}` — standard UPI intent URL, no backend changes.
