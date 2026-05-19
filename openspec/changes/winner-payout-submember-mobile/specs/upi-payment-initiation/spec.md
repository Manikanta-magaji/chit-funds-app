## MODIFIED Requirements

### Requirement: UPI payment initiation for prize winner
The system SHALL provide a "Pay Now" button on the group dashboard after the prize draw for the current cycle has been performed and the winner has a UPI ID configured. When the winning slot is a single-member slot, clicking the button SHALL open a payment modal with a UPI QR code and deep-link button for that winner. When the winning slot has multiple sub-members, the system SHALL display one "Pay Now" button per sub-member (see `winner-submember-payout` spec) rather than a single button for the slot.

#### Scenario: Pay Now button visible after draw — single-member winning slot with UPI
- **WHEN** a group member views the group dashboard and a prize winner has been drawn for the current cycle and the winning slot is a single-member slot whose member has a UPI ID set
- **THEN** the system displays a single "Pay Now" button in the winner announcement area

#### Scenario: Pay Now button replaced by per-sub-member buttons for shared winning slot
- **WHEN** a group member views the group dashboard and the winning slot has two or more sub-members
- **THEN** the system replaces the single Pay Now button with one Pay Now button per sub-member who has a resolvable UPI

#### Scenario: Pay Now button hidden when winner has no UPI ID
- **WHEN** a group member views the group dashboard and a prize winner has been drawn but the winner's UPI ID is null or empty
- **THEN** the system hides the "Pay Now" button and shows a notice that the winner has no UPI ID configured

#### Scenario: Pay Now button hidden before draw
- **WHEN** a group member views the group dashboard and no prize winner has been drawn for the current cycle
- **THEN** the system does not show the "Pay Now" button
