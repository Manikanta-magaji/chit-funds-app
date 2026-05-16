## MODIFIED Requirements

### Requirement: Add a contributor slot to a group
The system SHALL allow a group admin to add a contributor slot to a group after the group has been created. Each contributor slot represents one installment obligation per cycle. A slot MUST be named (e.g., person's name or family name) and SHALL be linked to either a registered user or marked as admin-managed (offline). When creating an offline slot, the admin MUST provide a mobile number; this is required for UPI payment intent generation. The same registered user MAY be linked to more than one slot within the same group; the system SHALL warn the admin before confirming such an assignment.

#### Scenario: Add a registered user as contributor
- **WHEN** an admin searches for a registered user by partial name, partial email, or exact mobile number and adds them as a contributor slot
- **THEN** the system creates a contributor slot linked to that user's account and notifies the user

#### Scenario: No strict match found while adding contributor
- **WHEN** an admin enters a contributor name and no exact registered-user match exists
- **THEN** the system prompts the admin to enter a mobile number before saving the offline slot

#### Scenario: Add an offline (admin-managed) contributor
- **WHEN** an admin creates a contributor slot without linking it to a registered account and provides a mobile number
- **THEN** the system creates an offline slot managed entirely by admins, visible in the contributor list with an "offline" indicator

#### Scenario: Add offline contributor without mobile number blocked
- **WHEN** an admin attempts to save an offline contributor slot without entering a mobile number
- **THEN** the system displays a validation error "Mobile number is required for offline contributors" and does not create the slot

#### Scenario: Contributor count limit
- **WHEN** an admin attempts to add a contributor slot when the group already has slots equal to its total cycle count
- **THEN** the system returns an error indicating the group is full

#### Scenario: Admin adds user already linked to another slot
- **WHEN** an admin selects a registered user who is already linked to at least one slot or sub-member entry in the same group
- **THEN** the system displays a warning before saving and requires the admin to explicitly confirm the multi-slot assignment

### Requirement: Shared contributor slot (sub-members)
The system SHALL allow a single contributor slot to be assigned to multiple sub-members who collectively split the installment amount. The total contribution from all sub-members MUST equal the slot's full installment amount. Each sub-member can be a registered user or an offline entry. When adding an offline sub-member, the admin MUST provide a mobile number; this is required for UPI payment intent generation. A registered user MAY appear as a sub-member in more than one slot within the same group.

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
- **AND** the admin may save a sub-member as an offline entry if no exact match is selected, but MUST provide a mobile number

#### Scenario: Add offline sub-member without mobile number blocked
- **WHEN** an admin attempts to save an offline sub-member without entering a mobile number
- **THEN** the system displays a validation error "Mobile number is required for offline sub-members" and does not save the sub-member

#### Scenario: Admin adds sub-member already present elsewhere in the group
- **WHEN** an admin adds a registered user as a sub-member to a slot where that user is already linked to another slot or sub-member entry in the same group
- **THEN** the system displays a warning and requires explicit confirmation before saving

## ADDED Requirements

### Requirement: Auto-link offline entries to newly registered user by mobile number
When a new user account is created (via email/password registration or OAuth mobile setup), the system SHALL automatically search for any offline contributor slots and offline sub-members whose stored mobile number matches the new user's mobile number, and set their `linked_user_id` to the newly created user's ID. This happens server-side immediately after the user record is persisted, without any admin action.

#### Scenario: New registration matches one offline contributor slot
- **WHEN** a user registers with a mobile number that matches the `mobile_number` field on an offline contributor slot
- **THEN** the system sets that slot's `linked_user_id` to the new user's ID
- **AND** the slot is no longer shown as "offline" in the contributor list

#### Scenario: New registration matches one offline sub-member
- **WHEN** a user registers with a mobile number that matches the `mobile_number` field on an offline sub-member
- **THEN** the system sets that sub-member's `linked_user_id` to the new user's ID

#### Scenario: New registration matches multiple offline entries across different groups
- **WHEN** a user registers with a mobile number that appears on offline entries in two or more groups
- **THEN** the system links all matching entries to the new user in a single operation

#### Scenario: No offline entries match the mobile number
- **WHEN** a user registers with a mobile number that does not appear on any offline contributor slot or sub-member
- **THEN** registration proceeds normally with no linking side-effects

#### Scenario: Offline entry already linked is skipped
- **WHEN** an offline slot or sub-member with that mobile number already has a `linked_user_id` set
- **THEN** the system skips that entry and does not overwrite the existing link

