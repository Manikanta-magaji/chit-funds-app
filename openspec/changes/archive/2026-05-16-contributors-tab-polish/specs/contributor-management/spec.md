## MODIFIED Requirements

### Requirement: Visual presentation of contributor slots
Contributor slot rows SHALL use a colour-coded background to indicate registration status instead of text badges. A registered slot (linked to a user account) SHALL have a green-tinted card background. An offline slot SHALL use the default card background. The text labels "Registered" and "Unregistered" SHALL NOT appear on contributor rows.

#### Scenario: Registered slot has green-tinted background
- **WHEN** a contributor slot is linked to a registered user account
- **THEN** the slot card has a light-green background tint and no "Registered" text badge is shown

#### Scenario: Offline slot has default background
- **WHEN** a contributor slot is not linked to any registered user
- **THEN** the slot card uses the default card background with no "Unregistered" text badge

### Requirement: Sub-member list — view mode by default
When a slot’s sub-member list is expanded, each sub-member SHALL be displayed in a compact read-only row showing name, mobile number, UPI ID, and split amount as a single inline line. The list SHALL NOT display an instructional paragraph. Each offline sub-member row SHALL have an Edit button; registered sub-member rows have no Edit button.

#### Scenario: Sub-members shown read-only on expansion
- **WHEN** a slot with sub-members is expanded
- **THEN** each sub-member is shown as a single read-only line displaying the sub-member name only (no mobile, UPI, or amount visible) without any input fields

#### Scenario: No instructional paragraph shown
- **WHEN** the sub-member list is expanded
- **THEN** no instructional paragraph (e.g. “Edit or rearrange below…”) is visible

#### Scenario: Edit button on offline sub-member row
- **WHEN** an admin views an expanded sub-member list containing an offline sub-member
- **THEN** an Edit button is visible on that sub-member’s row

### Requirement: Per-sub-member inline edit mode
Clicking Edit on an offline sub-member row SHALL switch that row into edit mode showing name, mobile, UPI ID, and amount as editable inputs in a single inline row, plus Save and Cancel controls. All other sub-member rows SHALL remain in read-only view.

#### Scenario: Edit mode reveals all fields for one sub-member at a time
- **WHEN** an admin clicks Edit on a sub-member row
- **THEN** that row switches to edit mode showing name, mobile, UPI ID, and amount as input fields; all other rows remain in name-only read-only view

#### Scenario: Save persists changes and returns to read-only
- **WHEN** an admin modifies fields in an edit-mode row and clicks Save
- **THEN** the changes are persisted and the row returns to read-only view with updated values

#### Scenario: Cancel discards changes
- **WHEN** an admin clicks Cancel in an edit-mode row
- **THEN** the row returns to read-only view with the original values unchanged

### Requirement: Sub-members always expanded on Contributors tab load
All contributor slots that have sub-members SHALL be shown in the expanded (editor-visible) state by default when the Contributors tab is first activated. The admin SHALL still be able to collapse individual slots.

#### Scenario: Slots with sub-members auto-expand
- **WHEN** the Contributors tab becomes active
- **THEN** all slots with one or more sub-members have their sub-member section visible without requiring a click

#### Scenario: Admin can still collapse a slot
- **WHEN** an admin clicks the collapse/close control on an expanded slot
- **THEN** that slot's sub-member section is hidden
