## 1. Amount Computation Utility

- [x] 1.1 In `GroupDashboardPage.tsx`, add a `useQuery` call for `["installments", groupId, group.current_cycle]` using the same `getInstallments` function already used by `InstallmentPanel` — this reads from the TanStack Query cache without a new network request when the panel is already rendered
- [x] 1.2 Compute `myPayNowPositions` — an array of `{ label: string; amount: number }` for every unpaid position belonging to the current user: iterate primary slots (`linked_user_id === user.id`, add `installment_amount` if not paid) and sub-member positions (`sub_members[].linked_user_id === user.id`, add `split_amount` if the matching payment row is not paid)
- [x] 1.3 Derive `payNowTotal` as the sum of all amounts in `myPayNowPositions`; derive `payNowBreakdown` as the array itself (empty when single position)

## 2. UpiPaymentModal — breakdown prop

- [x] 2.1 Add optional prop `breakdown?: { label: string; amount: number }[]` to `UpiPaymentModal`'s `Props` interface
- [x] 2.2 When `breakdown` has 2+ entries, render a compact list above the `₹{amount}` line in the modal body showing each `label: ₹amount` row
- [x] 2.3 Update the `upi-amount` paragraph text to say "Total: ₹{amount}" when breakdown is shown, and keep existing "₹{amount}" display when no breakdown

## 3. Wire consolidated amount into Pay Now

- [x] 3.1 In `GroupDashboardPage.tsx`, change the `amount` prop passed to `UpiPaymentModal` from `group.installment_amount` to `payNowTotal || group.installment_amount` (fallback preserves single-position behaviour when installments aren't loaded yet)
- [x] 3.2 Pass `breakdown={payNowBreakdown.length > 1 ? payNowBreakdown : undefined}` to `UpiPaymentModal`
- [x] 3.3 Update the UPI URI `am` parameter to use `payNowTotal` so the deep-link amount also reflects the consolidated total

## 4. Winner detection and Pay Now visibility

- [x] 4.1 In `GroupDashboardPage.tsx`, derive `iAmTheWinner` as `mySlotIds.includes(winnerSlotId ?? -1)` where `mySlotIds` is the list of primary slot IDs linked to the current user
- [x] 4.2 In the "This Month's Winner" stat card, wrap the Pay Now button in `{!iAmTheWinner && winner_slot.upi_id && ( ... )}` so it is hidden when the user is the winner
- [x] 4.3 When `iAmTheWinner` is true and the winner slot has a UPI ID, render a congratulatory note in place of the button (e.g., _"You won this cycle 🎉"_ styled as muted text or a small badge)
- [x] 4.4 Ensure winner slots are excluded from `myPayNowPositions`: if a primary slot's `id === winnerSlotId`, skip it; if a sub-member's parent slot is the winner slot, skip the sub-member too

## 5. Verification

- [x] 5.1 Manual test: log in as a user with two full slots — Pay Now modal should show `2 × installment_amount` and a two-row breakdown
- [x] 5.2 Manual test: log in as a user with one full slot + one sub-member share — modal should show the combined amount and two-row breakdown
- [x] 5.3 Manual test: mark one of two positions as paid — modal should show only the remaining unpaid amount with a single-row breakdown (no breakdown list shown for 1 item)
- [x] 5.4 Manual test: log in as the winner of the current cycle — Pay Now button is hidden and congratulatory note is shown
- [x] 5.5 Manual test: log in as a multi-slot user where one slot is the winner — Pay Now button is still hidden; installment table still shows Mark Paid buttons for non-winner slots
- [x] 5.6 TypeScript check: `npx tsc --noEmit` passes with no errors in `src/`
