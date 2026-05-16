## Context

The contributor management UI has three independent polish issues discovered during QA:

1. **Suggestion list not dismissing after selection** — `UserSuggestion` renders based on `query` prop. In `AddContributorModal`, the top-level contributor name input correctly clears on select (`setName("")`), so the suggestion hides. But in the sub-member draft rows, the name field is set to `u.display_name` on select — which is non-empty — so `UserSuggestion` re-evaluates `query.trim()` as truthy and stays visible.

2. **Transparent suggestion background** — `.suggestion-list` uses `background: var(--surface)` but `--surface` is never defined in `index.css`. An undefined CSS variable resolves to its initial value, which for `background` is `transparent`. The background shows as 0% opaque until hover, when `background: var(--bg)` (which is defined) briefly applies to the hovered item.

3. **Admin Management in wrong tab** — `AdminManagementSection` is rendered in the Contributors tab. Administratively it belongs in Settings alongside fund settings, danger zone, and other admin-only controls.

## Goals / Non-Goals

**Goals:**
- Suggestion list hides immediately after a user is selected (all usage sites)
- Suggestion dropdown has a solid opaque background at all times (fix the undefined CSS variable)
- Admin Management section rendered in the Settings tab under its own H3 heading, removed from Contributors tab

**Non-Goals:**
- Redesigning the suggestion UI beyond the background fix
- Adding animation to suggestion show/hide
- Changing what fields AdminManagementSection manages

## Decisions

### 1. Suggestion dismiss: controlled visibility via `dismissed` flag per draft

**Problem**: `UserSuggestion` hides when `query.trim() === ""`. After selecting a sub-member, `draft.name` is set to the user's display name (non-empty), so `query` is still truthy and the list stays open.

**Decision**: Track a `dismissed` boolean alongside each `SubDraft`. On select, set `dismissed: true`. On name text change (typed, not selected), reset `dismissed: false`. Pass `dismissed` to `UserSuggestion` as an additional `hide` prop — when `true`, return `null` immediately regardless of query.

**Alternative considered**: Clear `draft.name` query by setting a separate `displayValue` vs `searchQuery` split. Rejected — more complex state; the `dismissed` flag is minimal and explicit.

**Alternative considered**: `useEffect` inside `UserSuggestion` to self-dismiss. Rejected — the component doesn't know when a selection happened externally; the parent must signal it.

### 2. Transparent background: define `--surface` or replace with `--bg-card`

**Decision**: Replace `background: var(--surface)` in `.suggestion-list` with `background: var(--bg-card)` (which is `#ffffff`, already used everywhere for card surfaces). Also add `position: absolute; z-index: 20; width: 100%` to `.suggestion-list` so the dropdown overlays content rather than pushing it down.

**Alternative considered**: Define `--surface` in the `:root` block. This works but the variable is only used in one place; replacing with the already-used `--bg-card` is cleaner.

### 3. Admin section location: move JSX block, not component

**Decision**: Remove the `<AdminManagementSection .../>` JSX from the Contributors tab render and add it to the Settings tab render between the Fund Settings card and the Danger Zone card. No changes to the `AdminManagementSection` component itself.

## Risks / Trade-offs

- `dismissed` flag must be reset on every keystroke; if state update batching causes a race it could briefly re-show the list. Mitigation: the `onChange` handler already replaces the full draft object — resetting `dismissed` there is atomic.
- Making `.suggestion-list` `position: absolute` means its parent needs `position: relative`. All current usage sites already wrap the input in a `position: relative` div, so this is safe.
