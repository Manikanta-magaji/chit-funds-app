## Context

The Group Dashboard (`GroupDashboardPage.tsx`) is a single 900+ line file that vertically stacks six distinct sections: Stats, Installments, Contributors, Settings, Admins, and Prize History. Regular members only interact with the Overview and History sections; admins additionally use Contributors, Settings, and Admins. Rendering everything at once means users must scroll past content irrelevant to their role and current task. The fix is a client-side tab bar with four tabs — the page and all its data queries stay in the same component, only visibility changes.

## Goals / Non-Goals

**Goals:**
- Add a tab bar below the page header with four tabs: Overview, Contributors, History, Settings
- Settings tab is visible only to admins; non-admins see three tabs
- Active tab is tracked in local state; default is Overview
- Preserve all existing functionality — no API or backend changes
- New tab/panel CSS reuses the existing design token palette for visual consistency

**Non-Goals:**
- Persisting the active tab to the URL (can be added later as a follow-up)
- Lazy-loading data per tab (all queries already run in the same component; no change needed)
- Extracting tabs into separate route pages or child components
- Any change to backend, routing, or data model

## Decisions

### 1. Local `useState` for active tab (not URL hash)
URL hash persistence (e.g., `#contributors`) would survive page refresh and allow deep-linking, but adds complexity (hash parsing, back-button handling). Given non-technical users rarely deep-link into a specific tab, local state is simpler and sufficient. Can be added as a follow-on.

**Alternatives considered:** `useSearchParams` or hash routing — rejected for initial implementation to keep scope tight.

### 2. Four tabs: Overview · Contributors · History · Settings
- **Overview**: Stats row + Installment Tracking — the default view for all users; most frequently used
- **Contributors**: Slot management — relevant when adding/removing people or editing splits
- **History**: Prize draw table + Draw/Advance cycle actions — accessed once per cycle
- **Settings** *(admin-only)*: Fund settings form + Admin management — infrequently used admin tools

The Settings tab is hidden (not just disabled) for non-admins to avoid confusion.

**Alternatives considered:**
- Three tabs (merge Settings into Contributors) — rejected because settings and contributor management are distinct intents
- Five tabs (split Admins out) — rejected as overkill; admin management is a sub-task of settings

### 3. Inline tab bar component (no new file)
The tab bar is a simple `<div>` with styled buttons, implemented inline in `GroupDashboardPage.tsx`. Extracting it to a shared component adds file overhead for a pattern only used here.

### 4. CSS: new `.tab-bar` and `.tab-btn` classes in `index.css`
Added alongside existing `.section` styles. Uses existing CSS variables (`--primary`, `--border`, `--bg-card`, `--text-muted`) for consistency — no new design tokens.

## Risks / Trade-offs

- **Scroll position reset on tab switch**: When switching tabs the user returns to the top of the new tab's content. This is the expected browser behavior and is not a problem given the tabs are focused sections.
- **Settings tab disappears for non-admins mid-session**: If a user's admin rights are revoked while they are on the Settings tab, the tab will vanish and they'll be shown the Overview on next render. This is the correct behavior.
- **All data still fetches on mount**: Moving sections into tabs doesn't change query behavior — all `useQuery` hooks fire on component mount regardless of active tab. This is intentional (avoids loading spinners when switching tabs) and acceptable given the data set is small.
