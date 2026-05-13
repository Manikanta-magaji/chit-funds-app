## ADDED Requirements

### Requirement: Create a chit fund group
The system SHALL allow any authenticated user with a complete profile to create a chit fund group. Group creation SHALL collect: group name, installment amount per contributor slot (in INR), and total number of cycles (equal to the total number of contributor slots). The creating user SHALL automatically become an admin of the group.

#### Scenario: Successful group creation
- **WHEN** a user submits a valid group name, installment amount, and cycle count
- **THEN** the system creates the group, assigns the creator as admin, and redirects the user to the group management page

#### Scenario: Missing required fields
- **WHEN** a user submits the group creation form with any required field empty
- **THEN** the system returns a validation error and does not create the group

#### Scenario: Invalid installment amount
- **WHEN** a user enters an installment amount of zero or a negative number
- **THEN** the system returns a validation error

### Requirement: Admin role management
The system SHALL allow a group admin to grant or revoke admin rights for any registered member of the group. A group MUST always have at least one admin; the last admin cannot be removed.

#### Scenario: Grant admin rights
- **WHEN** an existing admin selects a group member and grants admin rights
- **THEN** the system updates the member's role to admin and they can perform admin actions for that group

#### Scenario: Revoke admin rights
- **WHEN** an admin revokes another admin's rights
- **THEN** the system demotes that user to regular contributor in the group

#### Scenario: Last admin protection
- **WHEN** an admin attempts to remove the only remaining admin of a group
- **THEN** the system returns an error and does not complete the removal

### Requirement: View group details
The system SHALL allow admins and contributors of a group to view the group's details including name, installment amount, cycle count, current cycle, and list of contributor slots.

#### Scenario: Admin views group details
- **WHEN** a group admin navigates to the group page
- **THEN** the system displays all group details, contributor slots, payment status for the current cycle, and the draw history

#### Scenario: Contributor views group details
- **WHEN** a contributor navigates to the group page
- **THEN** the system displays the group's name, installment amount, their own slot and payment status, and the draw history

### Requirement: Delete a chit fund group
The system SHALL allow a group admin to permanently delete a chit fund group and all its associated records (contributor slots, sub-members, cycles, installments, payouts). Deletion SHALL require explicit browser confirmation from the admin.

#### Scenario: Admin deletes a group
- **WHEN** a group admin confirms deletion of a group
- **THEN** the system permanently removes the group and all its records and redirects the admin to the group list page

#### Scenario: Non-admin cannot delete
- **WHEN** a non-admin member attempts to delete a group
- **THEN** the system returns a 403 error and does not delete the group

### Requirement: Group dashboard
The system SHALL present admins with a group dashboard that shows a summary of the current cycle: total expected installments, total received installments, outstanding payments, and the prize winner (if selected).

#### Scenario: Current cycle summary
- **WHEN** an admin views the group dashboard
- **THEN** the system shows the cycle number, installment collection progress (paid vs. total), and prize winner status for the current cycle
