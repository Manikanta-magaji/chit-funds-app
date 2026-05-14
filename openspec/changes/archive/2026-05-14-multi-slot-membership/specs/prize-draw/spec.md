## MODIFIED Requirements

### Requirement: Random prize draw
The system SHALL perform a server-side random selection of a contributor slot as the prize winner. Only contributor slots that have not yet won a prize in the current fund cycle (across all previous cycles of this group) SHALL be eligible. Eligibility MAY optionally exclude slots with outstanding unpaid installments in the current cycle (configurable per group). When a registered user is linked to multiple slots in the same group, each slot is treated as a distinct draw entry — the user's total draw chances equals the number of slots they hold.

#### Scenario: Random draw with all slots eligible
- **WHEN** an admin triggers a random draw and all slots are eligible
- **THEN** the system randomly selects one slot using cryptographically secure randomness and presents it to the admin for confirmation

#### Scenario: Random draw excludes previous winners
- **WHEN** an admin triggers a random draw and some slots have already won in prior cycles of this group
- **THEN** the system excludes previous winners from the draw pool and selects from remaining eligible slots

#### Scenario: Multi-slot user has proportional draw chances
- **WHEN** an admin triggers a random draw and a registered user holds N slots in the group
- **THEN** all N of that user's slots appear as separate entries in the draw pool
- **AND** the probability of that user being drawn is proportional to N divided by the total number of eligible slots

#### Scenario: Random draw excludes slots in arrears (when configured)
- **WHEN** the group has the "exclude slots in arrears" setting enabled and some slots have unpaid installments for the current cycle
- **THEN** the system excludes those slots from the random draw pool

#### Scenario: All slots have won
- **WHEN** all contributor slots have already won (all cycles completed)
- **THEN** the system indicates the fund is complete and no draw can be initiated
