## MODIFIED Requirements

### Requirement: Contributors tab content
The Contributors tab SHALL display the full contributor slot list including sub-member editors and the add-contributor form. Slot rows SHALL show the slot name, registration status, and — where applicable — a winner indicator and admin action buttons. Payment status (paid/unpaid) SHALL NOT be shown on contributor rows; it is displayed exclusively in the Installment Tracking panel on the Overview tab. Admin users who hold no contributor slot SHALL be listed separately with their actual display name and a clear indication that they are administrators only. The Contributors tab SHALL NOT contain an Admin Management section; that belongs in the Settings tab.

#### Scenario: Contributors tab shows slot management
- **WHEN** the Contributors tab is active
- **THEN** all contributor slots are listed with their sub-members, registration status, and admin action buttons

#### Scenario: Payment status not shown on contributor rows
- **WHEN** a user views the Contributors tab
- **THEN** no paid or unpaid status indicator is shown on any contributor slot row

#### Scenario: Winner indicator on contributor row
- **WHEN** a contributor slot is the prize winner for the current cycle
- **THEN** a trophy icon (🏆) is shown inline with the slot name and no additional text label is rendered

#### Scenario: Admin-only users shown with display name
- **WHEN** an admin user is not linked to any contributor slot in the group
- **THEN** that admin is listed in the Contributors tab with their actual display name and a muted "Admin" label indicating they are not a contributor

#### Scenario: Admin-only user list does not show generic placeholders
- **WHEN** an admin user without a slot is displayed
- **THEN** their entry does NOT show a generic "User #N" label

#### Scenario: Admin Management not shown in Contributors tab
- **WHEN** an admin views the Contributors tab
- **THEN** there is no Admin Management section visible; it is only accessible via the Settings tab

### Requirement: Settings tab content (admin-only)
The Settings tab SHALL be visible only to admins and SHALL contain the Fund Settings form, the Admin Management panel (as a separate H3 section), and the Danger Zone. The Admin Management panel allows the admin to view current admins, revoke admin rights, and grant admin rights to other registered users.

#### Scenario: Settings tab hidden for non-admins
- **WHEN** a non-admin member views the Group Dashboard
- **THEN** the Settings tab is not rendered in the tab bar and its content is not accessible

#### Scenario: Settings tab contains fund settings and admin management
- **WHEN** an admin clicks the Settings tab
- **THEN** the Fund Settings form (name, installment amount, cycles, start date), the Admin Management section, and the Danger Zone are all visible in that order
