## Requirements

### Requirement: UPI payment initiation for prize winner
The system SHALL provide a "Pay Now" button on the group dashboard after the prize draw for the current cycle has been performed and the winner has a UPI ID configured. Clicking the button SHALL open a payment modal containing a UPI QR code and a deep-link button.

#### Scenario: Pay Now button visible after draw with UPI-enabled winner
- **WHEN** a group member views the group dashboard and a prize winner has been drawn for the current cycle and the winner has a UPI ID set
- **THEN** the system displays a "Pay Now" button in the winner announcement area

#### Scenario: Pay Now button hidden when winner has no UPI ID
- **WHEN** a group member views the group dashboard and a prize winner has been drawn but the winner's UPI ID is null or empty
- **THEN** the system hides the "Pay Now" button and shows a notice that the winner has no UPI ID configured

#### Scenario: Pay Now button hidden before draw
- **WHEN** a group member views the group dashboard and no prize winner has been drawn for the current cycle
- **THEN** the system does not show the "Pay Now" button

### Requirement: UPI payment QR code display
The system SHALL render a scannable QR code encoding a UPI payment URI in the format `upi://pay?pa={UPI_ID}&pn={Name}&am={Amount}&cu=INR&tn={Note}` where `pa` is the winner's UPI ID, `pn` is the winner's display name, `am` is the group's installment amount per slot, and `tn` is an auto-generated note containing the group name and cycle number.

The UPI ID and name used to build the QR code MUST be sourced from the live contributor slot data (the slots query cache), not from the draw-history snapshot. This ensures that any edits to a contributor's mobile number or UPI ID are immediately reflected in the QR code without requiring a page refresh.

#### Scenario: QR code reflects updated UPI ID without page refresh
- **WHEN** an admin edits a contributor's or sub-member's UPI ID or mobile number via the Edit Contributor modal
- **THEN** the next time the Pay Now button is opened for that winner, the QR code encodes the updated UPI ID
- **AND** no page refresh is required for the updated value to appear

#### Scenario: QR code rendered in payment modal
- **WHEN** a group member opens the payment modal via the Pay Now button
- **THEN** the system displays a QR code encoding the full UPI payment URI with the winner's UPI ID, display name, installment amount, and a transaction note of the form "Chit fund payment - {group name} cycle {N}"

#### Scenario: QR code reflects correct installment amount
- **WHEN** the QR code is generated
- **THEN** the amount encoded in the URI equals the group's installment amount per contributor slot

### Requirement: UPI deep-link payment button
The system SHALL provide a button labeled "Open in UPI App" below the QR code in the payment modal. This button SHALL be implemented as an anchor tag with `href="upi://pay?..."` using the same URI parameters as the QR code. On mobile devices, clicking this button SHALL invoke the OS UPI app intent chooser.

#### Scenario: Open in UPI App triggers app chooser on mobile
- **WHEN** a user on a mobile device clicks the "Open in UPI App" button
- **THEN** the operating system presents the UPI app intent chooser (e.g., PhonePe, GPay, Paytm)

#### Scenario: Open in UPI App on desktop
- **WHEN** a user on a desktop browser clicks the "Open in UPI App" button
- **THEN** the browser attempts to follow the `upi://` URI; if no handler is registered, the click has no visible effect

#### Scenario: Deep-link URI matches QR code URI
- **WHEN** a user views the payment modal
- **THEN** the URI encoded in the QR code and the URI in the "Open in UPI App" button's href SHALL be identical
