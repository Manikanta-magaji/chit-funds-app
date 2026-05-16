## Context

The `UpiPaymentModal` already contains a small `upi-note` and `upi-sub-note` paragraph beneath the "Open in UPI App" button. Users currently see usage instructions but no explicit safety warning about verifying the payee name. UPI transfers are final — there is no reversal mechanism in the UPI protocol — so a wrong payment (wrong payee name) cannot be recovered by the app. The target users are non-technical chit-fund members who may not habitually check the payee confirmation screen in their UPI app.

## Goals / Non-Goals

**Goals:**
- Display a clearly visible warning inside the UPI payment modal that tells the user to check the payee name shown in their UPI app before confirming the transfer.
- The warning should mention the winner's name explicitly so the user knows what to look for.
- The warning should be shown at all times the modal is open — not behind an additional click.

**Non-Goals:**
- Not adding a JS `confirm()` dialog or blocking interstitial — these are friction-heavy on mobile and bad UX.
- Not changing the QR code or deep-link URI.
- Not adding backend tracking of whether the user acknowledged the warning.
- Not preventing the payment — the warning is informational, not a gate.

## Decisions

### 1. Inline warning vs. modal-blocking confirm dialog
**Decision**: Inline warning text inside the modal body, styled to stand out (e.g., a warning/alert box) and positioned above the "Open in UPI App" button so it is seen before the user taps.

**Rationale**: A `window.confirm()` or interstitial adds friction that frustrates mobile users and doesn't improve safety meaningfully — users dismiss dialogs reflexively. An always-visible inline warning is friendlier, more accessible, and still satisfies the requirement of surfacing the risk. The existing `upi-note` paragraph pattern shows this is already the modal's communication style.

**Alternative considered**: Show the warning only on first click of "Open in UPI App" (lazy reveal). Rejected — users might tap rapidly and miss it; always-visible is simpler and safer.

### 2. Warning copy
**Decision**: Use the winner name prop already available in the component to make the message specific: "Before paying, check that the name shown in your UPI app matches **{winnerName}**. UPI payments cannot be reversed."

**Rationale**: A generic "verify name" message is easy to ignore. Naming the expected payee gives the user an actionable anchor to compare against.

### 3. Styling
**Decision**: Wrap the warning in a `<p className="upi-warn">` and style it with an amber/warning colour using existing CSS conventions (similar to `badge-warning`).

**Rationale**: Keeps the change minimal — one new CSS class, no new component, no library import.

## Risks / Trade-offs

- [Risk] Warning text is ignored if placed too far down — → Mitigation: position it between the QR section and the "Open in UPI App" button so it is visually above the call-to-action.
- [Risk] Styling clashes with existing modal CSS → Mitigation: use a self-contained `upi-warn` class with minimal rules (background tint, border-left accent, padding).
