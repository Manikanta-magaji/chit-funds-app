## Context

This is a greenfield application with no existing codebase. The target users are community chit fund organizers and contributors who are not necessarily tech-savvy. The stack is FastAPI (backend), React.js (frontend), and SQLite (database). The application must handle authentication, group/contributor management, monthly prize draws, installment tracking, and payout confirmation.

## Goals / Non-Goals

**Goals:**
- Provide a secure, multi-user web app for end-to-end chit fund management
- Support Google OAuth and email/password sign-up
- Allow admins to manage contributors (registered or offline)
- Support shared contributor slots (multiple sub-members splitting one installment)
- Automate random prize draw with admin override
- Track installment payments and payout confirmations per cycle
- Infer UPI ID from mobile number when not explicitly provided
- Keep the UI simple and accessible for non-technical users

**Non-Goals:**
- Actual payment processing or UPI transaction initiation (only tracking)
- SMS/email notification system (may be added later)
- Mobile native apps (web only)
- Multi-currency or international chit fund formats
- Audit logs or advanced reporting beyond basic history views

## Decisions

### 1. SQLite as the database
**Decision**: Use SQLite with SQLAlchemy ORM.  
**Rationale**: Low operational overhead for an early-stage app; no separate database server to manage; SQLAlchemy ORM allows easy migration to PostgreSQL if scaling becomes necessary.  
**Alternative considered**: PostgreSQL — more powerful but adds deployment complexity at this stage.

### 2. FastAPI with Pydantic models
**Decision**: All API endpoints use FastAPI with Pydantic v2 for request/response validation.  
**Rationale**: Auto-generates OpenAPI docs, enforces type safety, and provides a clean separation between domain models and transport schemas.

### 3. JWT-based session management
**Decision**: Use JWT (JSON Web Tokens) stored in HTTP-only cookies for authenticated sessions.  
**Rationale**: Stateless authentication reduces DB lookups per request; HTTP-only cookies protect tokens from XSS. Refresh tokens stored server-side for revocability.  
**Alternative considered**: Server-side sessions — simpler but requires session storage and doesn't scale as cleanly.

### 4. Google OAuth via Authorization Code Flow
**Decision**: Use Google OAuth 2.0 Authorization Code Flow (server-side) rather than the implicit or PKCE flows.  
**Rationale**: Keeps the client_secret on the server; more secure for web apps with a backend.

### 5. Contributor model with shared slots
**Decision**: A "contributor slot" is the billing unit within a group. A slot can be held by a single registered user or divided among multiple sub-members. The installment obligation belongs to the slot; sub-members define how to split it.  
**Rationale**: Reflects how chit funds work in practice where families or businesses share a slot.

### 6. UPI ID inference
**Decision**: If a user does not provide a UPI ID, derive it as `<mobile_number>@upi` and store it as the default; the user can override it later.  
**Rationale**: Most Indian UPI-enabled mobile numbers support this handle by default, reducing friction for new users.

### 7. React.js SPA with React Router
**Decision**: Single-page application using React 18, React Router v6, and TanStack Query for server state.  
**Rationale**: Smooth navigation without full-page reloads is critical for dashboard-style apps; TanStack Query simplifies cache invalidation after mutations.  
**Alternative considered**: Next.js — SSR adds complexity not needed for this primarily auth-gated app.

### 8. Prize draw randomization
**Decision**: Random prize draw is performed server-side using `secrets.choice` over eligible contributors (those who have not yet won this fund cycle). Admin can override by specifying a contributor manually.  
**Rationale**: Server-side randomization is auditable; `secrets` module provides cryptographic randomness.

### 9. Cycle-based data model
**Decision**: Each chit fund group has numbered cycles (Month 1, Month 2, …). Each cycle tracks: installment records per contributor slot, and a single prize winner.  
**Rationale**: Makes it straightforward to query "who has paid this month?" and "who won which month?" without complex date arithmetic.

### 10. Strict user matching for contributor mapping
**Decision**: User suggestions for contributor and sub-member mapping use partial matching on display name and email (case-insensitive LIKE), plus exact match on mobile number.  
**Rationale**: Partial matching makes it easier to find contributors who may be known by different name variations; exact mobile matching allows quick lookup when the mobile number is known. A 500 ms debounce prevents excessive API calls during typing.  
**Previous decision**: Exact-match only — updated after user feedback that partial matching is more practical.

### 11. Unique display names across users
**Decision**: Enforce globally unique `display_name` values across all user accounts.  
**Rationale**: Supports strict matching and reduces identity ambiguity during contributor/sub-member mapping.

### 12. Group-admin mapping authority with confirmation
**Decision**: Any group admin may map offline contributors/sub-members to registered users, but every link action requires explicit confirmation before persisting.  
**Rationale**: Enables shared operations by multiple admins while reducing accidental mis-linking.

### 13. Immediate historical visibility on linking
**Decision**: Once mapping is confirmed, the linked user immediately gains visibility into historical and current cycles related to the mapped contributor/sub-member.  
**Rationale**: Avoids delayed access and aligns account linkage with existing group history.

### 14. Registration status indicator
**Decision**: Show a clear registered/unregistered status for each contributor slot and each sub-member in admin and participant-facing views where applicable.  
**Rationale**: Makes identity state transparent without blocking cycle progress for offline entries.

### 15. Draw-required gate for Mark Paid
**Decision**: Mark Paid and Undo actions for any installment row are disabled until the prize draw for that cycle has been performed.  
**Rationale**: Ensures draw integrity is established before payment records are finalized; prevents out-of-order data entry.

### 16. Member self-service Mark Paid
**Decision**: Linked contributors and sub-members can mark their own installment as paid directly (no pending state). Admins can mark any slot.  
**Rationale**: Reduces admin overhead; direct marking is simpler than a self-report → confirmation two-step for straightforward cases.

### 17. Partial payment status for slots with sub-members
**Decision**: Slot-level payment status is derived from counting paid sub-member rows vs. total sub-member count. `paid` = all paid; `partial` = some paid; `unpaid` = none paid.  
**Rationale**: A single sub-member payment should not mark the whole slot as paid — this was a bug in the initial implementation.

### 18. Group deletion with cascade
**Decision**: Admins can permanently delete a group, cascading to remove all related records. Requires a browser confirm dialog.  
**Rationale**: Provides a clean-up path for test or incorrectly created groups. Irreversibility is acceptable; confirmation dialog is the safeguard.

## Risks / Trade-offs

- **SQLite concurrent writes** → Mitigation: Enable WAL mode; acceptable at low user counts. Document upgrade path to PostgreSQL.
- **Google OAuth credentials management** → Mitigation: Store OAuth client_id and client_secret in environment variables; never commit to source control. Provide a `.env.example`.
- **Offline contributor data accuracy** → Admin-managed offline contributors have no verification; Mitigation: Allow admin to link an offline contributor to a registered user account later.
- **UPI ID inference may be wrong** → `<mobile>@upi` is a common but not universal handle; Mitigation: Display the inferred ID with a clear "Edit" prompt on the profile page so users can correct it.
- **No payment integration** → The app tracks payments but does not initiate transfers; Mitigation: Clearly label all payment records as "self-reported" to set expectations.
- **Incorrect user mapping by admins** → Partial match + explicit confirmation before linking reduces accidental linkage.
- **Unique display name collisions during onboarding** → Mitigation: Return clear validation errors and prompt users to choose an available display name.
- **Group deletion is irreversible** → Mitigation: Browser confirmation dialog required; admin must explicitly confirm. No soft-delete — by design.

## Migration Plan

1. Set up the monorepo directory structure (`backend/`, `frontend/`).
2. Initialize SQLite DB and apply migrations via Alembic.
3. Configure Google OAuth credentials in `.env`.
4. Deploy backend (e.g., uvicorn) and serve frontend as static files or via a dev server.
5. Rollback: SQLite file backup before each schema migration; `alembic downgrade -1` to revert.

## Open Questions

- Should the random draw exclude contributors who are in arrears (unpaid installments)?  
  → Recommend: Yes, as a configurable group setting. Default: exclude.
- How many cycles does a chit fund group run? Fixed at group creation or open-ended?  
  → Recommend: Fixed at creation (total members = total cycles); enforce during group setup.
