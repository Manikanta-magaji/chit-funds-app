## MODIFIED Requirements

### Requirement: User search suggestions show identifying details
The system SHALL display the mobile number and email address alongside the display name in user search suggestion results so that admins can distinguish users with identical display names. The suggestion dropdown MUST have a solid opaque background so that underlying page content does not show through. The suggestion list MUST be dismissed immediately when the admin selects a user — it SHALL NOT remain visible after a selection is made.

#### Scenario: Suggestion shows mobile and email
- **WHEN** an admin searches for a user by name and results are displayed
- **THEN** each suggestion item shows the user's display name, mobile number (if present), and email address (if present)

#### Scenario: Suggestion dismissed after selection
- **WHEN** an admin clicks a suggestion item to select a user
- **THEN** the suggestion dropdown disappears immediately and does not remain open

#### Scenario: Suggestion background is opaque
- **WHEN** the suggestion dropdown is visible
- **THEN** the dropdown has a fully opaque white background regardless of hover state, so no underlying content is visible through it

#### Scenario: Suggestion reappears on new input
- **WHEN** the admin clears the name field and types new text after a prior selection
- **THEN** the suggestion list appears again based on the new query
