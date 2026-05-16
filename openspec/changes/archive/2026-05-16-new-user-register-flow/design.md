## Context

This change addresses three independent UX issues in the new-user onboarding and contributor visibility flows:

1. **Login CTA**: The registration link on the login page is styled as plain anchor text inside a footer paragraph. Users unfamiliar with digital products may not notice it. All other primary actions in the app use the `.btn.btn-primary` class.

2. **Name mismatch after mobile-link**: When an admin adds a contributor offline (e.g., name "Ravi Kumar", mobile 9876543210), and that person later registers as "R. Kumar" with the same mobile, the backend already auto-links the slot to the registered user (via `_link_offline_entries_by_mobile`). The slot now carries `linked_user_display_name = "R. Kumar"`. However the frontend displays `slot.name` ("Ravi Kumar") unconditionally, so other members see the old admin-typed name rather than the person's chosen display name.

3. **Sub-member visibility**: The Contributors tab expand button and the expanded sub-member view are both gated on `isAdmin`. A member who shares a slot with sub-members cannot see how the slot is split. There is no business reason to hide sub-member names from group members; the concern is only that non-admins should not be able to *edit* them.

## Goals / Non-Goals

**Goals**:
- Make the registration CTA visually prominent on the login page
- Show registered users' chosen display names in the contributor list
- Allow all group members to see sub-member name breakdowns (read-only)

**Non-Goals**:
- Updating the slot's stored `name` field on linking — the admin-typed name is preserved as the canonical slot identifier; display is overridden only in the UI
- Allowing non-admins to edit sub-member data (edit/add/remove remain admin-only)
- Any backend API changes

## Decisions

### 1. Display name override: UI layer only
Prefer `slot.linked_user_display_name ?? slot.name` at render time rather than writing back the registered user's name to the `ContributorSlot.name` DB column on registration.

**Rationale**: The slot name is the admin's label for the obligation (e.g., "Ravi from village"). Overwriting it on registration would be a surprising side-effect. The API already returns both names; the correct layer to reconcile them is the view.

**Alternative considered**: Update `slot.name` in `_link_offline_entries_by_mobile`. Rejected — mutating admin data silently violates least-surprise.

### 2. Sub-member expand button: remove `isAdmin` guard
Remove the `isAdmin &&` condition from both the expand button and the view-mode section. The edit-mode section (edit button, input rows, save/cancel) remains wrapped in `{editingSubsSlotId === slot.id && ...}` which is only set by the admin-only "Edit" button — so edit controls are naturally admin-only without an extra flag.

**Rationale**: Simplest change; no new role checks needed. The distinction between view and edit is already implicit in the editing state variable.

### 3. Login CTA: `btn btn-primary` on `<Link>`
Add `className="btn btn-primary"` to the existing `<Link to="/register">` element and replace the surrounding `<p className="auth-footer">` paragraph with a standalone block so the button renders at full width below the login form.

**Alternative considered**: Keep as inline link, just change colour. Rejected — it remains easy to miss in a dense form.

## Risks / Trade-offs

- [Risk] `linked_user_display_name` is null for offline slots → Mitigation: `?? slot.name` fallback ensures no blank names.
- [Risk] After removing the `isAdmin` gate on sub-member expand, all members can see sub-member names. In theory names could be considered sensitive. → Accepted trade-off: the group fund itself is already shared; all members already see all slot names, so sub-member names are no more sensitive.

## Migration Plan

Frontend-only changes; no DB migrations or API version bumps needed. Deploy as a standard frontend build. No rollback steps required.

## Open Questions

None.
