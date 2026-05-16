## 1. Fund Creation Form — Start Date Defaults

- [x] 1.1 In `frontend/src/pages/CreateGroupPage.tsx`, change the `startMonth` state initialiser from `""` to `String(new Date().getMonth() + 1)` (1-indexed)
- [x] 1.2 Change the `startYear` state initialiser from `""` to `String(new Date().getFullYear())`
- [x] 1.3 Verify the month `<select>` and year `<select>` render with the current month/year pre-selected on page load

## 2. InstallmentPanel — Cycle Labels from start_date

- [x] 2.1 Add an optional `groupStartDate` prop (type `string | null | undefined`) to the `Props` interface in `frontend/src/components/InstallmentPanel.tsx`
- [x] 2.2 Update `cycleLabel()` to accept a third optional `startDate` parameter; when it is a non-empty string use it as the base date instead of `createdAt`
- [x] 2.3 Pass `groupStartDate={group.start_date}` from `GroupDashboardPage` to `InstallmentPanel`
- [x] 2.4 Pass `groupStartDate` through to `cycleLabel()` call sites inside `InstallmentPanel`
- [x] 2.5 Verify that for a group with `start_date = "2024-01-01"`, cycle 1 shows "Jan 2024" in the dropdown

## 3. InstallmentPanel — Auto-expand Sub-member Slots

- [x] 3.1 In `InstallmentPanel`, after installment data loads, compute the set of slot IDs that have `sub_members.length > 1` from the `slots` prop
- [x] 3.2 Use a `useEffect` that runs when `slots` changes to initialise `expandedSlots` with all slot IDs that have more than one sub-member (only on first meaningful render — guard with a ref or only when `expandedSlots` is still empty)
- [x] 3.3 Verify that a slot with multiple sub-members renders the sub-member rows visible on first load without any click

## 4. Verification

- [x] 4.1 Open Create Fund page and confirm Start Month and Start Year are pre-selected to the current month/year
- [x] 4.2 Create a fund with the default start date, open the Overview tab, and confirm cycle 1 label matches the start month
- [x] 4.3 Open a group with at least one slot that has sub-members, confirm sub-member rows are visible immediately on the Overview tab
