## Context

The Contributors tab uses a single `expandedSlotId: number | null` state to show/hide one sub-member editor at a time. Registration status is communicated via text badges (`badge-registered` / `badge-offline`). The sub-member editor renders two rows per draft (name/badge/amount on row 1, mobile/UPI on row 2) and displays an instructional paragraph. The `AddContributorModal` footer lacks bottom padding, causing buttons to sit flush against the modal border.

## Goals / Non-Goals

**Goals:**
- Remove the "Edit or rearrange…" instructional text from the sub-member editor
- Show sub-members in a compact read-only view by default (name only); a single **Edit** button per slot opens edit mode for all sub-members in that slot simultaneously
- **Edit mode** shows all sub-member fields (name, mobile, UPI, amount) in a **single flex row** per sub-member — no secondary row
- Total split amount is shown and validated live in edit mode; Save is disabled unless the total matches the slot's installment amount
- The **Remove** button for a sub-member is shown ONLY while the slot is in edit mode; it is hidden in view mode. Removing a sub-member recalculates the running total immediately — Save remains disabled if the total is now invalid
- Replace `Registered` / `Unregistered` text badges with colour-tinted row backgrounds
- Auto-expand (show sub-member list in read-only view) all slots that have sub-members when the Contributors tab loads
- Add bottom padding to `AddContributorModal` footer
- Before opening the Add Contributor modal, check whether the group still has capacity (slot count < total cycles); if the group is full, show an inline error instead of opening the modal

**Non-Goals:**
- Changing the sub-member save/validate logic
- Altering mobile/UPI validation requirements
- Redesigning the contributor slot cards beyond the above items

## Decisions

### 1. Multi-expand state: `Set<number>` instead of single `expandedSlotId`

**Decision:** Replace `expandedSlotId: number | null` with `expandedSlotIds: Set<number>`.

**Rationale:** With a single ID, only one editor can be open at a time — incompatible with auto-expanding all sub-member slots on tab load. A `Set` allows any combination of slots to be open simultaneously.

**Alternative considered:** Keep single ID and initialise to the first slot with sub-members. Rejected: only expands one slot; if there are three slots with sub-members the others remain collapsed.

**Initialisation:** A `useEffect` on `activeTab === "contributors"` seeds the set with the IDs of all slots where `sub_members.length > 0`.

### 2. Single bulk-edit mode per slot (replaces per-row Edit)

**Decision:** A single **Edit** button in the sub-member section header enters edit mode for *all* sub-members of that slot at once. Exiting edit mode (Save or Cancel) returns to view mode.

**State:** `editingSubsSlotId: number | null` tracks which slot is in edit mode. `editSubsDrafts` holds working copies of all sub-members.

**Edit row layout:** All fields — name, mobile, UPI, amount — appear in a **single flex row** per sub-member (no secondary row for mobile/UPI). Registered sub-members show their name as read-only text; all other fields are inputs.

**Width allocation:** name `flex: 3`, mobile `flex: 2`, UPI `flex: 2`, amount `flex: 1` with `minWidth: 80`.

**Remove in edit mode (all sub-members):** The Remove button is visible for **all** sub-members — both offline and registered — while that slot is in edit mode. It is hidden in view mode. Removing a registered sub-member is allowed; the `setSubMembers` PUT replaces the full list atomically. Clicking Remove deletes the row from `editSubsDrafts` immediately and recalculates the running total. Save remains disabled if the total is now invalid.

**Minimum sub-member guard:** If the edit form reaches zero rows, Save is disabled and an inline error is shown ("At least one sub-member is required."). This prevents saving a slot with no sub-members.

**Registered sub-member field visibility in edit mode:** Registered sub-members show their name as read-only text (unchanged). Mobile and UPI ID fields are rendered as disabled `<input>` elements showing the stored values — so the admin can see what's on record without being able to change them. Only the split amount is editable for registered sub-members.

**Total validation:** A live total indicator (`₹X / ₹Y ✓/✗`) is shown at the bottom of the edit section at all times while in edit mode. Save is disabled until `Math.abs(total - installmentAmount) < 0.01`.

**Alternative considered:** Per-row Edit buttons (previous implementation). Rejected: the user cannot see the running total across all rows when editing one at a time.

**Add sub-member in edit mode:** While in edit mode, a "+ Add Sub-member" button appears in the sub-member header. Clicking it appends a blank offline row to `editSubsDrafts` (using a temporary negative id for React key). The save function uses `setSubMembers` PUT (replace-all) rather than individual PATCH/DELETE calls — this handles created, updated, and removed rows in one API call and avoids the need to diff original vs draft.

### 2a. First-time Split form (+Split) — single row layout, pre-populated mobile

**Decision:** The `+Split` first-time add form (shown when a slot has no sub-members yet) renders each sub-member draft as a **single flex row** — name/suggestion (flex 3), mobile (flex 2), UPI (flex 2), amount (flex 1) — consistent with the edit mode row layout.

**Pre-populate mobile:** When the admin clicks "+Split", the first draft row is initialised with the slot's existing `mobile_number` (and `name`) so the admin does not have to re-enter details they already provided.

**Alternative considered:** Keep the 2-row layout (name+amount row, then conditional mobile+UPI row). Rejected: inconsistent with edit mode; the conditional row appearing on typing is jarring.

### 3. Add Contributor pre-check before opening modal

**Decision:** Before opening the Add Contributor modal, the UI checks whether `slots.length >= group.total_cycles`. If the group is full, an inline error message is shown next to the Add Contributor button and the modal does NOT open.

**Rationale:** The backend already returns a 400 for this case, but surfacing the error before the modal opens gives faster feedback and avoids form-fill wasted effort.

**Alternative considered:** Open modal and let the backend return an error on submit. Rejected: user fills the form only to get an error at the last step.

### 4. Mobile number normalization and validation

**Decision:** Before submitting any mobile number to the API — whether on an offline contributor slot, a sub-member in the +Split form, or a sub-member in bulk edit mode — the frontend normalises the raw input and validates the result.

**Normalization rules (applied in order):**
1. Strip all non-digit characters (spaces, `+`, `-`, `(`, `)`, `.`).
2. If the result is 12 digits and starts with `91`, drop the leading `91` (international prefix).
3. If the result is 11 digits and starts with `0`, drop the leading `0` (STD trunk prefix).

**Validation rule:** After normalization, the value MUST be exactly 10 digits and MUST start with a digit in the range 6–9 (valid Indian mobile number range).

**Implementation:** A shared `normalizeMobile(raw: string): string | null` utility in `frontend/src/utils/normalizeMobile.ts` returns the normalised 10-digit string on success or `null` on failure.

**Error surface:** If normalization returns `null`, an inline error is shown before any API call is made. The error identifies which field is invalid (e.g. "Mobile number for "Ravi" is not a valid 10-digit number."). No API call is fired.

**Applies to:**
- `AddContributorModal` — offline single-contributor `mobile` field and each `subDrafts[].mobile_number`
- `GroupDashboardPage` `saveSubMembers` — each `subDrafts[].mobile_number` in the +Split add form
- `GroupDashboardPage` `saveSubMemberEdits` — each `editSubsDrafts[].mobile_number` in bulk edit

### 3. Colour-coded background instead of text badges

**Decision:** Add CSS classes `.slot-registered` (green tint) and `.slot-offline` (neutral tint) applied to `.contributor-block`. Remove `badge-registered` / `badge-offline` spans from contributor rows and sub-member draft rows.

**Colour values:**
- Registered: `background: #f0fdf4` (light green, matches common success palette)
- Offline: default card background (no extra tint needed — the absence of green is sufficient signal)

**Alternative considered:** Keep badges but change text to icons. Rejected: icon badges still add visual noise without improving scannability.

**Sub-member rows in editor:** Remove the `badge-registered` / `badge-offline` span inside draft rows. The parent slot card's background already communicates status; repeating it per draft is redundant.

### 4. Remove instructional paragraph in sub-member editor

**Decision:** Delete the `<p className="text-muted">` paragraph containing "Edit or rearrange below…" / "Add the people sharing this slot…".

**Rationale:** The header line already has the total requirement. The instruction is self-evident once the user has opened the editor.

### 5. Modal footer padding

**Decision:** Add `paddingBottom: "1rem"` (or equivalent CSS) to `.modal-footer` in `AddContributorModal.tsx` inline style, or add a global `.modal-footer` padding rule in `index.css`.

**Decision:** Use `index.css` global rule — consistent across all modals.

## Risks / Trade-offs

- [Multi-expand Set initialisation] If slots are loaded asynchronously after the tab switches, the `useEffect` may fire before `slots` is populated. **Mitigation:** Add `slots` as a dependency to the effect so it re-runs when data arrives.
- [Edit row layout] Narrower viewports may make the edit row cramped. **Mitigation:** Inputs get `min-width: 0` and allow wrapping via `flex-wrap: wrap`.
- [Removing instructional text] First-time users lose the hint "saving replaces all sub-members". **Mitigation:** Admin-only UI; Save button label is sufficient.
- [Edit state lost on query invalidation] If the query re-fetches while a row is in edit mode, the edit state resets. **Mitigation:** Acceptable — save is fast and single-admin flows make conflicts unlikely.
- [Removing a registered sub-member is irreversible within the edit session] After clicking Remove on a registered sub-member row, the only way to undo is to Cancel the whole edit. **Mitigation:** Cancel is prominently available; no data is lost until Save is clicked.
- [Registered user mobile/UPI stored on sub-member record may be null] When a registered user was added as sub-member, their mobile/UPI may not have been stored on the sub-member row (they're on the user profile). **Mitigation:** Show empty disabled inputs in that case — the admin can see there is no stored value, which is informative without being misleading.
- [setSubMembers PUT removes a registered sub-member server-side] The backend PUT endpoint replaces all sub-members atomically. Removing a registered user via omission from the list is intentionally permitted (unlike the old DELETE endpoint which blocked it). **Mitigation:** The Remove button is an explicit admin action with Cancel available; acceptable admin power.
