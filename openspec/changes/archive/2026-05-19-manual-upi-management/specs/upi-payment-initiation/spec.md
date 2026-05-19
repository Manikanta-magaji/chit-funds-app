## MODIFIED Requirements

### Requirement: UPI payment initiation for prize winner
The system SHALL provide a "Pay Now" button on the group dashboard after the prize draw for the current cycle has been performed and the winner has a UPI ID configured. Clicking the button SHALL open a payment modal containing a UPI QR code and a deep-link button.

When the winning slot is a single-member slot with a configured UPI ID, a single "Pay Now" button SHALL be shown. When the winning slot has multiple sub-members, one "Pay Now" button per sub-member with a configured UPI ID SHALL be shown.

If the winner (or a sub-member) has no UPI ID configured, the system SHALL display a "No UPI ID configured" notice in place of the Pay Now button for that winner/sub-member. The notice SHALL instruct the user to ask the winner to add their UPI ID via profile settings, or an admin to add it via the contributor edit modal.

#### Scenario: Pay Now button visible after draw with UPI-enabled winner
- **WHEN** a group member views the group dashboard and a prize winner has been drawn for the current cycle and the winner has a UPI ID set
- **THEN** the system displays a "Pay Now" button in the winner announcement area

#### Scenario: No UPI notice shown when winner has no UPI ID
- **WHEN** a group member views the group dashboard and a prize winner has been drawn but the winner has no UPI ID configured
- **THEN** the system displays a "No UPI ID configured" notice in place of the Pay Now button
- **AND** the notice instructs how to add the UPI ID (via profile settings or the contributor edit modal)

#### Scenario: Pay Now button hidden before draw
- **WHEN** a group member views the group dashboard and no prize winner has been drawn for the current cycle
- **THEN** the system does not show the Pay Now button or UPI notice

#### Scenario: No UPI notice per sub-member for shared winning slot
- **WHEN** the winning slot has multiple sub-members and one sub-member has no UPI ID
- **THEN** the system shows a Pay Now button for sub-members with a UPI ID and a "No UPI ID configured" notice for the sub-member without one

## REMOVED Requirements

### Requirement: UPI handle derivation for offline winners
**Reason**: UPI handles are not reliably derived from mobile numbers. `<mobile>@upi` is specific to BHIM and does not apply universally. Silent derivation produces incorrect QR codes. UPI IDs must now be provided explicitly.
**Migration**: Admins should add explicit UPI IDs for offline contributors via the contributor edit modal. Existing stored values (previously auto-derived) are retained and can be corrected manually.
