## Why

Users currently register and log in using email + password or Google OAuth, but mobile numbers are a more universal and reliable identity in India where chit funds operate. Adding mandatory mobile number registration enables mobile-first login, reduces friction, and aligns with UPI payment workflows where the winner's contact identity is a phone number.

## What Changes

- Mobile number becomes a **mandatory** field on registration; email becomes optional (can be added later from profile)
- Users can log in with either mobile number or email (+ password)
- Mobile number must be unique across all users; email must remain unique when provided
- Google OAuth users are prompted to add their mobile number before being allowed to use the app (mandatory post-signup step); they cannot access any page until mobile is set
- Member search in fund groups gains mobile number as a searchable field alongside name and email
- `ProfileSetupPage` extended to capture mobile number for Google OAuth users

## Capabilities

### New Capabilities
- `mobile-auth`: Registration with mandatory mobile number, optional email, login via mobile or email, Google OAuth mobile onboarding gate

### Modified Capabilities
- `user-auth`: Registration and login flows change — mobile number added as mandatory identifier; email becomes optional; login accepts mobile or email
- `contributor-management`: Member search in groups gains mobile number search support

## Impact

- **Backend**: `User` model gains `mobile_number` (unique, non-null after migration); `email` becomes nullable; auth endpoints updated (`/auth/register`, `/auth/login`); new gate middleware / dependency for mobile-missing OAuth users; contributor search query updated
- **Frontend**: `RegisterPage` form updated (mobile required, email optional); `LoginPage` accepts mobile or email; `ProfileSetupPage` adds mobile field for OAuth users; `ProtectedRoute` or equivalent checks mobile presence and redirects to setup; group member search updated
- **Database**: New Alembic migration — `mobile_number VARCHAR UNIQUE NOT NULL` added, `email` made nullable
- **Dependencies**: None new
