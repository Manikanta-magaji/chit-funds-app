## ADDED Requirements

### Requirement: Add a contributor slot to a group
The system SHALL allow a group admin to add a contributor slot to a group after the group has been created. Each contributor slot represents one installment obligation per cycle. A slot MUST be named (e.g., person's name or family name) and SHALL be linked to either a registered user or marked as admin-managed (offline).

#### Scenario: Add a registered user as contributor
- **WHEN** an admin searches for a registered user by partial name, partial email, or exact mobile number and adds them as a contributor slot
- **THEN** the system creates a contributor slot linked to that user's account and notifies the user

#### Scenario: No strict match found while adding contributor
- **WHEN** an admin enters a contributor name and no exact registered-user match exists
- **THEN** the system allows creating the contributor as an offline name-only slot without blocking fund operations

#### Scenario: Add an offline (admin-managed) contributor
- **WHEN** an admin creates a contributor slot without linking it to a registered account
- **THEN** the system creates an offline slot managed entirely by admins, visible in the contributor list with an "offline" indicator

#### Scenario: Contributor count limit
- **WHEN** an admin attempts to add a contributor slot when the group already has slots equal to its total cycle count
- **THEN** the system returns an error indicating the group is full

### Requirement: Shared contributor slot (sub-members)
The system SHALL allow a single contributor slot to be assigned to multiple sub-members who collectively split the installment amount. The total contribution from all sub-members MUST equal the slot's full installment amount. Each sub-member can be a registered user or an offline name.

#### Scenario: Split slot among two sub-members
- **WHEN** an admin assigns two sub-members to a contributor slot with split amounts that sum to the full installment
- **THEN** the system records both sub-members under the slot and tracks payments per sub-member

#### Scenario: Invalid split total
- **WHEN** the sum of sub-member split amounts does not equal the full installment amount
- **THEN** the system returns a validation error and does not save the split configuration

#### Scenario: Single-member slot (default)
- **WHEN** only one sub-member is assigned to a slot
- **THEN** the system treats it as a regular single-contributor slot with no splitting

#### Scenario: Strict user suggestions for sub-members
- **WHEN** an admin types sub-member identity details with at least a 500 ms pause
- **THEN** the system fires a user search matching partial name, partial email, or exact mobile number
- **AND** the admin may save a sub-member as offline name-only if no exact match is selected

### Requirement: Link offline contributor to registered account
The system SHALL allow any group admin to link an existing offline contributor slot to a registered user account at any time.

#### Scenario: Link offline slot to user
- **WHEN** an admin selects an offline contributor slot and links it to a registered user
- **THEN** the system requires a confirmation step before saving the link
- **AND** after confirmation, the system updates the slot to reference the user account
- **AND** the linked user can immediately see historical and current group cycles in their dashboard

#### Scenario: Link offline sub-member to user
- **WHEN** an admin links an offline sub-member to a registered user account
- **THEN** the system requires a confirmation step before saving
- **AND** after confirmation, the linked user immediately sees historical and current cycle participation for that mapped sub-member

### Requirement: Registration status indication for contributors and sub-members
The system SHALL clearly indicate whether each contributor slot and sub-member is linked to a registered portal user.

#### Scenario: Show registered status
- **WHEN** a contributor slot or sub-member has a linked user account
- **THEN** the UI shows it as registered

#### Scenario: Show unregistered status
- **WHEN** a contributor slot or sub-member has no linked user account
- **THEN** the UI shows it as unregistered/offline while keeping all cycle workflows available

### Requirement: Remove a contributor from a group
The system SHALL allow an admin to remove a contributor slot from a group before the first cycle starts. Removal after the group's first cycle has begun SHALL NOT be permitted.

#### Scenario: Remove before first cycle
- **WHEN** an admin removes a contributor slot before cycle 1 begins
- **THEN** the system deletes the slot and any associated sub-member records

#### Scenario: Removal blocked after cycle start
- **WHEN** an admin attempts to remove a contributor slot after the group's first cycle has started
- **THEN** the system returns an error and keeps the slot intact
