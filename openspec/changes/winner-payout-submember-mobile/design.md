## Context

The chit fund app supports shared contributor slots (sub-members), where one slot's installment obligation is split among multiple individuals. When such a slot wins the prize draw, the current payout flow only handles a single winner (the slot), with no mechanism to distribute UPI Pay Now buttons to each sub-member. Additionally, offline (non-registered) sub-members and contributor slots have no mobile number stored, making UPI intent URL generation impossible at payout time.

Current state:
- `SubMember` model has `name`, `linked_user_id`, `split_amount` — but no `mobile_number` or `upi_id`.
- `ContributorSlot` model has no `mobile_number` or `upi_id` for offline slots.
- The UPI payment modal renders one Pay Now button targeting the single winning slot's UPI (from the linked user or a hardcoded field).
- Offline contributors can be added without any contact info.

## Goals / Non-Goals

**Goals:**
- When the winning slot has ≥2 sub-members, display one Pay Now button per sub-member, each encoding that sub-member's UPI ID/mobile and their proportional share amount.
- Mandate `mobile_number` when adding an offline contributor slot or offline sub-member.
- Derive a default UPI ID for offline sub-members/slots from their mobile number (`<mobile>@upi`) when no explicit UPI ID is provided.
- Backend returns sub-member payment breakdown in the winner details response.

**Non-Goals:**
- Changing how single-member slot payouts work (no regression).
- Collecting UPI IDs for registered users — they manage their own UPI ID on their profile.
- Sending actual payment notifications or tracking whether each sub-member was paid.

## Decisions

### 1. Store `mobile_number` and `upi_id` on `SubMember`
Adding these two nullable columns to the `SubMember` table for offline sub-members. For registered sub-members the values are resolved at runtime from the linked `User`. This keeps the model symmetric and avoids a separate offline-contact table.

**Alternative considered**: Store only mobile and derive `<mobile>@upi` at query time. Rejected because admins may know a sub-member's actual UPI ID; we should accept it explicitly while defaulting to `<mobile>@upi` when absent.

### 2. Store `mobile_number` and `upi_id` on `ContributorSlot`
Same rationale as SubMember — offline full-slot contributors also need a contact anchor for UPI. Registered slots resolve from linked `User`.

**Alternative considered**: A separate `OfflineContact` table joined from both models. Rejected as over-engineering for two columns.

### 3. Backend does NOT mandate `mobile_number` at slot creation for potentially-shared slots
After further design exploration (see below), the backend makes slot-level `mobile_number` **always optional at creation time**. The sub-member save endpoint continues to enforce mobile per offline sub-member. The only hard enforcement at the slot level is a lazy UI prompt when Pay Now is triggered and no UPI can be resolved.

**Rationale**: At slot creation time the admin may not yet know whether the slot will be solo or shared. Demanding mobile upfront creates confusion when the slot is shared (mobile belongs to sub-members, not the slot). Lazy enforcement at Pay Now time is sufficient — the admin knows mobile is needed before draw day.

**Alternative considered (original)**: HTTP 422 if `mobile_number` blank for offline slot creation. Rejected because it forces the admin to know at creation time whether the slot is solo or shared, which isn't always known upfront.

### 4. Winner response includes sub-member breakdown
The `/groups/{id}/cycles/{n}/winner` (or equivalent payouts endpoint) returns a new `sub_members` array when the winning slot has >1 sub-member. Each entry includes `name`, `upi_id` (resolved: explicit or `<mobile>@upi`), and `share_amount`. The frontend maps this array to individual Pay Now buttons.

**Alternative considered**: A dedicated `/payouts/submembers` endpoint. Rejected — the breakdown is intrinsically part of the winner payload and shouldn't require an extra round-trip.

### 5. Frontend renders per-sub-member Pay Now when `sub_members` present
`GroupDashboardPage` / `UpiPaymentModal` checks: if winner payload has `sub_members.length > 1`, render a list of Pay Now buttons instead of a single button. Each button opens the existing `UpiPaymentModal` pre-populated with that sub-member's UPI and share amount.

**Alternative considered**: Show one modal with multiple rows. Chosen single-button-per-sub-member for clarity with low-literacy users — each person can tap their own button independently.

### 7. Add-contributor form uses a "Just one person / Sharing with others" toggle

The add-contributor form presents a plain-English binary choice before asking for mobile details:

- **"Just one person"** (default) → mobile + UPI fields appear inline, mobile required before saving
- **"Sharing with others"** → mobile/UPI fields hidden at slot level; after saving, the slot auto-expands in the contributor list with a prompt to add sub-members; mobile is required per offline sub-member at that stage

The toggle is frontend-only state — nothing is persisted to the database. The database truth is whether sub-members exist. This means the admin can freely change their mind (add sub-members to a "solo" slot later), and no slot-type field is needed in the schema.

**Why a toggle, not a checkbox**: A toggle with two labelled states is more legible for non-tech elderly users than an unlabelled checkbox. Plain-language labels ("Just one person" / "Sharing with others") remove the need to understand app-specific terminology like "shared slot" or "sub-members".

**Auto-expand after shared slot save**: After saving a shared-intent slot (toggle set to "Sharing"), the UI immediately expands that slot's sub-member editor with an "Add the people sharing this slot" heading. This closes the gap between the two steps of the flow — the admin never has to hunt for how to continue.

- **Existing offline entries have null mobile**: Existing records won't fail validation (enforcement is forward-looking only). Admins will not be prompted to back-fill. → Mitigation: UI shows a "no UPI available" notice for sub-members with neither a linked user UPI nor a stored mobile.
- **`<mobile>@upi` as default UPI handle**: This format works for most Indian banks (BHIM) but may not resolve for all payment apps. → Mitigation: Treat as best-effort; admin can always set an explicit UPI ID.
- **DB migration**: Two new columns on `contributor_slots` and `sub_members`; both nullable so no data loss and backwards compatible. → Rollback: drop columns (no logic depends on them in older code).

### 6. Auto-link on registration
When a new user account is created (both the `POST /auth/register` path and the OAuth mobile-setup path), after persisting the user, the backend queries `ContributorSlot` where `is_offline=True AND mobile_number=<new_user_mobile>` and `SubMember` where `linked_user_id IS NULL AND mobile_number=<new_user_mobile>`, and sets `linked_user_id` to the new user's ID for each match.

**Why at registration time**: This is the earliest safe moment — the user record exists, the mobile is verified unique, and no admin action is needed. A background job or webhook alternative would add infrastructure complexity for a low-frequency event.

**Alternative considered**: Admin-triggered "link all offline by mobile" batch action. Rejected — auto-linking at registration is transparent to both admin and user, requires no manual step, and can't accidentally link the wrong person (mobile uniqueness is already enforced at registration).

**Conflict guard**: If an offline slot/sub-member already has a `linked_user_id` (shouldn't happen given uniqueness, but defensive), skip that entry.

## Migration Plan

1. Alembic migration: add `mobile_number VARCHAR(20)` and `upi_id VARCHAR` to `contributor_slots` and `sub_members` (both nullable).
2. Deploy backend with updated validation and updated winner response schema.
3. Deploy frontend with updated contributor forms and Pay Now multi-button rendering.
4. No data back-fill needed; existing offline entries display gracefully with a "no UPI" notice.
