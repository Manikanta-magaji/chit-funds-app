## 1. Warning UI in UpiPaymentModal

- [x] 1.1 In `frontend/src/components/UpiPaymentModal.tsx`, add a `<p className="upi-warn">` element above the "Open in UPI App" button that reads: "Before paying, check that the name shown in your UPI app matches **{winnerName}**. UPI payments cannot be reversed."
- [x] 1.2 Ensure the winner name is rendered in bold (`<strong>`) within the warning text

## 2. Styling for Warning

- [x] 2.1 In `frontend/src/index.css` (or the UPI modal stylesheet), add a `.upi-warn` CSS rule with a visually distinct amber/warning appearance (e.g., amber background tint, left border accent, and appropriate padding) to make the warning stand out from regular note text

## 3. Verification

- [x] 3.1 Open the UPI payment modal for a winner and confirm the warning is visible above the "Open in UPI App" button with the winner's name in bold
- [x] 3.2 Confirm the warning is visible immediately without scrolling or extra interaction
