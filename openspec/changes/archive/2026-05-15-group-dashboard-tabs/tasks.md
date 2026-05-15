## 1. CSS — Tab Bar Styles

- [x] 1.1 Add `.tab-bar` style to `index.css`: horizontal flex row, bottom border, margin-bottom
- [x] 1.2 Add `.tab-btn` style: padding, no background, border-bottom highlight for active state, hover state using existing CSS variables

## 2. Tab State — GroupDashboardPage

- [x] 2.1 Add `activeTab` state (`"overview" | "contributors" | "history" | "settings"`) defaulting to `"overview"`
- [x] 2.2 Render tab bar below the page header with tabs: Overview, Contributors, History, and Settings (Settings only when `isAdmin`)

## 3. Overview Tab

- [x] 3.1 Wrap the Stats grid and Installment Tracking panel in an Overview tab panel, shown only when `activeTab === "overview"`

## 4. Contributors Tab

- [x] 4.1 Wrap the Contributors section (slot list, add-contributor form, sub-member editor) in a Contributors tab panel, shown only when `activeTab === "contributors"`

## 5. History Tab

- [x] 5.1 Move the Draw Prize and Next Cycle admin buttons from the page header into the History tab panel
- [x] 5.2 Wrap the Prize History table and the admin action buttons in a History tab panel, shown only when `activeTab === "history"`

## 6. Settings Tab (admin-only)

- [x] 6.1 Wrap the Fund Settings form and Admin Management section in a Settings tab panel, shown only when `activeTab === "settings"` and `isAdmin`
- [x] 6.2 Remove the standalone ⚙ Settings button from the page header (settings are now accessed via the tab)
- [x] 6.3 Remove the Delete Fund button from the page header and place it at the bottom of the Settings tab panel

## 7. Cleanup

- [x] 7.1 Remove `showSettings` state and toggle logic now that the Settings panel is always visible inside its tab
- [x] 7.2 Verify the link-account confirmation modal and UPI payment modal still render correctly (they are overlays and should be unaffected by tab structure)
