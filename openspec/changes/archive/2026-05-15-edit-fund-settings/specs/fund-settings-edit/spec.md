## ADDED Requirements

### Requirement: Edit fund settings
The system SHALL allow any group admin to edit fund settings after the group has been created. The fund name SHALL be editable at any time. The monthly installment amount and total number of cycles SHALL only be editable before the first prize winner has been declared for the group. Once a winner has been declared for any cycle, the installment amount and cycle count SHALL be locked and cannot be modified.

#### Scenario: Admin edits fund name at any time
- **WHEN** a group admin updates the fund name
- **THEN** the system saves the new name and all views immediately reflect the updated name

#### Scenario: Admin edits installment amount before first winner
- **WHEN** a group admin updates the installment amount before any cycle has a confirmed winner
- **THEN** the system saves the new amount and it applies to all future cycles

#### Scenario: Admin edits cycle count before first winner
- **WHEN** a group admin updates the total number of cycles before any cycle has a confirmed winner
- **THEN** the system saves the new cycle count, provided the new value is not less than the current number of contributor slots

#### Scenario: Cycle count cannot be set below existing slot count
- **WHEN** a group admin submits a total cycle count lower than the current number of contributor slots
- **THEN** the system returns a validation error and does not save the change

#### Scenario: Financial fields locked after first winner
- **WHEN** a group admin attempts to edit the installment amount or cycle count after a prize winner has been declared in any cycle
- **THEN** the system returns an error and does not save the change
- **AND** the UI displays those fields as read-only with a lock indicator

#### Scenario: Locked fields shown as read-only in UI
- **WHEN** a group admin views the fund settings after the first winner has been declared
- **THEN** the installment amount and cycle count fields are displayed as read-only with a 🔒 indicator
- **AND** the fund name field remains editable
