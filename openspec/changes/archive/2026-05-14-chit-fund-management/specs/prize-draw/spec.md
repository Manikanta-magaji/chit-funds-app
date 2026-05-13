## ADDED Requirements

### Requirement: Open the prize draw for a cycle
The system SHALL allow a group admin to initiate the prize draw for the current cycle. A draw SHALL only be openable when the current cycle does not already have a winner recorded.

#### Scenario: Admin initiates draw for current cycle
- **WHEN** an admin clicks "Draw Prize" for the current cycle and no winner has been recorded yet
- **THEN** the system displays the draw interface with options for random draw or manual selection

#### Scenario: Draw blocked when winner already selected
- **WHEN** an admin attempts to draw again for a cycle that already has a recorded winner
- **THEN** the system shows the existing winner and does not allow a new draw

### Requirement: Random prize draw
The system SHALL perform a server-side random selection of a contributor slot as the prize winner. Only contributor slots that have not yet won a prize in the current fund cycle (across all previous cycles of this group) SHALL be eligible. Eligibility MAY optionally exclude slots with outstanding unpaid installments in the current cycle (configurable per group).

#### Scenario: Random draw with all slots eligible
- **WHEN** an admin triggers a random draw and all slots are eligible
- **THEN** the system randomly selects one slot using cryptographically secure randomness and presents it to the admin for confirmation

#### Scenario: Random draw excludes previous winners
- **WHEN** an admin triggers a random draw and some slots have already won in prior cycles of this group
- **THEN** the system excludes previous winners from the draw pool and selects from remaining eligible slots

#### Scenario: Random draw excludes slots in arrears (when configured)
- **WHEN** the group has the "exclude slots in arrears" setting enabled and some slots have unpaid installments for the current cycle
- **THEN** the system excludes those slots from the random draw pool

#### Scenario: All slots have won
- **WHEN** all contributor slots have already won (all cycles completed)
- **THEN** the system indicates the fund is complete and no draw can be initiated

### Requirement: Manual prize selection override
The system SHALL allow a group admin to manually select any eligible contributor slot as the prize winner instead of using the random draw.

#### Scenario: Admin selects winner manually
- **WHEN** an admin selects a specific contributor slot from the manual selection list and confirms
- **THEN** the system records that slot as the prize winner for the current cycle

#### Scenario: Manual selection of ineligible slot blocked
- **WHEN** an admin attempts to manually select a slot that has already won in a previous cycle
- **THEN** the system warns the admin and requires explicit confirmation to override the eligibility rule

### Requirement: Confirm and record prize winner
The system SHALL require the admin to confirm the selected winner (whether from random draw or manual selection) before the winner is permanently recorded for the cycle.

#### Scenario: Admin confirms draw result
- **WHEN** an admin confirms the presented winner
- **THEN** the system records the prize winner for the cycle, making it visible to all group members

#### Scenario: Admin cancels draw result
- **WHEN** an admin declines the presented winner before confirming
- **THEN** the system discards the selection and returns to the draw interface without recording a winner

### Requirement: Prize draw history
The system SHALL maintain a history of prize winners per group, showing the cycle number, winner name, and payout status.

#### Scenario: View draw history
- **WHEN** any group member views the prize history page
- **THEN** the system displays a list of all cycles with the recorded winner and payout status for each
