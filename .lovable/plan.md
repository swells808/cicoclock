
# Add "Enable Login" Button to Employee Edit Dialog

## Overview

Add an "Enable Login" button to the Access & Security tab in the EmployeeEditDialog. This will allow admins to grant dashboard login access to employees who were originally created as timeclock-only users (no auth account).

## Current State

- **EmployeeEditDialog** shows a warning message when an employee has no login account
- The `create-auth-account` edge function already exists and can create auth accounts for existing profiles
- **UserDialog** has the "Create login account" checkbox, but only for new users

## Implementation

### Changes to EmployeeEditDialog.tsx

Add state and UI for enabling login:

```text
+---------------------------------------------+
|  Access & Security Tab                      |
+---------------------------------------------+
|  Role:  [ Employee ▼ ]                      |
|                                             |
|  PIN Code: [ 1234 ]                         |
|  Used for clocking in/out                   |
|                                             |
|  +---------------------------------------+  |
|  | ⚠️ No Login Account                   |  |
|  | This employee cannot log in.          |  |
|  |                                       |  |
|  | Email: [ user@example.com ]           |  |
|  | Password: [ ******** ]                |  |
|  |                                       |  |
|  | [ Enable Login ]                      |  |
|  +---------------------------------------+  |
+---------------------------------------------+
```

**New State Variables:**
- `enableLoginMode: boolean` - Toggles the enable login form
- `loginEmail: string` - Email for the new auth account
- `loginPassword: string` - Password for the new auth account
- `creatingLogin: boolean` - Loading state while creating

**New Handler:**
- `handleEnableLogin()` - Calls the `create-auth-account` edge function with:
  - `profile_id`: The employee's profile ID
  - `email`: The email address entered
  - `password`: The password entered
  - `role`: The current role selected

**UI Changes:**
1. Replace the static "No Login Account" warning with an expandable section
2. Add "Enable Login" button that shows email/password fields
3. After successful creation, show the "Account Information" success message
4. Refetch employee data to reflect the new `user_id`

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/employee/EmployeeEditDialog.tsx` | Add enable login form in Access tab |

### Validation

- Email is required and must be valid
- Password must be at least 6 characters
- Email must not already be in use (edge function handles this)
- Show toast on success/failure

### Security

- Only admins can access this dialog (existing protection)
- The edge function validates the caller is authenticated
- Password is sent securely to the edge function
- Auth account is created with `email_confirm: true` (no email verification needed)
