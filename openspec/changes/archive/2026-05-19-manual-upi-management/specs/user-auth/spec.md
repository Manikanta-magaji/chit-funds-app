## MODIFIED Requirements

### Requirement: User profile setup
The system SHALL require each user to complete their profile with a display name and mobile number before accessing group features. On first login, if either field is missing, the system MUST prompt the user to complete their profile.

The UPI ID is optional. If the user does not provide a UPI ID during profile setup or later in profile settings, the system SHALL store `null` for that field. The system MUST NOT derive or infer a UPI ID from the mobile number.

The display name SHALL be globally unique. The system MUST reject updates that would result in a duplicate display name.

#### Scenario: Profile auto-fill from Google login
- **WHEN** a user signs in with Google and has no saved profile
- **THEN** the system pre-fills the display name from the Google display name and presents the profile completion form

#### Scenario: Duplicate display name rejected
- **WHEN** a user tries to set a display name that is already used by another account
- **THEN** the system returns a 400 error indicating the name is taken

#### Scenario: Profile name derived from email
- **WHEN** a user signs in with email/password and has no saved display name
- **THEN** the system derives the display name from the part of the email before the `@` symbol and presents the profile completion form

#### Scenario: Profile completion without UPI ID
- **WHEN** a user provides a display name and mobile number but no UPI ID during profile setup
- **THEN** the system marks the profile as complete and stores `null` for UPI ID
- **AND** the user can add or update their UPI ID at any time from profile settings

#### Scenario: Profile completion gating
- **WHEN** a user with an incomplete profile (missing mobile or display name) attempts to navigate to any page other than the profile setup page
- **THEN** the system redirects the user to the profile setup page
