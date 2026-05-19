## 1. Project Scaffolding

- [x] 1.1 Create monorepo directory structure: `backend/` and `frontend/` at the project root
- [x] 1.2 Initialize FastAPI project in `backend/` with `pyproject.toml` and install dependencies (fastapi, uvicorn, sqlalchemy, alembic, pydantic, python-jose, passlib, httpx, python-dotenv)
- [x] 1.3 Create `.env.example` with required variables: `SECRET_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `DATABASE_URL`
- [x] 1.4 Initialize React project in `frontend/` using Vite (React + TypeScript template) and install dependencies (react-router-dom v6, @tanstack/react-query, axios)
- [x] 1.5 Enable SQLite WAL mode in the database initialization script

## 2. Database Schema and Migrations

- [x] 2.1 Create SQLAlchemy models: `User` (id, email, hashed_password, google_id, display_name, mobile, upi_id, is_profile_complete)
- [x] 2.2 Create SQLAlchemy model: `ChitGroup` (id, name, installment_amount, total_cycles, current_cycle, created_by)
- [x] 2.3 Create SQLAlchemy model: `GroupAdmin` (group_id, user_id) — join table for admin roles
- [x] 2.4 Create SQLAlchemy model: `ContributorSlot` (id, group_id, name, is_offline, linked_user_id nullable)
- [x] 2.5 Create SQLAlchemy model: `SubMember` (id, slot_id, name, linked_user_id nullable, split_amount)
- [x] 2.6 Create SQLAlchemy model: `Cycle` (id, group_id, cycle_number, winner_slot_id nullable, is_closed)
- [x] 2.7 Create SQLAlchemy model: `InstallmentPayment` (id, cycle_id, slot_id, sub_member_id nullable, status [unpaid/pending/paid], confirmed_by, paid_at)
- [x] 2.8 Create SQLAlchemy model: `PayoutRecord` (id, cycle_id, winner_slot_id, confirmed_by, payout_date, confirmed_by_winner)
- [x] 2.9 Initialize Alembic and generate the first migration from the models
- [x] 2.10 Apply migration and verify schema with a quick sanity check script

## 3. Backend: Authentication

- [x] 3.1 Implement password hashing utilities using `passlib` (bcrypt scheme)
- [x] 3.2 Implement JWT creation and validation utilities using `python-jose` (HS256, 60-minute expiry, HTTP-only cookie)
- [x] 3.3 Create `POST /api/auth/register` — email/password registration with duplicate email check and password length validation
- [x] 3.4 Create `POST /api/auth/login` — email/password login returning JWT in HTTP-only cookie
- [x] 3.5 Create `POST /api/auth/logout` — clear session cookie
- [x] 3.6 Implement Google OAuth Authorization Code Flow: `GET /api/auth/google` (redirect to Google) and `GET /api/auth/google/callback` (exchange code, create/link user, set cookie)
- [x] 3.7 Create FastAPI dependency `get_current_user` that validates the JWT cookie and returns the user
- [x] 3.8 Create `GET /api/auth/me` — return current user details

## 4. Backend: User Profile

- [x] 4.1 Create `PUT /api/users/me/profile` — update display_name, mobile, upi_id; infer upi_id as `<mobile>@upi` if not provided; set `is_profile_complete = True`
- [x] 4.2 Create FastAPI middleware/dependency `require_complete_profile` that returns 403 if the user's profile is incomplete
- [x] 4.3 Apply `require_complete_profile` to all group and contributor endpoints

## 5. Backend: Chit Group Management

- [x] 5.1 Create `POST /api/groups` — create a chit group (name, installment_amount, total_cycles); auto-assign creator as admin; create Cycle 1 record
- [x] 5.2 Create `GET /api/groups` — list all groups where the current user is admin or contributor
- [x] 5.3 Create `GET /api/groups/{group_id}` — return group details including admins, contributors, current cycle info
- [x] 5.4 Create `POST /api/groups/{group_id}/admins` — grant admin role to a group member (admin only)
- [x] 5.5 Create `DELETE /api/groups/{group_id}/admins/{user_id}` — revoke admin role; enforce last-admin protection

## 6. Backend: Contributor Management

- [x] 6.1 Create `POST /api/groups/{group_id}/slots` — add a contributor slot (name, optional linked_user_id); enforce slot count ≤ total_cycles
- [x] 6.2 Create `GET /api/groups/{group_id}/slots` — list all contributor slots with sub-members and payment status for the current cycle
- [x] 6.3 Create `PUT /api/groups/{group_id}/slots/{slot_id}/sub-members` — set sub-member split configuration; validate split amounts sum to installment_amount
- [x] 6.4 Create `PUT /api/groups/{group_id}/slots/{slot_id}/link` — link an offline slot to a registered user account
- [x] 6.5 Create `DELETE /api/groups/{group_id}/slots/{slot_id}` — remove a slot; block if cycle 1 has started

## 7. Backend: Installment Tracking

- [x] 7.1 Create `GET /api/groups/{group_id}/cycles/{cycle_number}/installments` — list payment status per slot/sub-member for a cycle
- [x] 7.2 Create `PUT /api/groups/{group_id}/cycles/{cycle_number}/installments/{slot_id}` — admin marks slot installment as paid or unpaid
- [x] 7.3 Create `POST /api/groups/{group_id}/cycles/{cycle_number}/installments/{slot_id}/self-report` — contributor submits self-reported payment (sets status to "pending")
- [x] 7.4 Create `PUT /api/groups/{group_id}/cycles/{cycle_number}/installments/{slot_id}/confirm` — admin confirms or rejects a pending self-reported payment
- [x] 7.5 Create `POST /api/groups/{group_id}/cycles/advance` — close current cycle and open next; enforce winner-required rule; warn on unpaid slots (require force flag)

## 8. Backend: Prize Draw

- [x] 8.1 Create `POST /api/groups/{group_id}/cycles/{cycle_number}/draw/random` — server-side random draw using `secrets.choice` over eligible slots; return candidate to admin for confirmation
- [x] 8.2 Create `POST /api/groups/{group_id}/cycles/{cycle_number}/draw/manual` — accept a slot_id; enforce eligibility warning and optional override flag
- [x] 8.3 Create `POST /api/groups/{group_id}/cycles/{cycle_number}/draw/confirm` — confirm the selected winner and persist to Cycle record
- [x] 8.4 Create `GET /api/groups/{group_id}/draw-history` — return list of cycles with winner slot, payout status

## 9. Backend: Payout Confirmation

- [x] 9.1 Create `POST /api/groups/{group_id}/cycles/{cycle_number}/payout` — admin records payout as completed; enforce that a winner exists
- [x] 9.2 Create `POST /api/groups/{group_id}/cycles/{cycle_number}/payout/winner-confirm` — prize winner self-confirms receipt of payout
- [x] 9.3 Create `GET /api/users/me/payout-history` — return all cycles where current user's slot won, with payout status

## 10. Frontend: Auth Screens

- [x] 10.1 Build Login page with email/password form and "Sign in with Google" button
- [x] 10.2 Build Register page with email/password fields and validation feedback
- [x] 10.3 Implement Google OAuth redirect button that calls `GET /api/auth/google`
- [x] 10.4 Build Profile Setup page (display name, mobile, UPI ID) shown on first login when profile is incomplete; auto-fill name and infer UPI ID
- [x] 10.5 Implement protected route wrapper that redirects unauthenticated users to login and incomplete-profile users to profile setup

## 11. Frontend: User Profile

- [x] 11.1 Build Profile Settings page (editable display name, mobile, UPI ID) accessible from the top nav
- [x] 11.2 Show inferred UPI ID with a visible "Edit" prompt if it was auto-generated

## 12. Frontend: Group Management

- [x] 12.1 Build "Create Group" form (name, installment amount, total cycles) with inline validation
- [x] 12.2 Build Group List page showing all groups the user belongs to with role indicator (admin/contributor)
- [x] 12.3 Build Group Dashboard page with current cycle summary: payment progress bar, prize winner badge, quick-action buttons (Mark Payments, Draw Prize, Advance Cycle)
- [x] 12.4 Build Admin Management panel within the group settings page (grant/revoke admin with confirmation dialogs)

## 13. Frontend: Contributor Management

- [x] 13.1 Build Contributor Slots list within the group page showing slot name, linked user, and payment status chips
- [x] 13.2 Build "Add Contributor" modal — search registered users or enter offline name
- [x] 13.3 Build Sub-member split configuration panel — add sub-members with split amounts; real-time validation of total
- [x] 13.4 Build "Link to Account" action on offline contributor slots for admins

## 14. Frontend: Installment Tracking

- [x] 14.1 Build Installment Tracking page (per-cycle view) with a table of slots, payment status, and toggle actions for admins
- [x] 14.2 Add "Mark as Paid" / "Unmark" toggle buttons for each slot row (admin only)
- [x] 14.3 Add "Report Payment" button for contributors on their own slot row
- [x] 14.4 Build Pending Confirmations panel for admins showing self-reported payments awaiting approval
- [x] 14.5 Add "Advance Cycle" button with a confirmation dialog that lists unpaid slots as warnings

## 15. Frontend: Prize Draw

- [x] 15.1 Build Prize Draw modal with two tabs: "Random Draw" and "Manual Select"
- [x] 15.2 Implement Random Draw tab — show "Draw" button; display animated winner reveal card; show "Confirm" and "Cancel" buttons
- [x] 15.3 Implement Manual Select tab — dropdown/list of eligible contributor slots; show eligibility warnings if selecting a previous winner
- [x] 15.4 Build Prize History list view (per group) showing cycle number, winner name, and payout status badge

## 16. Frontend: Payout Confirmation

- [x] 16.1 Add "Mark Payout Sent" button on the group dashboard for the current cycle's winner (admin only)
- [x] 16.2 Add "Confirm Receipt" button visible to the prize winner on their dashboard and the prize history page
- [x] 16.3 Build My Payout History page showing cycles won and payout status

## 17. Frontend: Shared Components and UX Polish

- [x] 17.1 Build top navigation bar with group switcher, profile avatar, and logout button
- [x] 17.2 Add loading spinners and skeleton screens for all data-fetching views
- [x] 17.3 Add toast notifications for success and error actions (payment marked, draw confirmed, etc.)
- [x] 17.4 Ensure all forms display inline validation errors in plain language
- [x] 17.5 Make all tables and forms responsive for mobile-width viewports

## 18. Testing and Validation

- [x] 18.1 Write backend unit tests for JWT utilities, UPI ID inference, and prize draw eligibility logic
- [x] 18.2 Write API integration tests for auth endpoints (register, login, Google callback mock)
- [x] 18.3 Write API integration tests for group creation, admin management, and contributor slot endpoints
- [x] 18.4 Write API integration tests for installment tracking and advance-cycle enforcement rules
- [x] 18.5 Write API integration tests for prize draw (random and manual) and payout confirmation endpoints
- [x] 18.6 Manually test the end-to-end flow: create group → add contributors → run cycle → draw → pay → advance

## 19. Requirement Clarifications Follow-up

- [x] 19.1 Enforce global uniqueness for `display_name` in backend validation and persistence rules
- [x] 19.2 Add/adjust user lookup API for exact-match contributor/sub-member suggestions (exact display name or exact email only)
- [x] 19.3 Add link-confirmation requirement to contributor and sub-member mapping endpoints
- [x] 19.4 Ensure any group admin can perform contributor/sub-member mapping actions
- [x] 19.5 Ensure newly linked users can see historical and current cycle data immediately after mapping
- [x] 19.6 Update contributor and sub-member UI to show registered/unregistered status indicators consistently
- [x] 19.7 Add integration tests covering partial-match suggestion behavior, duplicate display-name rejection, mapping confirmation flow, and immediate historical visibility after linking

## 20. Feature Additions and Bug Fixes

- [x] 20.1 Extend user search to match partial display name and partial email (case-insensitive LIKE), plus exact mobile number match
- [x] 20.2 Update contributor/sub-member search input placeholders to indicate mobile search is supported
- [x] 20.3 Add 500 ms debounce to user search API calls in contributor and sub-member input fields
- [x] 20.4 Add `DELETE /api/groups/{group_id}` endpoint (admin only) with cascading delete of all related records
- [x] 20.5 Add "Delete Fund" button in group dashboard header (admin only) with browser confirmation dialog and navigate-to-groups after deletion
- [x] 20.6 Add `btn-danger` CSS class for destructive action buttons
- [x] 20.7 Fix sub-member suggestion dropdown positioning — render absolutely below the input field
- [x] 20.8 Enforce uniform column layout across existing and draft sub-member rows (name | status | amount | actions)
- [x] 20.9 Show "Unregistered" badge in draft sub-member rows when no user is selected
- [x] 20.10 Show "partially paid" chip label when slot payment status is `partial`
- [x] 20.11 Fix slot-level payment status aggregation in `list_slots`: compare paid sub-member payment rows vs. total sub-member count
- [x] 20.12 Apply same aggregation fix in `get_installments` endpoint for consistent partial/paid/unpaid display
- [x] 20.13 Disable Mark Paid buttons in InstallmentPanel until prize draw is performed for the current cycle; show info banner for admins
- [x] 20.14 Allow linked members to Mark Paid / Undo for their own slot (backend: slot owner or sub-member owner authorized)
- [x] 20.15 Scope member Mark Paid to their specific slot or sub-member row only (no cross-slot access)
- [x] 20.16 Fix React key-prop warning: replace `<>` with `<React.Fragment key={...}>` in InstallmentPanel list items
