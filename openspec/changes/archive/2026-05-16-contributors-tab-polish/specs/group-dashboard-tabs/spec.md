## MODIFIED Requirements

### Requirement: Contributors tab default expansion state
When the Contributors tab is activated, all slots that contain sub-members SHALL be shown in their expanded state by default. This removes the need for the admin to manually expand each slot to view or edit sub-members.

#### Scenario: Sub-member slots expanded on tab switch
- **WHEN** a user switches to the Contributors tab
- **THEN** every slot that has at least one sub-member is already expanded showing the sub-member editor

#### Scenario: Slots without sub-members remain collapsed
- **WHEN** the Contributors tab loads
- **THEN** slots with no sub-members are not expanded and show only their contributor row
