## ADDED Requirements

### Requirement: Sign up with email and password
The system SHALL allow a new user to register with a unique email address and a password. The system MUST validate that the email is not already registered and that the password meets minimum security requirements (at least 8 characters).

#### Scenario: Successful email registration
- **WHEN** a user submits a valid email address and password that is not already registered
- **THEN** the system creates a new user account and returns an authenticated session

#### Scenario: Duplicate email registration
- **WHEN** a user submits an email address that is already registered
- **THEN** the system returns an error indicating the email is already in use and does not create a duplicate account

#### Scenario: Weak password
- **WHEN** a user submits a password shorter than 8 characters
- **THEN** the system returns a validation error and does not create the account

### Requirement: Sign in with email and password
The system SHALL allow a registered user to log in using their email and password. On success, the system MUST issue a JWT access token stored in an HTTP-only cookie.

#### Scenario: Successful login
- **WHEN** a registered user submits the correct email and password
- **THEN** the system returns an HTTP-only cookie containing a valid JWT and redirects the user to their dashboard

#### Scenario: Invalid credentials
- **WHEN** a user submits an unrecognized email or incorrect password
- **THEN** the system returns a generic "invalid credentials" error without revealing which field was wrong

### Requirement: Google OAuth login and registration
The system SHALL allow users to authenticate using their Google account via OAuth 2.0 Authorization Code Flow. If the Google account email is not yet registered, the system MUST automatically create a new account.

#### Scenario: New user signs in with Google
- **WHEN** a user authenticates with Google for the first time
- **THEN** the system creates a new user account, pre-fills the display name from the Google profile, and issues a session

#### Scenario: Returning user signs in with Google
- **WHEN** a user who previously signed in with Google authenticates again
- **THEN** the system issues a new session for the existing account without creating a duplicate

#### Scenario: Google account email matches existing email account
- **WHEN** a user authenticates with Google and the Google email matches an existing email/password account
- **THEN** the system links the Google identity to the existing account and issues a session

### Requirement: Session management and logout
The system SHALL maintain authenticated sessions via JWT. Access tokens SHALL expire after 60 minutes. The system MUST provide a logout endpoint that invalidates the session.

#### Scenario: Token expiry
- **WHEN** a user's access token has expired
- **THEN** the system returns a 401 response and the frontend redirects the user to the login page

#### Scenario: Logout
- **WHEN** an authenticated user requests logout
- **THEN** the system clears the session cookie and the user is redirected to the login page

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

#### Scenario: UPI ID inherited from offline slot on registration
- **WHEN** a user registers with a mobile number that matches an offline contributor slot that has an admin-set UPI ID, and the user's own UPI ID is null
- **THEN** the system copies the slot's UPI ID to the user's account
- **AND** the user immediately has a UPI ID available for Pay Now without any additional profile editing

#### Scenario: Profile completion gating
- **WHEN** a user with an incomplete profile (missing mobile or display name) attempts to navigate to any page other than the profile setup page
- **THEN** the system redirects the user to the profile setup page

### Requirement: Profile editing
The system SHALL allow a logged-in user to update their display name, mobile number, and UPI ID at any time from their profile settings page.

#### Scenario: Successful profile update
- **WHEN** a user submits valid updates to their profile fields
- **THEN** the system saves the changes and confirms the update to the user

### Requirement: Display name uniqueness
The system SHALL enforce global uniqueness of display names across all users.

#### Scenario: Duplicate display name during profile setup
- **WHEN** a user submits a display name that is already used by another account
- **THEN** the system rejects the update with a validation error and requires a different display name

#### Scenario: Duplicate display name during profile edit
- **WHEN** a logged-in user attempts to change their display name to one already used by another account
- **THEN** the system rejects the change and preserves the current display name

### Requirement: User search
The system SHALL provide an API endpoint for searching registered users. Search SHALL match partial display name, partial email (case-insensitive), or exact mobile number. A 500 ms debounce SHALL be applied on the frontend before firing the request.

#### Scenario: Search by partial display name or email
- **WHEN** a user queries the search endpoint with a partial name or email string
- **THEN** the system returns all users whose display name or email contains the query (case-insensitive)

#### Scenario: Search by exact mobile number
- **WHEN** a user queries with a mobile number
- **THEN** the system returns the user whose mobile exactly matches the query

#### Scenario: No match found
- **WHEN** no users match the query
- **THEN** the system returns an empty list

#### Scenario: Debounced search in UI
- **WHEN** a user types into a contributor or sub-member search field
- **THEN** the frontend waits 500 ms after the last keystroke before sending the search request
