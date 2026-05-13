## Why

Chit funds are a popular community-based savings scheme in India, but they are largely managed via spreadsheets or manual bookkeeping, making it error-prone and opaque for members. This application replaces that manual process with a digital platform that automates installment tracking, prize allocation, and member communications — making chit fund management transparent, auditable, and accessible to non-technical users.

## What Changes

This is a greenfield full-stack web application built from scratch. There are no existing capabilities to modify.

- **New**: User authentication via email/password and Google OAuth
- **New**: Chit fund group creation with configurable name and installment amount
- **New**: Admin management — group creator becomes admin by default; additional admins can be assigned
- **New**: Contributor management — contributors can be registered users or admin-managed offline members; a "contributor slot" can be shared by multiple sub-members who split the installment
- **New**: User profile management — name (auto-filled from Google or derived from email), mobile number, and UPI ID (inferred from mobile if not provided)
- **New**: Monthly prize draw — admins can randomly pick a winner or manually override the selection
- **New**: Installment payment tracking — record payments made by contributors each cycle
- **New**: Payout confirmation — admin or user marks the prize payout as completed for the cycle winner
- **New**: Dashboard views for admins (group overview, payment status, prize history) and contributors (their own payment history and upcoming obligations)

## Capabilities

### New Capabilities

- `user-auth`: Sign-up and login via email/password and Google OAuth; session management; user profile (name, mobile, UPI ID)
- `chit-group-management`: Create and configure a chit fund group (name, installment amount, duration); manage admins
- `contributor-management`: Add contributors to a group (registered users or offline members); support shared contributor slots where multiple sub-members split the installment
- `prize-draw`: Monthly random or manual selection of the prize winner; record winner per cycle
- `installment-tracking`: Record and display installment payments from contributors each cycle; mark individual installments as paid or unpaid
- `payout-confirmation`: Mark the prize payout as completed for the winning contributor of a cycle; track payout history

### Modified Capabilities

*(none — this is a new application)*

## Impact

- **New codebase**: FastAPI backend, React.js frontend, SQLite database
- **External dependencies**: Google OAuth (via OAuth2 / Google Identity Services), optional email service for notifications
- **APIs introduced**: Auth endpoints, group management endpoints, contributor endpoints, prize draw endpoint, installment tracking endpoints, payout confirmation endpoints
- **No existing systems affected**
