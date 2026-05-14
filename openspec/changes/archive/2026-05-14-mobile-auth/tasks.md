## 1. Database Migration

- [x] 1.1 Add Alembic migration: add `mobile_number VARCHAR(20) UNIQUE` (nullable initially) to `users` table
- [x] 1.2 Make `email` column nullable in the migration
- [x] 1.3 Update `User` SQLAlchemy model: `mobile_number = Column(String(20), unique=True, nullable=True)`, `email` → `nullable=True`

## 2. Backend — Auth Schemas & Register Endpoint

- [x] 2.1 Update `UserCreate` schema: add `mobile_number: str` (required), make `email: Optional[str]` with default `None`
- [x] 2.2 Update `/auth/register` endpoint: save `mobile_number` from request, handle unique constraint errors for both email and mobile
- [x] 2.3 Update `UserRead` / `UserProfile` response schemas to include `mobile_number`

## 3. Backend — Login Endpoint

- [x] 3.1 Update `LoginRequest` schema: rename `email` → `identifier: str`
- [x] 3.2 Update `/auth/login` endpoint: resolve identifier — if contains `@` query by email, else query by mobile number; return same JWT cookie response

## 4. Backend — Google OAuth Flow

- [x] 4.1 Update `/auth/google/callback`: do not block if no mobile number (allow login); return user profile including `mobile_number` field

## 5. Backend — User Search (Contributor Search)

- [x] 5.1 Update user search endpoint (`/users/search` or equivalent) to match on `mobile_number` field when query looks like a phone number (no `@`, no spaces, numeric-ish)
- [x] 5.2 Add index on `users.mobile_number` in migration for efficient lookup

## 6. Frontend — Registration Page

- [x] 6.1 Add `mobileNumber` field to `RegisterPage` form (required, type `tel`) and `fullName` field (required)
- [x] 6.2 Remove email required validation — make email optional with label "Email (optional)"
- [x] 6.3 Update `RegisterRequest` type in `api/types.ts`: add `mobile_number: string`, change `email` → `email?: string`
- [x] 6.4 Update the register API call to pass `mobile_number`

## 7. Frontend — Login Page

- [x] 7.1 Change the email input in `LoginPage` to an `identifier` field with placeholder "Mobile number or email"
- [x] 7.2 Update `LoginRequest` type in `api/types.ts`: rename `email` → `identifier: string`
- [x] 7.3 Update the login API call to send `identifier` instead of `email`

## 8. Frontend — Profile Setup Page (OAuth Mobile Gate)

- [x] 8.1 Add `mobileNumber` field to `ProfileSetupPage` form (required)
- [x] 8.2 Update the profile save API call to include `mobile_number`
- [x] 8.3 Update `UserProfile` type in `api/types.ts` to include `mobile_number: string | null`

## 9. Frontend — Protected Route Gate

- [x] 9.1 In `ProtectedRoute`, after confirming the user is authenticated, check `user.mobile_number`
- [x] 9.2 If `user.mobile_number` is null/empty, redirect to `/profile/setup` regardless of requested route
- [x] 9.3 Ensure the redirect does not loop (profile setup page itself must be accessible)

## 10. Frontend — Group Member Search

- [x] 10.1 Update contributor/sub-member search input hint text to indicate mobile number is searchable
- [x] 10.2 Verify the backend search endpoint returns results for mobile number queries (integration check)

## 11. Verification

- [x] 11.1 Test: register with mobile only → login with mobile → succeeds
- [x] 11.2 Test: register with mobile + email → login with email → succeeds
- [x] 11.3 Test: duplicate mobile number on register → error shown
- [x] 11.4 Test: Google OAuth new user → redirected to profile setup → enter mobile → access granted
- [x] 11.5 Test: Google OAuth user without mobile navigates to `/groups` → redirected to profile setup
- [x] 11.6 Test: contributor search by mobile number returns correct user
