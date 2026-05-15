## Context

The chit fund app currently tracks payments but provides no way to initiate a UPI payment to the prize winner from within the app. After the draw is performed, contributors must manually look up the winner's UPI ID and switch to a separate UPI app to pay. The winner's UPI ID and display name are already stored in the backend (`User.upi_id`, `User.display_name`) and returned as part of draw results. The group's installment amount is part of the group record. This change adds a frontend-only UPI payment initiation flow using standard QR code and deep-link URI techniques.

## Goals / Non-Goals

**Goals:**
- Show a "Pay Now" button after a winner has been drawn for the current cycle
- Render a scannable UPI QR code encoding `upi://pay?pa={UPI_ID}&pn={Name}&am={Amount}&cu=INR&tn={Note}`
- Provide a "Open in UPI App" button using the same URI as an anchor/link to trigger the UPI deep-link on mobile
- Compose the transaction note automatically from the group name and cycle number
- Work with the winner's existing UPI ID stored in their profile

**Non-Goals:**
- Actual payment processing or UPI transaction verification
- Backend changes or new API endpoints
- Tracking payment status through the UPI deep-link (existing Mark Paid flow handles that)
- Generating QR codes server-side
- Handling UPI callback or confirming payment completion

## Decisions

### 1. QR code generated client-side using `qrcode.react`
**Decision**: Use the `qrcode.react` npm library to render a `<QRCode>` SVG/canvas element directly in the browser.  
**Rationale**: No backend involvement needed; the UPI URI is fully constructable from data already in the frontend. `qrcode.react` is a well-maintained, zero-backend QR solution.  
**Alternative considered**: Generating QR server-side — adds unnecessary backend complexity for what is purely a display concern.

### 2. UPI deep-link as a standard `<a href>` element
**Decision**: Render the "Open in UPI App" button as an `<a href="upi://pay?...">` anchor tag styled as a button.  
**Rationale**: The `upi://` scheme is the standard Android/iOS intent for UPI apps (PhonePe, GPay, Paytm, etc.). An anchor tag with this href will trigger the OS intent chooser on mobile without any JavaScript bridge. On desktop where no UPI handler is registered, the link simply does nothing, which is acceptable.  
**Alternative considered**: `window.location.href` assignment — same behavior but less semantic and not accessible.

### 3. Payment modal displayed in `GroupDashboardPage`
**Decision**: Add the Pay Now button inside the draw result section of `GroupDashboardPage` (the area that shows the winner's name). Clicking it opens a modal (`UpiPaymentModal`) that contains the QR code and deep-link button.  
**Rationale**: The draw result section is the natural context where payment intent is highest. A modal keeps it contained without a full page transition.  
**Alternative considered**: Embedding directly in `InstallmentPanel` — less discoverable there since users look for the winner in the dashboard area.

### 4. Transaction note format
**Decision**: `tn` parameter set to `"Chit fund payment - {group name} cycle {N}"`.  
**Rationale**: Descriptive enough for the payer's UPI transaction history without requiring extra user input.

### 5. Pay Now button visible to all group members (not admin-only)
**Decision**: The Pay Now button is visible to any authenticated group member once a winner has been drawn for the current cycle.  
**Rationale**: Any contributor needs to pay the winner, not just admins.

## Risks / Trade-offs

- **UPI deep-link only works on mobile** → On desktop browsers the `upi://` URI has no handler and will silently fail. The QR code is the primary payment path; the deep-link is supplemental for mobile users. Document this in UI copy.
- **Winner may not have a UPI ID set** → Mitigation: Show a warning in the modal if `upi_id` is null/empty; hide Pay Now button entirely in that case. Prompt admin to update the winner's profile.
- **QR code scanning exposes UPI ID** → UPI IDs are semi-public by design (they are shared for payment purposes). This is acceptable per UPI spec.
- **Amount shown is installment amount, not actual owed amount** → Sub-member splits are not factored in. Mitigation: Show a note "Verify amount with your group admin if you share a slot."

## Migration Plan

1. Install `qrcode.react` in the frontend.
2. Create `UpiPaymentModal` component.
3. Update `GroupDashboardPage` to show Pay Now button when `winnerSlotId` is set and winner has a UPI ID.
4. No backend changes, no database migrations, no deployment coordination needed.
