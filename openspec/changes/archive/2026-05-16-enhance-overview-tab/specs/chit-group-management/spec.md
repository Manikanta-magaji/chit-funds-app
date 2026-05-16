## MODIFIED Requirements

### Requirement: Fund start date
The system SHALL allow an admin to optionally record the month and year in which a chit fund was launched. This is stored for reference and display purposes. When provided, the value MUST be a valid calendar month and year; the day component is always stored as 1 (the first of the month). Both month and year MUST be provided together — specifying only one is an error. The fund creation form SHALL pre-populate the Start Month and Start Year fields with the current calendar month and year so that the admin does not need to select them manually in the common case.

#### Scenario: Create group with start month/year
- **WHEN** an admin fills in the optional Start Month and Start Year fields when creating a group
- **THEN** the system stores the start date as `YYYY-MM-01` and returns it in the group detail response

#### Scenario: Start date fields default to current month and year
- **WHEN** the admin opens the Create Fund form
- **THEN** the Start Month field is pre-selected to the current calendar month and Start Year is pre-selected to the current calendar year

#### Scenario: Create group without start date
- **WHEN** an admin clears both Start Month and Start Year before submitting
- **THEN** the system creates the group with `start_date = null`; all group operations proceed normally

#### Scenario: Partial start date rejected
- **WHEN** an admin fills in only one of Start Month or Start Year
- **THEN** the system rejects the form with a validation message requiring both fields or neither
