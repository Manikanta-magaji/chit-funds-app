## MODIFIED Requirements

### Requirement: Record installment payment
The system SHALL allow a group admin or the slot's linked member (or sub-member) to mark an installment as paid for a specific contributor slot (or sub-member) within a specific cycle. Admins SHALL also be able to unmark a payment. Members MAY only mark or unmark their own slot (or their own sub-member row). When a user holds multiple positions in a group, each position MUST be paid independently; paying one position does not affect the payment status of another.

**Draw-required gate**: Mark Paid actions SHALL be disabled until the prize draw for the current cycle has been performed.

**Pay Now amount**: When a user initiates a UPI payment via the Pay Now button, the amount shown SHALL reflect the total of all their unpaid positions for the current cycle, not the flat per-slot installment amount.

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

#### Scenario: Multi-position user Pay Now shows consolidated amount
- **WHEN** a user with two unpaid positions clicks Pay Now
- **THEN** the UPI modal amount equals the sum of amounts owed across all their unpaid positions
