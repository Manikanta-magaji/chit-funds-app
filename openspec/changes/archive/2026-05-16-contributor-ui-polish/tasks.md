## 1. Fix Suggestion Transparent Background

- [x] 1.1 In `frontend/src/index.css`, change `.suggestion-list` background from `var(--surface)` to `var(--bg-card)` so it is always fully opaque
- [x] 1.2 Add `position: absolute; width: 100%; z-index: 20;` to `.suggestion-list` so it overlays content rather than pushing it down

## 2. Fix Suggestion Dismiss After Selection

- [x] 2.1 Add `dismissed?: boolean` field to `SubDraft` interface in `AddContributorModal.tsx`
- [x] 2.2 In sub-member draft `onChange` (name field), reset `dismissed: false` when admin types
- [x] 2.3 In sub-member `UserSuggestion` `onSelect`, set `dismissed: true` on the selected draft
- [x] 2.4 Pass `hide={draft.dismissed}` prop to `UserSuggestion` in sub-member rows; update `UserSuggestion` to accept and honour this prop (return `null` when `hide` is `true`)
- [x] 2.5 Verify the top-level contributor name input already dismisses on select (name is cleared to `""` — no change needed)

## 3. Move Admin Management to Settings Tab

- [x] 3.1 Remove `<AdminManagementSection ... />` JSX from the Contributors tab render block in `GroupDashboardPage.tsx`
- [x] 3.2 Add `<AdminManagementSection ... />` to the Settings tab render block, between the Fund Settings card and the Danger Zone card

## 4. Verification

- [ ] 4.1 Select a user from suggestion in AddContributorModal top-level name field — dropdown disappears
- [ ] 4.2 Select a user from suggestion in a sub-member row — dropdown disappears, name/mobile/UPI pre-filled
- [ ] 4.3 Suggestion dropdown has solid white background — no text bleeding through from behind
- [ ] 4.4 Contributors tab no longer shows Admin Management section
- [ ] 4.5 Settings tab shows Admin Management section below Fund Settings with H3 heading
