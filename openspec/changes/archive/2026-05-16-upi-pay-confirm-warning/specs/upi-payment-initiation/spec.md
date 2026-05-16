## MODIFIED Requirements

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
