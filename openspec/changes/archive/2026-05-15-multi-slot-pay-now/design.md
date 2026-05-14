## Context

The group dashboard shows a "This Month's Winner" stat card with a **Pay Now** button. Clicking it opens a UPI payment modal with a QR code for the winner's UPI ID. Currently the amount passed to the modal is always `group.installment_amount` — the per-slot installment for one contributor.

A user may hold multiple positions in a group:
- **Type A**: Two (or more) full contributor slots — each owes the full `installment_amount`
- **Type B**: One full slot + sub-member share in another slot — owes `installment_amount` + `split_amount`
- **Type C**: Sub-member in two or more slots — owes the sum of their `split_amount` values

In all cases the current modal shows only `installment_amount`, causing under-payment. The user needs to make separate trips to the UPI app for each position, which is error-prone.

All data needed to compute the correct total is already available client-side: `slots` (linked user + sub-members) and `installments` (per-slot payment status including per-sub-member payment rows). No backend changes are required.

## Goals / Non-Goals

**Goals:**
- Compute the correct total unpaid amount across all of the current user's positions when Pay Now is clicked
- Exclude positions already marked as paid from the total
- Show a per-position breakdown inside the modal so the user understands what they are paying for
- Handle all position-type combinations (full slot, sub-member share, or mixed)
- Hide the Pay Now button entirely when the current user is the winner of the selected cycle

**Non-Goals:**
- Splitting the payment into separate UPI transactions per position (one consolidated payment is shown)
- Backend changes or new API endpoints
- Changing how admin-level payout recording works

## Decisions

### Compute amount on the frontend from existing data

The `slots` array (on `GroupDetail`) provides each slot's linked user and sub-members with `split_amount`. The `installments` query (already loaded for the current cycle) gives per-slot and per-sub-member payment status.

**Amount computation algorithm:**
1. Collect the user's **primary positions**: slots where `linked_user_id === user.id`
2. Collect the user's **sub-member positions**: iterate all slots, find sub-members where `linked_user_id === user.id`, record `(slotId, subMemberId, splitAmount)`
3. For each primary position: add `installment_amount` if the installment is not `paid`
4. For each sub-member position: find the matching payment row in `installments[slot].payments` by `sub_member_id`; add `splitAmount` if that payment row is not `paid`
5. If the user has no unpaid positions → total is 0 (Pay Now button is effectively moot)

This is identical to the `myTotalDue` calculation already present in `InstallmentPanel.tsx`. The same logic should be extracted to a shared utility or replicated in `GroupDashboardPage`.

### Pass a breakdown array to UpiPaymentModal

Add an optional `breakdown` prop to `UpiPaymentModal`:
```ts
breakdown?: { label: string; amount: number }[]
```
When provided (multi-position case), display a compact breakdown list above the total amount in the modal. When absent (single-position, existing behaviour), nothing changes.

### Hide Pay Now when the current user is the winner

The Pay Now button lives in the "This Month's Winner" stat card in `GroupDashboardPage`. The button is currently shown whenever `currentCycleHistory?.winner_slot?.upi_id` is truthy. Add an additional condition:

```ts
const iAmTheWinner = mySlotIds.includes(winnerSlotId ?? -1);
```

Where `mySlotIds` is the list of the current user's primary slot IDs (already computed). If `iAmTheWinner` is `true`, suppress the Pay Now button entirely and replace it with a short note such as _"You won this cycle 🎉"_.

**Multi-slot edge case**: A user can win with one slot while still owing installments on their other slots. In that scenario `iAmTheWinner` is still `true` (the user is the winner) so Pay Now is hidden. Their other installment obligations are visible and actionable via the Mark Paid buttons in the installment table — this is correct behaviour since paying yourself via a UPI QR code would be nonsensical.

### Fallback for single-position users

If the user has exactly one unpaid position (or the data isn't loaded yet), use `group.installment_amount` as before. This preserves exact backward compatibility.

### Installments must be loaded before Pay Now is clicked

`installments` for the current cycle are already fetched by `InstallmentPanel` via TanStack Query. The same query key `["installments", groupId, currentCycle]` can be read from the query cache in `GroupDashboardPage` using `useQuery` (which will return cached data without re-fetching). This avoids prop-drilling or duplicate network calls.

## Risks / Trade-offs

- **Race condition**: If installments data isn't cached yet when the user clicks Pay Now (e.g., they open the modal before the installment list renders), the amount falls back to `installment_amount`. This is acceptable — the user can close and reopen once the list loads.
- **Partial payments**: Sub-member slots with `status === "partial"` at the slot level mean some sub-members paid and some haven't. The algorithm handles this correctly at the sub-member payment row level, not the slot level.
- **Winner position**: If one of the user's slots is the cycle winner, that slot's installment payment is typically not required (winners receive the payout). The Pay Now button is hidden when the current user is the winner. In the multi-slot case where the user is the winner AND holds other non-winner positions, those non-winner positions are still included in the total (winner slot is excluded); however, the Pay Now button is only hidden when **all** of the user's positions are winner positions (i.e., the user has nothing left to pay).
