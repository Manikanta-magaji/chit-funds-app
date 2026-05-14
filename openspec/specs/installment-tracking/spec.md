## Requirements

### Requirement: Record installment payment
The system SHALL allow a group admin or the slot's linked member (or sub-member) to mark an installment as paid for a specific contributor slot (or sub-member) within a specific cycle. Admins SHALL also be able to unmark a payment. Members MAY only mark or unmark their own slot (or their own sub-member row). When a user holds multiple positions in a group, each position MUST be paid independently; paying one position does not affect the payment status of another.

**Draw-required gate**: Mark Paid actions SHALL be disabled until the prize draw for the current cycle has been performed.

#### Scenario: Admin marks installment as paid
- **WHEN** an admin marks a contributor slot's installment as paid for the current cycle after the prize draw is done
- **THEN** the system records the payment with the current timestamp and updates the cycle's payment summary

#### Scenario: Member marks own installment as paid
- **WHEN** a linked contributor clicks Mark Paid on their own slot after the prize draw is done
- **THEN** the system records the payment immediately and refreshes the status

#### Scenario: Member with multiple slots marks one slot as paid
- **WHEN** a logged-in user who holds two slots clicks Mark Paid on one of their slots
- **THEN** the system records that specific slot as paid and the other slot remains in its current payment state

#### Scenario: Member cannot mark others' installments
- **WHEN** a member attempts to mark a slot they are not linked to as paid
- **THEN** the system returns a 403 error

#### Scenario: Mark Paid blocked before draw
- **WHEN** any user tries to mark an installment as paid before the prize draw has been performed for the current cycle
- **THEN** the UI disables the Mark Paid button and shows a notice to draw first

#### Scenario: Admin unmarks a payment
- **WHEN** an admin unmarks a previously recorded payment for the current cycle
- **THEN** the system removes the payment record for that slot in that cycle and updates the summary

#### Scenario: Sub-member partial payment recording
- **WHEN** an admin or the linked sub-member marks a sub-member's split payment as paid within a shared slot
- **THEN** the system records the sub-member's portion as paid
- **AND** the slot status is `partially paid` if at least one but not all sub-members have paid
- **AND** the slot status is `paid` only when ALL sub-members have paid
- **AND** the slot status is `unpaid` if no sub-members have paid

### Requirement: Contributor self-reports payment
The system SHALL allow a registered contributor (or sub-member) to mark their own installment as paid, subject to admin confirmation. The payment SHALL be in a "pending confirmation" state until an admin approves it.

> **Note**: As of the latest implementation, linked members can mark their installments as paid directly (bypassing the self-report/pending flow). The self-report endpoint remains available for future use.

#### Scenario: Contributor marks own payment as paid
- **WHEN** a contributor marks their installment as paid for the current cycle
- **THEN** the system records the payment in "pending" state and notifies admins

#### Scenario: Admin confirms contributor-reported payment
- **WHEN** an admin reviews and confirms a pending payment
- **THEN** the system changes the payment status to confirmed and updates the cycle summary

#### Scenario: Admin rejects contributor-reported payment
- **WHEN** an admin rejects a pending payment
- **THEN** the system marks the installment as unpaid again and the contributor can resubmit

### Requirement: View installment status for a cycle
The system SHALL provide admins with a per-cycle installment status view showing each contributor slot, whether it is paid or unpaid, and the amount paid (relevant for shared slots with sub-members).

#### Scenario: Admin views cycle payment status
- **WHEN** an admin navigates to the installment tracking page for a cycle
- **THEN** the system displays every contributor slot with its payment status (paid, partial, pending, unpaid) and the amounts

#### Scenario: Contributor views own payment history
- **WHEN** a contributor navigates to their payment history
- **THEN** the system shows a list of all cycles with their payment status and whether the installment was confirmed

### Requirement: Advance to next cycle
The system SHALL allow a group admin to close the current cycle and advance to the next cycle. Advancing SHALL be allowed only after a prize winner has been confirmed for the current cycle. The system MUST warn if any installments for the current cycle are unpaid before advancing.

#### Scenario: Advance cycle with all payments confirmed and winner selected
- **WHEN** an admin advances the cycle and all installments are paid and a winner is confirmed
- **THEN** the system closes the current cycle and opens the next cycle

#### Scenario: Advance cycle with unpaid installments
- **WHEN** an admin advances the cycle and some installments are unpaid
- **THEN** the system displays a warning listing the unpaid slots and requires explicit confirmation before advancing

#### Scenario: Advance blocked without a winner
- **WHEN** an admin attempts to advance the cycle before a prize winner has been confirmed
- **THEN** the system returns an error and does not advance the cycle
