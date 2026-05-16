## Why

UPI payments are irrevocable once sent. Non-technical users may scan a QR code or tap "Open in UPI App" without confirming that the displayed name in their UPI app matches the actual winner — this is especially risky when a fund has contributors who share similar names or when a UPI ID is misconfigured. A brief confirmation prompt before the payment is initiated reduces the risk of accidental mis-payments.

## What Changes

- When a user clicks "Open in UPI App" in the UPI payment modal, a confirmation warning is shown asking them to verify the payee name in their UPI app before confirming the transfer.
- The warning communicates that UPI payments cannot be reversed and that the user should match the name shown in their UPI app against the expected winner name.
- The warning is shown as an inline notice in the modal, positioned between the QR code section and the "Open in UPI App" button, so it is seen before any action is taken.

## Capabilities

### New Capabilities

### Modified Capabilities
- `upi-payment-initiation`: UPI payment modal now displays a verification warning before the user initiates payment, advising them to confirm the payee name in their UPI app.

## Impact

- `frontend/src/components/UpiPaymentModal.tsx` — add warning text near the "Open in UPI App" button.
- No backend changes. No API changes. No new dependencies.
