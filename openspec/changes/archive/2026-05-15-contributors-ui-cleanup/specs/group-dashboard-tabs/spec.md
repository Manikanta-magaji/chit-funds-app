## MODIFIED Requirements

### Requirement: Contributors tab content
The Contributors tab SHALL display the full contributor slot list including sub-member editors, add-contributor form, and link-account flows. Slot rows SHALL show the slot name, registration status, and — where applicable — a winner indicator and admin action buttons. Payment status (paid/unpaid) SHALL NOT be shown on contributor rows; it is displayed exclusively in the Installment Tracking panel on the Overview tab. Admin users who hold no contributor slot SHALL be listed separately with their actual display name and a clear indication that they are administrators only.

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

### Requirement: Installment payment status display
The Installment Tracking panel SHALL display a consolidated "In Progress" badge for any slot whose payment is not yet complete, regardless of whether that slot has self-reported a pending payment or has partially-paid sub-members.

#### Scenario: Slot with self-reported payment shows In Progress
- **WHEN** a contributor has self-reported payment and it is awaiting admin confirmation
- **THEN** the installment row displays an "In Progress" badge

#### Scenario: Partial sub-member payment shows In Progress
- **WHEN** a multi-sub-member slot has some sub-members paid and others not
- **THEN** the installment row displays an "In Progress" badge

#### Scenario: Fully paid slot shows Paid
- **WHEN** all payments for a slot (and its sub-members if any) have been confirmed as paid
- **THEN** the installment row displays a "Paid" badge

#### Scenario: Unpaid slot shows Unpaid
- **WHEN** no payment has been recorded or self-reported for a slot
- **THEN** the installment row displays an "Unpaid" badge
