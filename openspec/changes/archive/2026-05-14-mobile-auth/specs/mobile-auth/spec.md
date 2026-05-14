## ADDED Requirements

### Requirement: Mobile number mandatory on registration
The system SHALL require a mobile number when a user registers with email/password. The mobile number MUST be stored as a unique identifier. Email SHALL be optional at registration time and MAY be added later from the user's profile.

#### Scenario: Successful registration with mobile only
- **WHEN** a user submits the registration form with a username, mobile number, and password (no email)
- **THEN** the system creates a new account and logs the user in

#### Scenario: Successful registration with mobile and email
- **WHEN** a user submits the registration form with a username, mobile number, email, and password
- **THEN** the system creates a new account with both identifiers and logs the user in

#### Scenario: Duplicate mobile number blocked
- **WHEN** a user attempts to register with a mobile number that already exists in the system
- **THEN** the system returns an error indicating the mobile number is already registered

#### Scenario: Duplicate email blocked
- **WHEN** a user attempts to register with an email that already exists in the system
- **THEN** the system returns an error indicating the email is already in use

#### Scenario: Registration without mobile number rejected
- **WHEN** a user submits the registration form without a mobile number
- **THEN** the system returns a validation error requiring mobile number

### Requirement: Login with mobile number or email
The system SHALL allow users to log in using either their mobile number or email address (when set) as the identifier, combined with their password.

#### Scenario: Login with mobile number
- **WHEN** a user submits the login form with their mobile number and correct password
- **THEN** the system authenticates the user and issues an auth token

#### Scenario: Login with email
- **WHEN** a user submits the login form with their email address and correct password
- **THEN** the system authenticates the user and issues an auth token

#### Scenario: Unknown identifier rejected
- **WHEN** a user submits the login form with an identifier that does not match any mobile number or email in the system
- **THEN** the system returns an error indicating invalid credentials

#### Scenario: Login field label reflects both options
- **WHEN** the login page is displayed
- **THEN** the identifier field label indicates that both mobile number and email are accepted

### Requirement: Google OAuth users must add mobile number before proceeding
The system SHALL require users who sign up or log in via Google OAuth to provide a mobile number before accessing any part of the application. Until a mobile number is saved, the user SHALL be redirected to the profile setup page on every navigation attempt.

#### Scenario: Google OAuth new user redirected to setup
- **WHEN** a new user completes Google OAuth login and has no mobile number on record
- **THEN** the system redirects them to the profile setup page

#### Scenario: Navigation blocked without mobile number
- **WHEN** an authenticated Google OAuth user without a mobile number attempts to navigate to any protected route
- **THEN** the system redirects them to the profile setup page instead

#### Scenario: Profile setup accepts mobile number
- **WHEN** a Google OAuth user submits the profile setup form with a valid mobile number
- **THEN** the system saves the mobile number and allows the user to proceed to the app

#### Scenario: Duplicate mobile rejected during OAuth setup
- **WHEN** a Google OAuth user attempts to save a mobile number that is already registered by another account
- **THEN** the system returns an error indicating the mobile number is already in use

#### Scenario: Gate lifted after mobile saved
- **WHEN** the user successfully saves their mobile number on the profile setup page
- **THEN** all protected routes become accessible and no further redirect occurs
