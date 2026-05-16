## Requirements

### Requirement: Add a contributor slot to a group
The system SHALL allow a group admin to add a contributor slot to a group after the group has been created. Each contributor slot represents one installment obligation per cycle. A slot MUST be named (e.g., person's name or family name) and SHALL be linked to either a registered user or marked as admin-managed (offline). The same registered user MAY be linked to more than one slot within the same group; the system SHALL warn the admin before confirming such an assignment.

#### Scenario: Add a registered user as contributor
- **WHEN** an admin searches for a registered user by partial name, partial email, or exact mobile number and adds them as a contributor slot
- **THEN** the system creates a contributor slot linked to that user's account and notifies the user

#### Scenario: No strict match found while adding contributor
- **WHEN** an admin enters a contributor name and no exact registered-user match exists
- **THEN** the system allows creating the contributor as an offline name-only slot without blocking fund operations

#### Scenario: Add an offline (admin-managed) contributor
- **WHEN** an admin creates a contributor slot without linking it to a registered account
- **THEN** the system creates an offline slot managed entirely by admins, visible in the contributor list with an "offline" indicator

#### Scenario: Contributor count limit
- **WHEN** an admin attempts to add a contributor slot when the group already has slots equal to its total cycle count
- **THEN** the system returns an error indicating the group is full

#### Scenario: Admin adds user already linked to another slot
- **WHEN** an admin selects a registered user who is already linked to at least one slot or sub-member entry in the same group
- **THEN** the system displays a warning before saving and requires the admin to explicitly confirm the multi-slot assignment

### Requirement: Shared contributor slot (sub-members)
The system SHALL allow a single contributor slot to be assigned to multiple sub-members when creating a new contributor slot via the Add Contributor form. The total contribution from all sub-members MUST equal the slot's full installment amount. Each sub-member can be a registered user or an offline name. Splitting an existing solo contributor into sub-members after creation is NOT supported — admins who need to split an existing slot must remove the contributor and add them again using the shared flow.

#### Scenario: Split slot among two sub-members at creation time
- **WHEN** an admin selects "Sharing with others" in the Add Contributor form and fills in at least 2 sub-member rows with names and amounts that sum to the full installment
- **THEN** clicking "Add Contributor" creates the slot and all sub-members atomically and closes the form

#### Scenario: Invalid split total
- **WHEN** the sum of sub-member split amounts does not equal the full installment amount
- **THEN** the system returns a validation error and does not save the split configuration

#### Scenario: No +Split button on existing solo slot
- **WHEN** an admin views an existing contributor slot with no sub-members
- **THEN** no "+Split" or "+Add" button is shown; the only options are Edit and Remove

#### Scenario: Admin adds sub-member already present elsewhere in the group
- **WHEN** an admin adds a registered user as a sub-member to a slot where that user is already linked to another slot or sub-member entry in the same group
- **THEN** the system displays a warning and requires explicit confirmation before saving

### Requirement: Edit unregistered contributor details
The system SHALL allow a group admin to update the name, mobile number, and UPI ID of an unregistered (offline) contributor slot or sub-member at any time. Registered slots and sub-members are not editable via this flow — registered users manage their own profile. For sub-members, the split amount MUST also be editable. Mobile numbers submitted in the Edit Contributor form MUST be normalised and validated using the same rules as all other mobile number inputs (strip country code / whitespace / special characters; must result in a 10-digit number starting with 6–9).

#### Scenario: Edit offline contributor slot
- **WHEN** an admin edits an unregistered contributor slot's name, mobile number, or UPI ID
- **THEN** the system updates the slot record and the contributor list reflects the new values immediately

#### Scenario: Edit offline sub-member
- **WHEN** an admin clicks the Edit button on a slot's sub-member section
- **THEN** all sub-members become editable simultaneously in a single-row form (name, mobile, UPI, amount in one flex row per sub-member)
- **AND** offline sub-members have all four fields editable; registered sub-members have name as read-only text and mobile/UPI as disabled (read-only) inputs showing stored values
- **AND** the UI shows a live total indicator validating that all split amounts sum to the slot's installment amount
- **AND** the Save button is disabled while the total does not match the installment amount

#### Scenario: Remove sub-member in edit mode (any type)
- **WHEN** an admin removes a sub-member (offline or registered) while in edit mode
- **THEN** the sub-member row is removed from the edit form immediately and the running total is recalculated
- **AND** Save remains disabled until the remaining sub-member amounts sum to the installment amount
- **AND** the Remove button is visible for ALL sub-members (offline and registered) while in edit mode; it is hidden in read-only view mode

#### Scenario: Minimum one sub-member enforced
- **WHEN** an admin removes sub-members such that the edit form would have zero rows
- **THEN** the system prevents saving — at least one sub-member is required per slot

#### Scenario: Registered sub-member mobile and UPI shown read-only
- **WHEN** a registered sub-member's row is displayed in edit mode
- **THEN** the mobile number and UPI ID fields are shown with their stored values but disabled (not editable); only the split amount is editable for registered sub-members

#### Scenario: Contributor slot capacity check before adding
- **WHEN** an admin clicks Add Contributor and the group already has as many slots as its total cycle count
- **THEN** the system shows an inline error message and does NOT open the Add Contributor form

#### Scenario: Add sub-member while editing existing sub-members
- **WHEN** an admin is in edit mode for a slot's sub-members
- **THEN** a "+ Add Sub-member" button is visible; clicking it appends a blank offline row to the edit form
- **AND** the new row must be filled before Save is enabled (total must match installment amount)

#### Scenario: Mobile number normalized on save
- **WHEN** an admin saves a contributor slot or sub-member with a mobile number that contains spaces, country code (+91 / 91 / 0091), dashes, or parentheses
- **THEN** the system strips all non-digit characters, removes the leading country code, and stores only the 10-digit number
- **AND** if the normalised value is not exactly 10 digits or does not start with a digit in the range 6–9, the system shows a validation error and does not save

#### Scenario: Invalid mobile number rejected
- **WHEN** an admin enters a mobile number that cannot be reduced to a valid 10-digit Indian mobile (e.g. too short, too long, or incorrect prefix after stripping country code)
- **THEN** the system shows an inline error message identifying the invalid number and does not proceed with saving

#### Scenario: Edit blocked on registered slot
- **WHEN** a contributor slot is linked to a registered user account
- **THEN** the Edit action is not shown; the user manages their own details from their profile

#### Scenario: UPI ID auto-derived from mobile number
- **WHEN** an admin types or changes a mobile number in any contributor or sub-member form (Add Contributor, Edit Contributor, Edit Sub-member)
- **THEN** if the UPI ID field is empty OR still contains the previously auto-derived value (`{previous-mobile}@upi`), the system automatically updates the UPI ID field to `{normalized-mobile}@upi`
- **AND** if the admin has already manually edited the UPI ID to a custom value, the auto-derive does NOT overwrite it

#### Scenario: UPI ID persists when mobile changes to custom value
- **WHEN** a UPI ID was manually set to a custom value (not the auto-derived `{mobile}@upi`)
- **AND** the admin later changes the mobile number
- **THEN** the UPI ID field retains the custom value unchanged

### Requirement: Add shared contributor in one step
The system SHALL allow an admin to create a shared contributor slot and its sub-members in a single form submission. The slot and all sub-members are saved atomically from the admin's perspective.

#### Scenario: Add shared contributor with sub-members inline
- **WHEN** an admin selects "Sharing with others" in the add-contributor form and fills in at least 2 sub-member rows with names and amounts that sum to the full installment
- **THEN** clicking "Add Contributor" creates the slot, then immediately creates all sub-members, and closes the form

#### Scenario: Split total must match installment amount
- **WHEN** the sub-member amounts do not sum to the slot's installment amount
- **THEN** the "Add Contributor" button is disabled; the form shows the current total vs. required amount

### Requirement: User search suggestions show identifying details
The system SHALL display the mobile number and email address alongside the display name in user search suggestion results so that admins can distinguish users with identical display names. The suggestion dropdown MUST have a solid opaque background so that underlying page content does not show through. The suggestion list MUST be dismissed immediately when the admin selects a user — it SHALL NOT remain visible after a selection is made.

#### Scenario: Suggestion shows mobile and email
- **WHEN** an admin searches for a user by name and results are displayed
- **THEN** each suggestion item shows the user's display name, mobile number (if present), and email address (if present)

#### Scenario: Suggestion dismissed after selection
- **WHEN** an admin clicks a suggestion item to select a user
- **THEN** the suggestion dropdown disappears immediately and does not remain open

#### Scenario: Suggestion background is opaque
- **WHEN** the suggestion dropdown is visible
- **THEN** the dropdown has a fully opaque white background regardless of hover state, so no underlying content is visible through it

#### Scenario: Suggestion reappears on new input
- **WHEN** the admin clears the name field and types new text after a prior selection
- **THEN** the suggestion list appears again based on the new query

### Requirement: Link offline contributor to registered account
The system SHALL allow any group admin to link an existing offline contributor slot to a registered user account at any time.

#### Scenario: Link offline slot to user
- **WHEN** an admin selects an offline contributor slot and links it to a registered user
- **THEN** the system requires a confirmation step before saving the link
- **AND** after confirmation, the system updates the slot to reference the user account
- **AND** the linked user can immediately see historical and current group cycles in their dashboard

#### Scenario: Link offline sub-member to user
- **WHEN** an admin links an offline sub-member to a registered user account
- **THEN** the system requires a confirmation step before saving
- **AND** after confirmation, the linked user immediately sees historical and current cycle participation for that mapped sub-member

### Requirement: Registration status indication for contributors and sub-members
The system SHALL clearly indicate whether each contributor slot and sub-member is linked to a registered portal user.

#### Scenario: Show registered status
- **WHEN** a contributor slot or sub-member has a linked user account
- **THEN** the UI shows it as registered

#### Scenario: Show unregistered status
- **WHEN** a contributor slot or sub-member has no linked user account
- **THEN** the UI shows it as unregistered/offline while keeping all cycle workflows available

### Requirement: Remove a contributor from a group
The system SHALL allow an admin to remove a contributor slot from a group before the first cycle starts. Removal after the group's first cycle has begun SHALL NOT be permitted.

#### Scenario: Remove before first cycle
- **WHEN** an admin removes a contributor slot before cycle 1 begins
- **THEN** the system deletes the slot and any associated sub-member records

#### Scenario: Removal blocked after cycle start
- **WHEN** an admin attempts to remove a contributor slot after the group's first cycle has started
- **THEN** the system returns an error and keeps the slot intact
