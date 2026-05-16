## MODIFIED Requirements

### Requirement: Shared contributor slot (sub-members)
The system SHALL allow a single contributor slot to be assigned to multiple sub-members when creating a new contributor slot via the Add Contributor form. The total contribution from all sub-members MUST equal the slot's full installment amount. Each sub-member can be a registered user or an offline name. Splitting an existing solo contributor into sub-members after creation is NOT supported — admins who need to split an existing slot must remove the contributor and add them again using the shared flow. All group members (not only admins) SHALL be able to expand a multi-sub-member slot to view the sub-member names in read-only mode; edit controls are available to admins only.

#### Scenario: Split slot among two sub-members at creation time
- **WHEN** an admin selects "Sharing with others" in the Add Contributor form and fills in at least 2 sub-member rows with names and amounts that sum to the full installment
- **THEN** clicking "Add Contributor" creates the slot and all sub-members atomically and closes the form

#### Scenario: Invalid split total
- **WHEN** the sum of sub-member split amounts does not equal the full installment amount
- **THEN** the system returns a validation error and does not save the split configuration

#### Scenario: No +Split button on existing solo slot
- **WHEN** an admin views an existing contributor slot with no sub-members
- **THEN** no "+Split" or "+Add" button is shown; the only options are Edit and Remove

#### Scenario: Admin adds sub-member already present elsewhere in the group
- **WHEN** an admin adds a registered user as a sub-member to a slot where that user is already linked to another slot or sub-member entry in the same group
- **THEN** the system displays a warning and requires explicit confirmation before saving

#### Scenario: Non-admin member can expand multi-sub-member slot to view names
- **WHEN** a non-admin group member views the Contributors tab and a slot has more than one sub-member
- **THEN** an expand button is visible to them and clicking it reveals the sub-member names in a read-only list

#### Scenario: Non-admin member cannot edit sub-members
- **WHEN** a non-admin member expands a multi-sub-member slot
- **THEN** no Edit, Add, or Remove controls are shown; the sub-member list is read-only
