## 1. Frontend Dependency

- [x] 1.1 Install `qrcode.react` npm package in the frontend (`npm install qrcode.react`)
- [x] 1.2 Verify TypeScript types are available (`@types/qrcode.react` or bundled types)

## 2. UpiPaymentModal Component

- [x] 2.1 Create `frontend/src/components/UpiPaymentModal.tsx`
- [x] 2.2 Accept props: `winnerName: string`, `winnerUpiId: string`, `amount: number`, `groupName: string`, `cycleNumber: number`, `onClose: () => void`
- [x] 2.3 Construct the UPI URI: `upi://pay?pa={winnerUpiId}&pn={encodedName}&am={amount}&cu=INR&tn={encodedNote}` (URL-encode `pn` and `tn`)
- [x] 2.4 Render a `<QRCode>` from `qrcode.react` with the UPI URI as its value
- [x] 2.5 Render an `<a href={upiUri}>` styled as a button with label "Open in UPI App" below the QR code
- [x] 2.6 Add modal backdrop and close button; close on backdrop click or Esc key
- [x] 2.7 Add note copy: "Scan the QR code or tap the button to pay via your UPI app. On desktop, use the QR code with your phone."
- [x] 2.8 Add sub-note: "Verify amount with your group admin if you share a slot."

## 3. GroupDashboardPage Integration

- [x] 3.1 Identify where the winner's name/slot is displayed in `GroupDashboardPage.tsx`
- [x] 3.2 Retrieve the winner's `upi_id` and `display_name` from existing draw result data (or fetch via group members list if not already present)
- [x] 3.3 Add state: `showPayModal: boolean`
- [x] 3.4 Render "Pay Now" button next to the winner's name — only when `winnerSlotId` is set and winner has a non-empty `upi_id`
- [x] 3.5 Render `<UpiPaymentModal>` when `showPayModal` is true, passing winner UPI details, group name, installment amount, and current cycle number
- [x] 3.6 Hide Pay Now button (show UPI-not-configured notice to admin) when winner has no UPI ID

## 4. Styles

- [x] 4.1 Add `.upi-modal` styles to `index.css`: centered overlay, white card, max-width 360px
- [x] 4.2 Add `.btn-upi` style: primary green button for "Open in UPI App"
- [x] 4.3 Ensure QR code is centered and has adequate padding within the modal card

## 5. Testing and Validation

- [x] 5.1 Manually test QR code scan on a mobile device — confirm UPI app opens with pre-filled details
- [x] 5.2 Manually test "Open in UPI App" deep-link on Android/iOS
- [x] 5.3 Verify Pay Now button is hidden when no winner is drawn
- [x] 5.4 Verify Pay Now button is hidden when winner has no UPI ID
- [x] 5.5 Verify modal closes on backdrop click and Esc key
- [x] 5.6 Verify UPI URI encoding is correct for names/notes with spaces and special characters
