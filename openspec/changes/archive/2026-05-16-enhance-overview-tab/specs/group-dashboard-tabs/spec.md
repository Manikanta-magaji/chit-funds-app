## MODIFIED Requirements

### Requirement: Overview tab content
The Overview tab SHALL display the fund stats summary and the Installment Tracking panel for the current cycle. The Installment Tracking panel SHALL use the group's `start_date` as the base month for computing cycle labels when `start_date` is set; it SHALL fall back to the group's `created_at` date when `start_date` is null. Slot rows in the Installment Tracking panel that have sub-members SHALL be rendered in the expanded state by default so split-payment details are immediately visible without requiring an extra click.

#### Scenario: Overview tab shows stats and installments
- **WHEN** the Overview tab is active
- **THEN** the fund stats row (monthly installment, current cycle, contributor count, this month's winner) is visible
- **AND** the Installment Tracking panel for the current cycle is visible

#### Scenario: Cycle labels use start_date when available
- **WHEN** the group has a `start_date` of `2024-01-01` and the current cycle is 1
- **THEN** the cycle dropdown label for cycle 1 shows "Jan 2024" (not the month derived from `created_at`)

#### Scenario: Cycle labels fall back to created_at when start_date is null
- **WHEN** the group has no `start_date` set
- **THEN** the cycle dropdown labels are computed using `created_at` as before

#### Scenario: Sub-member slots expanded by default
- **WHEN** the Installment Tracking panel renders and a slot has more than one sub-member
- **THEN** that slot's sub-member rows are visible without the user clicking to expand it

#### Scenario: Slots without sub-members not auto-expanded
- **WHEN** the Installment Tracking panel renders and a slot has no sub-members
- **THEN** no expanded sub-member rows are shown for that slot
