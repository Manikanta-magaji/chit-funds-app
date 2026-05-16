## ADDED Requirements

### Requirement: Registration CTA on login page is visually prominent
The login page SHALL display a clearly visible, button-styled call-to-action that navigates the user to the registration page. The CTA MUST use the application's primary button style so it is distinguishable from plain body text.

#### Scenario: Registration CTA is visible on login page
- **WHEN** a user opens the login page
- **THEN** a "Create one" (or equivalent) primary-styled button linking to the registration page is visible below the login form

#### Scenario: Registration CTA navigates to registration page
- **WHEN** a user clicks the registration CTA on the login page
- **THEN** the user is taken to the account registration form

### Requirement: Registered display name shown after offline-to-registered link
When an offline contributor slot is auto-linked to a newly registered user (matched on mobile number), the Contributors tab SHALL display the user's registered `display_name` instead of the admin-typed slot name. The admin-typed slot name is retained internally as a fallback when no registered user is linked.

#### Scenario: Contributor list shows registered display name after linking
- **WHEN** an offline slot with admin-typed name "Ravi K" is auto-linked to a user who registered as "Ravi Kumar"
- **THEN** the Contributors tab shows "Ravi Kumar" (the registered display name) for that slot

#### Scenario: Unlinked slot still shows admin-typed name
- **WHEN** a contributor slot has no linked registered user
- **THEN** the Contributors tab shows the admin-typed slot name
