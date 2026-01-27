# Architecture: Face Verification Integration

**Project:** CICO Timeclock - Face Verification
**Researched:** 2026-01-27
**Confidence:** HIGH (based on codebase analysis + Azure Face API docs)

## Decision: Asynchronous, Non-Blocking Verification

**Verdict: Async (fire-and-forget from the clock-in/out edge function).**

Rationale:
- The product requirement is "always allow clock, flag mismatches" -- synchronous verification adds latency for zero user-facing benefit
- Azure Face API calls take 200-800ms; adding that to clock-in/out degrades the kiosk experience
- If Azure is down, clock-in/out must still work -- async decouples availability
- Async lets us retry failed verifications without blocking the employee

**How it works:**
1. `clock-in-out` edge function processes the clock event as today (insert/update time_entries)
2. After the DB write succeeds, fire-and-forget: invoke a separate `verify-face` edge function
3. `verify-face` runs independently, writes results to `face_verifications` table
4. Admin dashboard queries `face_verifications` to surface flagged entries

## Edge Function Integration

### Modified: `clock-in-out/index.ts`

Minimal change. After the successful insert (clock_in) or update (clock_out), add:

```typescript
// After successful clock-in insert (line ~101) or clock-out update (line ~167):
// Fire-and-forget face verification
try {
  const verifyUrl = `${supabaseUrl}/functions/v1/verify-face`;
  fetch(verifyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({
      time_entry_id: newEntry.id,  // or updatedEntry.id for clock-out
      profile_id,
      company_id,
      photo_url,                    // the clock photo just taken
      action,                       // 'clock_in' or 'clock_out'
    }),
  });
  // Intentionally not awaited -- fire and forget
} catch (e) {
  console.error('Failed to trigger face verification:', e);
  // Never block clock-in/out for verification failure
}
```

### New: `verify-face/index.ts`

This edge function:
1. Receives `time_entry_id`, `profile_id`, `company_id`, `photo_url`, `action`
2. Fetches the employee's `avatar_url` from `profiles` table
3. If no `avatar_url` exists, writes a verification record with `status: 'skipped'` and exits
4. Downloads both images from Supabase Storage (clock photo + profile photo)
5. Calls Azure Face API `/detect` on both images to get `faceId`s
6. Calls Azure Face API `/verify` with both `faceId`s
7. Writes result to `face_verifications` table

**Azure Face API approach: Send both photos each time (no pre-registration).**

Rationale:
- Azure Face API `faceId`s expire after 24 hours -- pre-registering would require a PersonGroup with ongoing enrollment management
- PersonGroup approach adds complexity (enrollment edge function, handling profile photo updates, cleanup)
- Detect + Verify is two API calls per clock event (~$0.001 per pair at Azure pricing) -- negligible cost
- Simpler to reason about: every verification is self-contained

```
Flow:
  clock photo ──> /detect ──> faceId_1 ─┐
                                          ├──> /verify ──> { isIdentical, confidence }
  profile photo ─> /detect ──> faceId_2 ─┘
```

## Database Schema

### New table: `face_verifications`

```sql
CREATE TABLE public.face_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  time_entry_id UUID NOT NULL REFERENCES public.time_entries(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out')),

  -- Verification results
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'matched', 'mismatched', 'failed', 'skipped')),
  confidence REAL,              -- Azure confidence score 0.0-1.0
  is_identical BOOLEAN,         -- Azure's boolean verdict

  -- Admin review
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  review_decision TEXT CHECK (review_decision IN ('approved', 'rejected')),

  -- Debugging / audit
  error_message TEXT,           -- If status = 'failed', why
  clock_photo_url TEXT,         -- Snapshot of URLs used (in case originals change)
  profile_photo_url TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for admin dashboard queries: "show me all mismatches for my company"
CREATE INDEX idx_face_verifications_company_status
  ON public.face_verifications(company_id, status);

-- Index for looking up verification by time entry
CREATE INDEX idx_face_verifications_time_entry
  ON public.face_verifications(time_entry_id);

-- RLS
ALTER TABLE public.face_verifications ENABLE ROW LEVEL SECURITY;

-- Admins can read verifications for their company
CREATE POLICY "Admins can view face verifications"
  ON public.face_verifications FOR SELECT
  USING (company_id = public.get_current_user_company_id());

-- Only service role writes (edge function)
-- No insert/update policy needed for regular users
```

### Status meanings

| Status | Meaning |
|--------|---------|
| `pending` | Verification triggered but not yet complete (should be transient) |
| `matched` | Azure says faces match (confidence >= threshold) |
| `mismatched` | Azure says faces do NOT match |
| `failed` | API error, no face detected, or other technical failure |
| `skipped` | No profile photo on file, verification impossible |

### Threshold

Use Azure's recommended threshold of **0.5** for `isIdentical`. Azure returns this as a boolean already, but store the raw `confidence` score so admins can see near-misses and you can tune the threshold later without re-running verifications.

## Admin UI: Surfacing Flagged Entries

### Where it lives

Add a "Verification Alerts" section to the existing `AdminTimeTracking` page. This is the natural location since admins already review time entries there.

**Components:**

1. **Alert badge** on the admin nav/sidebar -- count of unreviewed mismatches
2. **Filter on AdminTimeTracking** -- "Show flagged entries" toggle that filters to time entries with `mismatched` or `failed` verifications
3. **Verification detail** inline on each time entry row -- small icon (green check / red warning / gray skip) with expandable detail showing:
   - Side-by-side photos (profile vs clock photo)
   - Confidence score
   - Review action buttons (Approve / Reject + notes)

### Query pattern

```typescript
// Fetch flagged entries for admin dashboard
const { data } = await supabase
  .from('face_verifications')
  .select(`
    *,
    time_entry:time_entries(start_time, end_time),
    profile:profiles(display_name, first_name, last_name, avatar_url)
  `)
  .eq('company_id', companyId)
  .in('status', ['mismatched', 'failed'])
  .is('review_decision', null)
  .order('created_at', { ascending: false });
```

## Component Boundaries

| Component | Responsibility | Touches |
|-----------|---------------|---------|
| `clock-in-out` edge fn | Clock events + trigger verification | time_entries, verify-face |
| `verify-face` edge fn | Face comparison + write results | face_verifications, profiles, Supabase Storage, Azure Face API |
| Admin dashboard (React) | Display flags, allow review | face_verifications (read + update review fields) |
| Profile photo upload (existing) | Store reference photo | profiles.avatar_url, Supabase Storage |

## Build Order (Dependencies)

```
Phase 1: Database + Edge Function
  1. Migration: create face_verifications table
  2. New edge function: verify-face
  3. Modify clock-in-out to fire-and-forget to verify-face
  4. Environment: add AZURE_FACE_KEY, AZURE_FACE_ENDPOINT secrets

Phase 2: Admin UI
  (depends on Phase 1 -- needs data in face_verifications)
  5. Verification status icons on time entry rows
  6. Photo comparison view (side-by-side)
  7. Review actions (approve/reject)
  8. Alert badge for unreviewed mismatches

Phase 3: Polish
  (depends on Phase 2 -- needs feedback from real usage)
  9. Handle edge cases: no face detected in photo, multiple faces
  10. Company-level setting: enable/disable face verification
  11. Verification statistics/reporting
```

**Key dependency:** The admin UI (Phase 2) cannot be built until the edge function (Phase 1) is producing verification records. However, you can scaffold the UI components with mock data in parallel if desired.

## Environment Variables Required

```
AZURE_FACE_KEY=<subscription key>
AZURE_FACE_ENDPOINT=https://<region>.api.cognitive.microsoft.com
```

Set via `supabase secrets set` for edge functions.
