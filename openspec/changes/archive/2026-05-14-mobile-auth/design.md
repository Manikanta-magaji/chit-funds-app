## Context

The app currently uses email + password for registration and login, with Google OAuth as an alternative. Mobile number is not collected anywhere. In India's chit fund context, mobile number is the de facto identity — it's used for UPI payments, group coordination, and is universally available. This change makes mobile a first-class identifier while keeping email as an optional convenience field.

Current state:
- `User.email` — required, unique
- `User.mobile_number` — does not exist
- Login: email + password only
- Google OAuth: redirects to `ProfileSetupPage` (display name + UPI ID), no mobile required
- Contributor search: partial name / email (mobile referenced in spec but not yet implemented)

## Goals / Non-Goals

**Goals:**
- Mobile number is mandatory for all users (registered or Google OAuth)
- Email is optional; when provided it must be unique
- Login accepts mobile number or email as the identifier
- Google OAuth users are blocked from all app pages until they supply a mobile number
- Contributor / sub-member search supports mobile number lookup

**Non-Goals:**
- OTP / SMS verification of mobile number (out of scope — trust user input)
- Changing UPI ID collection (already exists on ProfileSetupPage)
- Two-factor authentication

## Decisions

### 1. Mobile as primary identifier, email secondary
**Decision**: `mobile_number` is `NOT NULL UNIQUE` on the `User` table. `email` becomes nullable (existing rows must be handled in migration — see Migration Plan).

**Rationale**: Mobile is more universally available in the target user base. Using it as the login identifier aligns with how users think of their identity in chit fund groups.

**Alternatives considered**: Make email optional at DB level but still require one of email/mobile at app level — rejected as it adds complexity for minimal gain.

### 2. Login identifier: mobile or email
**Decision**: The login endpoint accepts a single `identifier` field. The backend resolves it: if the value contains `@`, query by email; otherwise query by mobile number.

**Rationale**: Simple, unambiguous detection. Mobile numbers never contain `@`. No separate endpoints needed.

**Alternatives considered**: Two separate login endpoints (`/auth/login/email`, `/auth/login/mobile`) — rejected as unnecessary complexity.

### 3. Google OAuth mobile gate — frontend-side redirect
**Decision**: After Google OAuth completes, the frontend checks `user.mobile_number` on the profile response. If absent, it redirects to `ProfileSetupPage` and blocks navigation until mobile is saved. The `ProtectedRoute` component enforces this gate on every page.

**Rationale**: Keeps the gate logic co-located with the auth guard already in `ProtectedRoute`. Backend already returns the user profile on the `/auth/me` endpoint; no new endpoint needed.

**Alternatives considered**: Backend middleware blocking all API calls until mobile is set — over-engineered; the frontend already has a profile check loop.

### 4. ProfileSetupPage extended for mobile
**Decision**: Extend the existing `ProfileSetupPage` (used for post-OAuth setup) to include a mandatory mobile number field. The page saves display name + UPI ID + mobile in one submit, or allows submitting with just mobile number if the others are already set.

**Rationale**: Reuses the existing flow instead of creating a new dedicated page. Consistent UX.

### 5. Registration form: mobile required, email optional
**Decision**: `RegisterPage` makes mobile a required field and email an optional field. The backend `/auth/register` endpoint accepts `mobile_number` (required) and `email` (optional).

**Rationale**: Matches the spec. Keeps the API minimal.

## Risks / Trade-offs

- **Existing users have no mobile number** → Migration sets `mobile_number = NULL` initially; existing users must fill it in on next login via the same ProfileSetupPage gate. [Risk: existing users locked out] → Mitigation: gate only triggers when `mobile_number IS NULL`; existing users can still log in and are redirected to setup.
- **Email now nullable** → Any code path that assumes `user.email` is non-null must be audited. [Risk: null reference errors] → Mitigation: update all CORS origin / email-based lookups to handle null.
- **Typo in mobile number** → No OTP verification means users can enter wrong numbers. Acceptable for MVP; OTP can be added later.

## Migration Plan

1. Add Alembic migration:
   - Add `mobile_number VARCHAR(20) UNIQUE` column (initially nullable to allow migration of existing rows)
   - Make `email` nullable
   - After migration, existing users will have `mobile_number = NULL` and be prompted on next login
2. Backend changes: update `User` model, auth schemas, register/login endpoints
3. Frontend changes: update forms, `ProtectedRoute`, `ProfileSetupPage`
4. Rollback: revert migration down + revert code; no data loss since mobile_number is new

## Normalization

Mobile numbers are normalized before storage and lookup:
- Strip a leading `+91` or `91` prefix (Indian country code)
- Strip spaces, dashes, and parentheses
- Enforce exactly 10 digits after stripping
- Normalization is applied on the **backend** at the point of write (register, profile save) and at the point of read (login identifier resolution, contributor search)
- The frontend MAY display a hint ("Enter 10-digit mobile number") but does not enforce format client-side
