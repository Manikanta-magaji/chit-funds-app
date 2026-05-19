## ADDED Requirements

### Requirement: Admin can update UPI ID for any contributor
The system SHALL allow a group admin to update the UPI ID for any contributor slot or sub-member in their group, regardless of whether the contributor is an offline entry or a registered user.

For **offline** contributor slots and sub-members, the admin SHALL edit `ContributorSlot.upi_id` / `SubMember.upi_id` directly via the existing slot edit endpoint.

For **linked** (registered) contributor slots and sub-members, the admin SHALL update `User.upi_id` globally via the same slot edit endpoint. The system MUST write the UPI change to the user's account record, not to the slot record. The admin MUST be informed that this change affects the user's UPI ID globally (not just within this group).

#### Scenario: Admin edits UPI for offline contributor slot
- **WHEN** an admin opens the edit modal for an offline contributor slot and changes the UPI ID
- **THEN** the system updates `ContributorSlot.upi_id` and immediately reflects the new UPI in the Pay Now QR code for that slot

#### Scenario: Admin edits UPI for linked contributor slot
- **WHEN** an admin opens the edit modal for a linked (registered) contributor slot and changes the UPI ID
- **THEN** the system updates `User.upi_id` on the linked user's account
- **AND** the change is reflected globally for that user across all groups

#### Scenario: Admin edits UPI for offline sub-member
- **WHEN** an admin opens the edit modal for an offline sub-member and changes the UPI ID
- **THEN** the system updates `SubMember.upi_id` and immediately reflects the new UPI in the Pay Now QR code for that sub-member

#### Scenario: Admin edits UPI for linked sub-member
- **WHEN** an admin opens the edit modal for a linked sub-member and changes the UPI ID
- **THEN** the system updates `User.upi_id` on the linked user's account globally

#### Scenario: Edit Contributor modal shows UPI-only form for linked contributors
- **WHEN** an admin opens the edit modal for a contributor slot or sub-member that is linked to a registered user
- **THEN** the modal shows only the UPI ID field (not name or mobile number)
- **AND** the modal displays a notice indicating the change will update this person's UPI ID globally
