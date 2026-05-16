## ADDED Requirements

### Requirement: Pay Now displayed per sub-member when winning slot is shared
When the prize-winning contributor slot has more than one sub-member, the system SHALL display an individual Pay Now button for each sub-member on the group dashboard winner announcement area. Each button SHALL target that sub-member's UPI ID and SHALL encode their proportional share amount (not the full slot installment).

#### Scenario: Winning slot has two sub-members, both have UPI
- **WHEN** the prize draw result is displayed and the winning slot has two sub-members each with a resolvable UPI ID
- **THEN** the system renders two separate Pay Now buttons, one per sub-member, each labelled with the sub-member's name
- **AND** each button opens a UPI payment modal pre-populated with that sub-member's UPI ID and their individual share amount

#### Scenario: Winning slot has sub-member with no UPI and no mobile
- **WHEN** the prize draw result is displayed and one sub-member has neither a linked user UPI ID nor a stored mobile number
- **THEN** the system displays that sub-member's name and share amount but shows a notice "No UPI available" instead of a Pay Now button for that sub-member

#### Scenario: Winning slot has sub-member with mobile but no explicit UPI ID
- **WHEN** a sub-member has a stored mobile number but no explicit UPI ID
- **THEN** the system derives a default UPI handle as `<mobile>@upi` and uses it to generate the Pay Now button for that sub-member

#### Scenario: Winning slot has only one sub-member (single-member slot)
- **WHEN** the prize draw result is displayed and the winning slot has exactly one sub-member
- **THEN** the system renders a single Pay Now button (unchanged from existing single-winner behaviour), using the sub-member's UPI ID and the full slot installment amount

#### Scenario: Non-winning slot with sub-members unaffected
- **WHEN** a slot that was NOT drawn as winner has sub-members
- **THEN** the sub-member breakdown is not shown in the winner announcement area; installment payment tracking for those sub-members is unchanged
