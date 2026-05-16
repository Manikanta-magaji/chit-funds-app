## Why

Three small but visible UI bugs and a navigation inconsistency are degrading the contributor management experience: suggestion dropdowns don't dismiss after selection, the dropdown background is transparent (making text illegible), and the Group Admin management section is buried in the Contributors tab where it doesn't belong.

## What Changes

- **Fix**: After selecting a user from an auto-suggest dropdown in `AddContributorModal` (and in `GroupDashboardPage` sub-member editor), the suggestion list must be dismissed immediately
- **Fix**: Suggestion dropdown has a transparent/semi-transparent background — underlying page content bleeds through, making the dropdown text unreadable; apply a solid opaque background
- **Move**: Group Admin management section relocated from the Contributors tab to the Settings tab (under an H3 heading), where it sits alongside other administrative controls

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `contributor-management`: Suggestion UX — dismiss on select; opaque dropdown background
- `group-dashboard-tabs`: Admin management section now lives in Settings tab, not Contributors tab

## Impact

- `frontend/src/components/AddContributorModal.tsx` — suggestion dismiss after user select
- `frontend/src/pages/GroupDashboardPage.tsx` — sub-member suggestion dismiss; move admin section JSX from Contributors tab to Settings tab
- `frontend/src/index.css` (or component inline styles) — suggestion dropdown background fix
