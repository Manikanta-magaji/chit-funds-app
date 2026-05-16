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

#### Scenario: Add Contributor button checks capacity before opening modal
- **WHEN** an admin clicks Add Contributor and the group already has a slot for every cycle (slots.length >= total_cycles)
- **THEN** an inline error is shown and the Add Contributor modal does NOT open

#### Scenario: Sub-member edit mode shows single-row inputs with total
- **WHEN** an admin clicks Edit in the sub-member section of a slot
- **THEN** all sub-members enter edit mode simultaneously, each displayed as a single flex row of inputs (name, mobile, UPI, amount)
- **AND** a live split total indicator is shown; Save is disabled while the total does not match the installment amount
- **AND** a "+ Add Sub-member" button is visible in edit mode so the admin can add additional sub-members

#### Scenario: +Split form matches edit mode layout
- **WHEN** an admin clicks "+Split" on a slot with no sub-members
- **THEN** each draft row is shown as a single flex row (name · mobile · UPI · amount), consistent with edit mode
- **AND** the first draft row is pre-populated with the slot's existing name and mobile number

#### Scenario: Remove sub-member only available in edit mode
- **WHEN** a slot's sub-member section is in view mode
- **THEN** no Remove button is visible on any sub-member row
- **WHEN** the admin clicks Edit to enter edit mode
- **THEN** Remove buttons appear on offline sub-member rows and removing a row immediately updates the displayed total

### Requirement: History tab content
The History tab SHALL display the Prize History table and, for admins, the Draw Prize and Next Cycle action buttons.

#### Scenario: History tab shows prize draw table
- **WHEN** the History tab is active
- **THEN** the prize history table is visible showing past winners, months, and payout status

#### Scenario: Admin draw actions shown in History tab
- **WHEN** an admin views the History tab
- **THEN** the Draw Prize and Next Cycle buttons are visible in that tab

### Requirement: Settings tab content (admin-only)
The Settings tab SHALL be visible only to admins and SHALL contain the Fund Settings form, the Admin Management panel (as a separate H3 section), and the Danger Zone.

#### Scenario: Settings tab hidden for non-admins
- **WHEN** a non-admin member views the Group Dashboard
- **THEN** the Settings tab is not rendered in the tab bar and its content is not accessible

#### Scenario: Settings tab contains fund settings and admin management
- **WHEN** an admin clicks the Settings tab
- **THEN** the Fund Settings form (name, installment amount, cycles, start date), the Admin Management section, and the Danger Zone are all visible in that order

### Requirement: Installment payment status display
The Installment Tracking panel SHALL display a consolidated "In Progress" badge for any slot whose payment is not yet complete, regardless of whether that slot has self-reported a pending payment or has partially-paid sub-members.

#### Scenario: Partial sub-member payment shows In Progress
- **WHEN** a multi-sub-member slot has some sub-members paid and others not
- **THEN** the installment row displays an "In Progress" badge

#### Scenario: Fully paid slot shows Paid
- **WHEN** all payments for a slot (and its sub-members if any) have been confirmed as paid
- **THEN** the installment row displays a "Paid" badge

#### Scenario: Unpaid slot shows Unpaid
- **WHEN** no payment has been recorded or self-reported for a slot
- **THEN** the installment row displays an "Unpaid" badge
