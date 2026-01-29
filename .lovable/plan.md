
# Update Email Sender Address

## Overview
Change the "from" email address in all three email-sending edge functions from `reports@resend.dev` to your verified domain.

## Files to Modify

### 1. `supabase/functions/send-test-report/index.ts`
**Line 97** - Change the `from` field in the Resend email send call:
```typescript
// Before
from: 'CICO Reports <reports@resend.dev>',

// After  
from: 'CICO Reports <reports@notifications.battlebornsteel.com>',
```

### 2. `supabase/functions/send-recipient-welcome-email/index.ts`
**Line 40** - Change the `from` field:
```typescript
// Before
from: 'CICO Reports <reports@resend.dev>',

// After
from: 'CICO Reports <reports@notifications.battlebornsteel.com>',
```

### 3. `supabase/functions/process-scheduled-reports/index.ts`
**Line 693** - Change the `from` field:
```typescript
// Before
from: 'CICO Reports <reports@resend.dev>',

// After
from: 'CICO Reports <reports@notifications.battlebornsteel.com>',
```

## Summary

| Edge Function | Change |
|--------------|--------|
| `send-test-report` | Update `from` address on line 97 |
| `send-recipient-welcome-email` | Update `from` address on line 40 |
| `process-scheduled-reports` | Update `from` address on line 693 |

## Prerequisites
Make sure the domain `notifications.battlebornsteel.com` is verified in your Resend account at [resend.com/domains](https://resend.com/domains). If it's not verified, emails will still fail with a 403 error.
