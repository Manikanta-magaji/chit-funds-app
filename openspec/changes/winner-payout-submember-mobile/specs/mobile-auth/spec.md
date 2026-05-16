## ADDED Requirements

### Requirement: Auto-link offline fund entries on registration
After a new user account is successfully persisted — whether via email/password registration or OAuth mobile-number setup — the system SHALL query all offline contributor slots and offline sub-members whose stored `mobile_number` matches the new user's mobile number and set their `linked_user_id` to the new user's ID. The auto-linking SHALL occur in the same database transaction as user creation.

#### Scenario: Registration triggers auto-link for matching offline slot
- **WHEN** a user completes email/password registration and their mobile number matches an offline contributor slot in any group
- **THEN** the system links that slot to the new user account before returning the registration response

#### Scenario: OAuth mobile setup triggers auto-link
- **WHEN** a Google OAuth user submits the profile setup form with a mobile number that matches an offline contributor slot or sub-member
- **THEN** the system links all matching entries to the user account as part of saving the mobile number

#### Scenario: Auto-link is transparent to the user
- **WHEN** auto-linking occurs during registration
- **THEN** the registration response is unchanged (no extra fields); the user simply sees the linked groups in their dashboard upon first login
