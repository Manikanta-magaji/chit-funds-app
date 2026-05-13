## ADDED Requirements

### Requirement: Record prize payout
The system SHALL allow a group admin or the prize winner themselves to mark the prize payout as completed for a given cycle. The payout record SHALL include the cycle number, winner slot, payout date, and who confirmed it.

#### Scenario: Admin marks payout as completed
- **WHEN** an admin marks the payout as completed for the cycle's prize winner
- **THEN** the system records the payout as completed with the current timestamp and the admin's identity, and updates the cycle status

#### Scenario: Winner marks payout as received
- **WHEN** the prize winner (registered user) marks the payout as received
- **THEN** the system records the payout as completed from the winner's side; the cycle is considered fully settled

#### Scenario: Payout cannot be recorded without a winner
- **WHEN** an admin attempts to record a payout for a cycle that has no confirmed prize winner
- **THEN** the system returns an error indicating no winner has been set for that cycle

### Requirement: View payout status per cycle
The system SHALL display the payout status for each cycle to all group members. Possible statuses are: Pending (no payout recorded), Completed (payout confirmed by admin or winner), and Disputed (if a discrepancy is noted).

#### Scenario: Payout status visible in prize history
- **WHEN** any group member views the prize history list
- **THEN** each cycle row shows the payout status alongside the winner's name

#### Scenario: Pending payout highlighted
- **WHEN** a cycle has a confirmed winner but no recorded payout
- **THEN** the system highlights that cycle's payout status as "Pending" and surfaces it prominently on the admin dashboard

### Requirement: Payout history per contributor
The system SHALL allow each registered contributor to view a complete history of cycles in which they won the prize, along with the payout status for each winning cycle.

#### Scenario: Contributor views their payout history
- **WHEN** a contributor navigates to their personal payout history page
- **THEN** the system shows a list of cycles where they were the prize winner and whether the payout was received for each
