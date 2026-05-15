## MODIFIED Requirements

### Requirement: Admin role management
The system SHALL allow a group admin to grant admin rights to any registered user — whether or not they are a contributor slot holder in the group — and to revoke admin rights from existing admins. A group MUST always have at least one admin; the last admin cannot be removed.

#### Scenario: Grant admin rights to an existing contributor
- **WHEN** an existing admin selects a group contributor and grants admin rights
- **THEN** the system updates the member's role to admin and they can perform admin actions for that group

#### Scenario: Grant admin rights to a non-contributor registered user
- **WHEN** an admin searches for a registered user who is not yet a contributor slot holder in the group and grants them admin rights
- **THEN** the system adds that user as a group admin and they can immediately perform admin actions for that group

#### Scenario: Revoke admin rights
- **WHEN** an admin revokes another admin's rights
- **THEN** the system demotes that user to a regular participant (contributor if they hold a slot, or no role otherwise)

#### Scenario: Last admin protection
- **WHEN** an admin attempts to remove the only remaining admin of a group
- **THEN** the system returns an error and does not complete the removal
