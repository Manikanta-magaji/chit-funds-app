## Requirements

### Requirement: UPI payment initiation for prize winner
The system SHALL provide a "Pay Now" button on the group dashboard after the prize draw for the current cycle has been performed and the winner has a UPI ID configured. Clicking the button SHALL open a payment modal containing a UPI QR code and a deep-link button.

When the winning slot is a single-member slot with a configured UPI ID, a single "Pay Now" button SHALL be shown. When the winning slot has multiple sub-members, one "Pay Now" button per sub-member with a configured UPI ID SHALL be shown.

If the winner (or a sub-member) has no UPI ID configured, the system SHALL display a "No UPI ID configured" notice in place of the Pay Now button for that winner/sub-member. The notice SHALL be visible to all group members (not just admins) and SHALL instruct the user to ask the winner to add their UPI ID via profile settings, or ask an admin to add it via the contributor edit modal.

#### Scenario: Pay Now button visible after draw with UPI-enabled winner
- **WHEN** a group member views the group dashboard and a prize winner has been drawn for the current cycle and the winner has a UPI ID set
- **THEN** the system displays a "Pay Now" button in the winner announcement area

#### Scenario: No UPI ID configured notice shown when winner has no UPI ID
- **WHEN** a group member views the group dashboard and a prize winner has been drawn but the winner has no UPI ID configured
- **THEN** the system displays a "No UPI ID configured" notice in place of the Pay Now button
- **AND** the notice is visible to all group members (not just admins)
- **AND** the notice instructs how to add the UPI ID (via profile settings or the contributor edit modal)

#### Scenario: Pay Now button hidden before draw
- **WHEN** a group member views the group dashboard and no prize winner has been drawn for the current cycle
- **THEN** the system does not show the Pay Now button or UPI notice

#### Scenario: No UPI notice per sub-member for shared winning slot
- **WHEN** the winning slot has multiple sub-members and one sub-member has no UPI ID
- **THEN** the system shows a Pay Now button for sub-members with a UPI ID and a "No UPI ID configured" notice for the sub-member without one

### Requirement: UPI payment QR code display
The system SHALL render a scannable QR code encoding a UPI payment URI in the format `upi://pay?pa={UPI_ID}&pn={Name}&am={Amount}&cu=INR&tn={Note}` where `pa` is the winner's UPI ID, `pn` is the winner's display name, `am` is the group's installment amount per slot, and `tn` is an auto-generated note containing the group name and cycle number.

The UPI ID and name used to build the QR code MUST be sourced from the live contributor slot data (the slots query cache), not from the draw-history snapshot. This ensures that any edits to a contributor's mobile number or UPI ID are immediately reflected in the QR code without requiring a page refresh.

The payment modal SHALL display a prominent safety warning advising the user to verify that the payee name shown in their UPI app matches the expected winner name before confirming the transfer. The warning MUST name the expected payee explicitly and MUST state that UPI payments cannot be reversed. The warning SHALL be visible at all times while the modal is open — it MUST NOT require an additional user action to reveal.

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

#### Scenario: Warning displayed in payment modal
- **WHEN** a user opens the UPI payment modal
- **THEN** a warning message is visible that instructs the user to verify the payee name in their UPI app matches the winner's name before confirming

#### Scenario: Warning names the expected payee explicitly
- **WHEN** the payment modal is open for winner "Ravi Kumar"
- **THEN** the warning text references "Ravi Kumar" so the user knows exactly which name to look for in their UPI app

#### Scenario: Warning always visible without extra interaction
- **WHEN** the payment modal is displayed
- **THEN** the warning is immediately visible without the user needing to scroll, click, or expand anything

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
