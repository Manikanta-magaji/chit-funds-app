## Requirements

### Requirement: Group Dashboard tab navigation
The Group Dashboard SHALL display content organised into named tabs. Users SHALL be able to switch between tabs without a page reload. The active tab SHALL default to Overview on initial load.

#### Scenario: Default tab on page load
- **WHEN** a user navigates to a Group Dashboard page
- **THEN** the Overview tab is active and its content is visible

#### Scenario: Switching tabs
- **WHEN** a user clicks a tab label in the tab bar
- **THEN** that tab becomes active, its content panel becomes visible, and all other content panels are hidden

#### Scenario: Tab bar for non-admin members
- **WHEN** a regular (non-admin) member views the Group Dashboard
- **THEN** the tab bar shows exactly three tabs: Overview, Contributors, and History

#### Scenario: Tab bar for admins
- **WHEN** an admin views the Group Dashboard
- **THEN** the tab bar shows four tabs: Overview, Contributors, History, and Settings

### Requirement: Overview tab content
The Overview tab SHALL display the fund stats summary and the Installment Tracking panel for the current cycle.

#### Scenario: Overview tab shows stats and installments
- **WHEN** the Overview tab is active
- **THEN** the fund stats row (monthly installment, current cycle, contributor count, this month's winner) is visible
- **AND** the Installment Tracking panel for the current cycle is visible

### Requirement: Contributors tab content
The Contributors tab SHALL display the full contributor slot list including sub-member editors, add-contributor form, and link-account flows.

#### Scenario: Contributors tab shows slot management
- **WHEN** the Contributors tab is active
- **THEN** all contributor slots are listed with their sub-members, registration status, and admin action buttons

### Requirement: History tab content
The History tab SHALL display the Prize History table and, for admins, the Draw Prize and Next Cycle action buttons.

#### Scenario: History tab shows prize draw table
- **WHEN** the History tab is active
- **THEN** the prize history table is visible showing past winners, months, and payout status

#### Scenario: Admin draw actions shown in History tab
- **WHEN** an admin views the History tab
- **THEN** the Draw Prize and Next Cycle buttons are visible in that tab

### Requirement: Settings tab content (admin-only)
The Settings tab SHALL be visible only to admins and SHALL contain the Fund Settings form and the Admin Management panel.

#### Scenario: Settings tab hidden for non-admins
- **WHEN** a non-admin member views the Group Dashboard
- **THEN** the Settings tab is not rendered in the tab bar and its content is not accessible

#### Scenario: Settings tab contains fund settings and admin management
- **WHEN** an admin clicks the Settings tab
- **THEN** the Fund Settings form (name, installment amount, cycles) and the Admin Management panel (current admin list with revoke, add admin search) are visible
