

# Add Password Reset Email for Users with Login Accounts

## Overview

This plan addresses two related issues:
1. Adding a "Send Password Reset Email" button for users who already have login accounts
2. Creating the missing `/reset-password` page that handles the password reset flow
3. Fixing the localhost:3000 domain issue (requires Supabase dashboard configuration)

## Current State

- **UserDialog.tsx**: Shows "Account Information" for users with `user_id` but has no password reset option
- **EmployeeEditDialog.tsx**: Same situation - shows account exists but no way to trigger password reset
- **ResetPasswordDialog.tsx**: Only allows admins to manually set a new password (doesn't use email flow)
- **Login.tsx**: Has "Forgot Password" that calls `resetPasswordForEmail` but redirects to `/reset-password` which doesn't exist
- **Supabase Dashboard**: Currently configured with `localhost:3000` as Site URL

## Solution

### 1. Add "Send Password Reset Email" Button

Add a button to both dialogs for users who have login accounts:

**UserDialog.tsx** (Access & Security tab, lines ~521-529):
- Add a "Send Password Reset Email" button next to "Account Information"
- On click, calls `supabase.auth.resetPasswordForEmail()` with user's email
- Uses production domain constant for the redirect URL

**EmployeeEditDialog.tsx** (Access tab, lines ~507-514):
- Same functionality as UserDialog

### 2. Create Reset Password Page

Create `src/pages/ResetPassword.tsx`:
- Handles the password reset callback from email link
- Allows user to enter and confirm new password
- Uses `supabase.auth.updateUser({ password })` to set new password
- Shows success message and redirects to login

### 3. Add Route for Reset Password

Update `src/App.tsx`:
- Add public route for `/reset-password`

### 4. Supabase Dashboard Configuration (Manual)

**You need to update these settings in Supabase Dashboard:**

1. Go to **Authentication** > **URL Configuration**
2. Set **Site URL** to: `https://clock.cicotimeclock.com`
3. Add to **Redirect URLs**:
   - `https://clock.cicotimeclock.com/reset-password`
   - `https://cicoclock.lovable.app/reset-password`
   - Preview URL if needed for testing

## Technical Details

### Password Reset Email Flow
```
Admin clicks "Send Password Reset Email"
    ↓
supabase.auth.resetPasswordForEmail(email, { redirectTo })
    ↓
Supabase sends email with link to /reset-password?token=...
    ↓
User clicks link, lands on ResetPassword page
    ↓
Page detects auth recovery event
    ↓
User enters new password
    ↓
supabase.auth.updateUser({ password })
    ↓
Redirect to login
```

### Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/pages/ResetPassword.tsx` | Create | New page for password reset flow |
| `src/App.tsx` | Modify | Add route for `/reset-password` |
| `src/components/users/UserDialog.tsx` | Modify | Add reset email button for users with login |
| `src/components/employee/EmployeeEditDialog.tsx` | Modify | Add reset email button for employees with login |
| `src/lib/constants.ts` | Modify | Add RESET_PASSWORD route constant |

### Key Code Snippets

**Send Reset Email Button:**
```typescript
<Button
  type="button"
  variant="outline"
  size="sm"
  onClick={async () => {
    const redirectUrl = `${PRODUCTION_BASE_URL}/reset-password`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset email sent successfully");
    }
  }}
>
  <Mail className="h-4 w-4 mr-2" />
  Send Password Reset Email
</Button>
```

**Reset Password Page Core Logic:**
```typescript
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      setCanReset(true);
    }
  });
}, []);

const handleSubmit = async () => {
  const { error } = await supabase.auth.updateUser({ 
    password: newPassword 
  });
  if (!error) {
    navigate('/login');
  }
};
```

## Manual Steps Required

After implementation, you must configure Supabase:

1. **Supabase Dashboard** > **Authentication** > **URL Configuration**
2. Update **Site URL**: `https://clock.cicotimeclock.com`
3. Add **Redirect URLs**:
   - `https://clock.cicotimeclock.com/reset-password`
   - `https://cicoclock.lovable.app/reset-password`

This ensures password reset emails use your production domain instead of localhost:3000.

