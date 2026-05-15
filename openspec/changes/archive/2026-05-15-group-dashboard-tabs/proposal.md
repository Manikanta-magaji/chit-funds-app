## Why

The Group Dashboard page currently renders all sections — Stats, Installments, Contributors, Settings, Admins, and Prize History — vertically on a single page. This creates an overwhelming, scroll-heavy experience particularly on mobile, making it hard for non-technical users to find the action they need. Splitting the page into focused tabs lets users quickly navigate to what matters without cognitive overload.

## What Changes

- Replace the single-page vertical layout with a tabbed interface on the Group Dashboard
- **Overview tab**: Fund stats card row and the current cycle's installment tracking panel (the most-used view)
- **Contributors tab**: Contributor slot list, add-contributor form, sub-member editor, and link-account flow
- **History tab**: Prize draw history table and the Draw Prize / Next Cycle admin actions
- **Settings tab** *(admin-only)*: Fund settings form (name, installment amount, cycles) and Admin management panel (grant/revoke admins) — hidden entirely from non-admins

## Capabilities

### New Capabilities
- `group-dashboard-tabs`: Tab-based navigation layout for the Group Dashboard with four tabs — Overview, Contributors, History, and Settings (admin-only)

### Modified Capabilities
<!-- No existing spec-level requirements are changing — this is a layout/UX reorganisation only -->

## Impact

- `frontend/src/pages/GroupDashboardPage.tsx`: Major layout restructuring — add tab state, wrap each section group in a tab panel, add tab bar UI
- `frontend/src/index.css`: New tab bar and tab panel styles
- No backend changes required
- No API changes required
- No routing changes required (tab state is local / optionally URL-hash-based)
