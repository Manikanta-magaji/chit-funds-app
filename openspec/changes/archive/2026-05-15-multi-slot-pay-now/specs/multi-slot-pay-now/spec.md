## ADDED Requirements

### Requirement: Consolidated Pay Now amount for multi-position users
When a user holds more than one contributor position in a group (as a full slot contributor, a sub-member, or both), the Pay Now button SHALL compute and display the total unpaid amount across all of their positions for the current cycle. Only unpaid and non-winner positions SHALL be included in the total.

#### Scenario: Two full slots, both unpaid
- **WHEN** a user linked to two full contributor slots clicks Pay Now and neither slot is paid for the current cycle
- **THEN** the UPI modal shows `2 × installment_amount` as the payment amount

#### Scenario: Two full slots, one already paid
- **WHEN** a user linked to two full contributor slots clicks Pay Now and one slot is already marked paid
- **THEN** the UPI modal shows `1 × installment_amount` (only the unpaid slot)

#### Scenario: Full slot plus sub-member share, both unpaid
- **WHEN** a user is a full contributor in one slot and a sub-member in another slot, and neither position is paid
- **THEN** the UPI modal shows `installment_amount + split_amount` as the payment amount

#### Scenario: Full slot plus sub-member share, sub-member already paid
- **WHEN** a user is a full contributor in one slot and a sub-member in another slot, and the sub-member portion is already paid but the full slot is not
- **THEN** the UPI modal shows only `installment_amount`

#### Scenario: Sub-member in two slots, both unpaid
- **WHEN** a user is a sub-member in two different slots and neither sub-member payment is paid
- **THEN** the UPI modal shows the sum of their two split amounts

#### Scenario: All positions already paid
- **WHEN** a user with multiple positions clicks Pay Now and all their positions are already paid
- **THEN** the UPI modal shows ₹0 and a message indicating everything is paid

#### Scenario: Single position user unchanged
- **WHEN** a user with exactly one contributor position clicks Pay Now
- **THEN** the UPI modal shows `installment_amount` (same behaviour as before)

### Requirement: Payment breakdown displayed in modal
When the consolidated amount covers more than one position, the UPI modal SHALL display a per-position breakdown so the user understands what they are paying for.

#### Scenario: Breakdown shown for multi-position payment
- **WHEN** the Pay Now modal opens for a user with two or more unpaid positions
- **THEN** the modal displays each position's name and amount as a list before the total

#### Scenario: No breakdown for single position
- **WHEN** the Pay Now modal opens for a user with one unpaid position
- **THEN** the modal does not display a breakdown list (existing layout unchanged)

### Requirement: Pay Now hidden when current user is the cycle winner
The system SHALL NOT show the Pay Now button to the user whose slot won the prize draw for the current cycle. Instead, a congratulatory note SHALL be displayed in its place. This applies regardless of whether the user has other non-winner positions in the group.

#### Scenario: Winner sees no Pay Now button
- **WHEN** the current cycle's winning slot is linked to the logged-in user
- **THEN** the Pay Now button is not shown; a message such as "You won this cycle 🎉" is displayed instead

#### Scenario: Non-winner sees Pay Now as usual
- **WHEN** the current cycle's winning slot is NOT linked to the logged-in user
- **THEN** the Pay Now button is shown as normal (subject to winner having a UPI ID)

#### Scenario: Multi-slot user who is winner still sees no Pay Now
- **WHEN** a user holds two slots and one of them is the cycle winner
- **THEN** the Pay Now button is hidden and the congratulatory note is shown (their non-winner installment obligations are handled via Mark Paid in the installment table)
