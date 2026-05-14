## MODIFIED Requirements

### Requirement: Add a contributor slot to a group
The system SHALL allow a group admin to add a contributor slot to a group after the group has been created. Each contributor slot represents one installment obligation per cycle. A slot MUST be named (e.g., person's name or family name) and SHALL be linked to either a registered user or marked as admin-managed (offline). The same registered user MAY be linked to more than one slot within the same group; the system SHALL warn the admin before confirming such an assignment.

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

#### Scenario: Admin adds user already linked to another slot
- **WHEN** an admin selects a registered user who is already linked to at least one slot or sub-member entry in the same group
- **THEN** the system displays a warning before saving and requires the admin to explicitly confirm the multi-slot assignment

### Requirement: Shared contributor slot (sub-members)
The system SHALL allow a single contributor slot to be assigned to multiple sub-members who collectively split the installment amount. The total contribution from all sub-members MUST equal the slot's full installment amount. Each sub-member can be a registered user or an offline name. A registered user MAY appear as a sub-member in more than one slot within the same group.

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

#### Scenario: Admin adds sub-member already present elsewhere in the group
- **WHEN** an admin adds a registered user as a sub-member to a slot where that user is already linked to another slot or sub-member entry in the same group
- **THEN** the system displays a warning and requires explicit confirmation before saving
