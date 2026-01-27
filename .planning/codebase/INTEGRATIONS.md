# External Integrations

**Analysis Date:** 2026-01-27

## APIs & External Services

**Payments:**
- Stripe - Subscription billing (checkout sessions, customer portal)
  - SDK/Client: Raw `fetch` to Stripe REST API (no SDK)
  - Auth: `STRIPE_SECRET_KEY` (Supabase edge function secret)
  - Edge Function: `supabase/functions/stripe/index.ts`
  - Actions: `create-checkout-session`, `create-portal-session`

**Email:**
- Resend - Transactional email delivery
  - SDK/Client: `resend@2.0.0` (ESM import in Deno)
  - Auth: `RESEND_API_KEY` (Supabase edge function secret)
  - From address: `CICO Reports <reports@resend.dev>`
  - Used by: `send-test-report`, `process-scheduled-reports`, `send-recipient-welcome-email`

**Maps:**
- Mapbox GL - Map rendering and geocoding for GPS clock-in/out
  - SDK/Client: `mapbox-gl` 3.17.x (frontend)
  - Auth: Mapbox access token (stored in company settings, likely `mapbox_access_token` column)
  - Used in: `src/pages/Timeclock.tsx`, `src/pages/AdminTimeTracking.tsx`

## Data Storage

**Database:**
- Supabase (PostgreSQL)
  - Connection: `VITE_SUPABASE_URL` (frontend), `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (edge functions)
  - Client: `@supabase/supabase-js` 2.87.x
  - Frontend client: `src/integrations/supabase/client.ts`
  - Types: `src/integrations/supabase/types.ts` (generated)
  - Migrations: `supabase/migrations/`
  - Key tables: `time_entries`, `profiles`, `companies`, `projects`, `scheduled_reports`, `scheduled_report_recipients`, `report_execution_log`

**File Storage:**
- Supabase Storage - Photo uploads for timeclock entries
  - Referenced in clock-in/out edge function (`photo_url` parameter)

**Caching:**
- TanStack React Query - Client-side query caching only
- No server-side caching layer

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (built-in)
  - Implementation: Email/password auth with PIN-based employee authentication
  - Session: `localStorage` with `persistSession: true`, `autoRefreshToken: true`
  - Edge functions: `authenticate-pin`, `create-auth-account`, `create-user`, `admin-reset-password`
  - Frontend context: `src/contexts/` (likely AuthContext)

## Monitoring & Observability

**Error Tracking:**
- None detected (no Sentry, Datadog, etc.)

**Logs:**
- `console.log` / `console.error` in edge functions (visible in Supabase dashboard)
- No structured logging framework

## CI/CD & Deployment

**Hosting:**
- Lovable platform (indicated by `lovable-tagger` dev dependency and project name `vite_react_shadcn_ts`)
- Supabase for backend services

**CI Pipeline:**
- Not detected (no `.github/workflows`, no CI config files)

## Supabase Edge Functions

All edge functions run on Deno and are located in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `authenticate-pin` | PIN-based employee login |
| `clock-in-out` | Clock in/out with GPS and photo |
| `check-clock-status` | Check if employee is clocked in |
| `create-auth-account` | Create Supabase auth account |
| `create-user` | Create user profile |
| `create-company` | Company onboarding |
| `admin-retroactive-clockout` | Admin manual clock-out |
| `admin-reset-password` | Admin password reset |
| `verify-task` | Task verification |
| `record-task-activity` | Log task activity |
| `auto-close-tasks-on-shift-end` | Auto-close tasks when shift ends |
| `generate-badge` | Generate employee badge with QR |
| `verify-badge` | Verify scanned badge |
| `lookup-employee` | Employee lookup |
| `send-test-report` | Send test scheduled report |
| `send-recipient-welcome-email` | Welcome email for report recipients |
| `process-scheduled-reports` | Cron: generate and email scheduled reports |
| `migrate-timeclock-photos` | Data migration utility |
| `stripe` | Stripe checkout and billing portal |
| `_shared/cors.ts` | Shared CORS headers |

## Environment Configuration

**Required env vars (frontend `.env`):**
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key
- `VITE_SUPABASE_PROJECT_ID` - Supabase project ID

**Required Supabase secrets (edge functions):**
- `SUPABASE_URL` - Auto-provided by Supabase
- `SUPABASE_SERVICE_ROLE_KEY` - Auto-provided by Supabase
- `STRIPE_SECRET_KEY` - Stripe API secret
- `RESEND_API_KEY` - Resend email API key

## Webhooks & Callbacks

**Incoming:**
- Stripe checkout `success_url` and `cancel_url` - Redirect URLs after checkout (not webhook endpoints)
- No Stripe webhook handler detected (no signature verification)

**Outgoing:**
- Resend email sends (fire-and-forget from edge functions)

---

*Integration audit: 2026-01-27*
