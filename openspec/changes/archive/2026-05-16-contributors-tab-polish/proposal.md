## Why

The Contributors tab has accumulated visual noise and UX friction: excessive whitespace in sub-member rows, a confusing instructional label, registration status shown as text tags when colour alone would suffice, and a modal footer that lacks padding. These issues make the tab feel unfinished and harder to scan at a glance.

## What Changes

- Remove the "Edit or rearrange below — saving replaces all sub-members:" instructional label from the sub-member editor section
- Merge the two-row sub-member layout into a single inline row: name · mobile · UPI ID · amount
- Replace `registered` / `unregistered` text badges on contributor slots and sub-members with colour-coded background highlights (e.g. green tint for registered, neutral/muted for offline)
- Always expand sub-member rows by default when the Contributors tab loads — no collapsed state on first render
- Add bottom padding / margin to the `AddContributorModal` footer so the Cancel and Add Contributor buttons do not flush against the modal border

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `contributor-management`: visual presentation of contributor and sub-member rows changes (badge → colour highlight; row layout merges to single line; sub-members always expanded)
- `group-dashboard-tabs`: Contributors tab default state changes (sub-members always shown expanded on tab load)

## Impact

- `frontend/src/pages/GroupDashboardPage.tsx` — sub-member row layout, registration highlight, always-expanded state
- `frontend/src/components/AddContributorModal.tsx` — footer padding
- `frontend/src/index.css` — new colour-highlight utility classes for registered/offline states
