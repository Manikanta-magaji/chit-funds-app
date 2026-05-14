## Requirements

### Requirement: User holds multiple contributor positions in the same group
The system SHALL allow a single registered user to be linked to more than one contributor position within the same group. A position is either a primary contributor slot or a sub-member entry on a shared slot. There is no upper limit on the number of positions a user may hold, subject to available slot capacity in the group.

#### Scenario: User added as two full contributor slots
- **WHEN** an admin adds a registered user as the linked account for two separate contributor slots in the same group
- **THEN** the system creates both slots successfully and both appear in the contributor list linked to that user

#### Scenario: User is both a primary slot and a sub-member
- **WHEN** an admin links a registered user to one primary contributor slot and also adds them as a sub-member of another slot in the same group
- **THEN** the system saves both associations and the user sees both positions when viewing the group

#### Scenario: Admin warned on duplicate user assignment
- **WHEN** an admin attempts to link a user to a slot in a group where the user is already linked to another slot or sub-member entry
- **THEN** the system displays a warning: "This user is already a contributor in this group. Do you want to add them to another slot?"
- **AND** the admin must explicitly confirm before the assignment is saved

#### Scenario: Assignment proceeds after admin confirmation
- **WHEN** an admin confirms the duplicate-user warning
- **THEN** the system saves the new slot assignment and the user is now linked to multiple positions in the group

### Requirement: Aggregate installment view for multi-slot members
When a logged-in member holds more than one contributor position in a group, the group dashboard installment panel MUST show their combined installment obligation for the current cycle alongside the individual per-slot breakdown.

#### Scenario: Multi-slot member views group dashboard
- **WHEN** a logged-in user who holds two slots in a group navigates to the group dashboard
- **THEN** the installment panel shows a summary row: "You have 2 slots in this group — Total due: ₹<sum>"
- **AND** each individual slot is listed below the summary with its own payment status and Mark Paid action

#### Scenario: Single-slot member view unchanged
- **WHEN** a logged-in user who holds exactly one position in a group views the group dashboard
- **THEN** no summary row is shown and the display is identical to the existing single-slot experience

#### Scenario: Partially paid multi-slot member
- **WHEN** a multi-slot member has paid one slot but not another for the current cycle
- **THEN** the summary row shows the remaining unpaid amount and the paid slot is marked as paid in the breakdown

### Requirement: Multi-slot draw eligibility
A registered user who holds N contributor positions in a group SHALL have N independent draw entries — one per slot they are linked to. Each slot is treated as a distinct draw participant regardless of the account it is linked to.

#### Scenario: User with two slots has two draw entries
- **WHEN** the admin initiates the prize draw for a cycle in which a user holds two slots
- **THEN** both slots appear as separate eligible entries in the draw pool, giving the user two chances to be selected

#### Scenario: One of the user's slots wins
- **WHEN** one of a multi-slot user's slots is drawn as the prize winner for a cycle
- **THEN** that specific slot is marked as the winner and becomes ineligible for future draws
- **AND** the user's other slot(s) remain eligible for future cycles

#### Scenario: Draw pool excludes already-won slots only
- **WHEN** a multi-slot user's slot has already won in a previous cycle
- **THEN** only that winning slot is removed from the draw pool; the user's remaining slots stay eligible
