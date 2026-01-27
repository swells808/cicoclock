# Feature Landscape: Face Verification for Timeclock

**Domain:** Workforce management / time-and-attendance face verification
**Researched:** 2026-01-27
**Overall confidence:** MEDIUM (based on training data knowledge of products like Deputy, TSheets/QuickBooks Time, Homebase, BambooHR, Hubstaff; WebSearch unavailable for live verification)

## Table Stakes

Features users expect from any face verification in a timeclock product. Missing any of these makes the feature feel broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Photo capture at clock-in/out | Provides the comparison image; users already expect this from CICO | Low | Already exists in CICO |
| Profile photo as reference baseline | Need something to compare against | Low | Already exists (admin-uploaded) |
| Server-side comparison (not client) | Security -- API keys must not be exposed; tamper resistance | Low | Edge function pattern already established |
| Non-blocking verification | Employees must not be stuck if API fails or returns false negative | Low | Decided in PROJECT.md |
| Confidence score stored per entry | Admins need quantitative data, not just pass/fail | Low | Single float + boolean flag |
| Flagged entry indicator in admin view | Admins must see which entries failed verification at a glance | Low | Badge/icon on time entry rows |
| Side-by-side photo comparison for admins | Admins need to make their own judgment on flagged entries | Medium | Profile photo vs clock photo, with score overlay |
| Graceful degradation on API failure | Clock must always work; verification is advisory | Low | Log the failure, mark as "unverified" not "failed" |
| Verification status per time entry | Three states: verified (pass), flagged (fail), unverified (no photo / API error) | Low | Enum column on time entries |

## Differentiators

Features that add polish or competitive advantage. Not required for v1 but worth knowing about.

| Feature | Value Proposition | Complexity | Recommendation |
|---------|-------------------|------------|----------------|
| Admin dashboard with flag summary | "3 flagged entries today" at a glance; Deputy and Homebase surface this | Medium | Build in v1 -- it is the primary way admins consume verification data |
| Flag filtering on time entries list | Filter to show only flagged/unverified entries | Low | Build in v1 -- trivial filter, high value |
| Admin resolve/dismiss action on flags | Mark a flag as "reviewed" or "confirmed fraud" so it does not clutter the list | Medium | Build in v1 -- without this, flags pile up with no workflow |
| Configurable confidence threshold | Let admins tune sensitivity per company | Low | Defer -- fixed threshold is fine for v1 per PROJECT.md |
| Liveness detection | Prevent photo-of-a-photo attacks | High | Defer -- out of scope, adds cost and UX friction |
| Multiple reference photos per employee | Better accuracy across lighting, angles, haircuts | Medium | Defer -- single profile photo is sufficient for v1 |
| Notification on flag (email/push) | Alert admins immediately when mismatch detected | Medium | Defer -- out of scope per PROJECT.md, admins review on own schedule |
| Verification analytics/trends | "Employee X flagged 12 times this month" trend chart | Medium | Defer -- nice for v2 once data accumulates |
| Audit log of admin review actions | Compliance trail of who reviewed what and when | Medium | Defer to v2 -- valuable for larger orgs |
| Bulk resolve flags | Select multiple flagged entries and resolve at once | Low | Defer -- nice polish, not needed at launch |
| Auto-retake prompt on poor photo quality | "Face not detected, try again" before submitting | Medium | Defer -- Azure returns face detection info, could use it later |

## Anti-Features

Features to deliberately NOT build for v1. Common mistakes in this domain.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Blocking clock-in on mismatch | False negatives lock out legitimate employees; creates support burden; legal risk in some jurisdictions | Non-blocking flag-only model. Always allow the clock action. |
| Client-side face comparison | Exposes API keys, can be bypassed by modifying client code, inconsistent results across devices | Server-side comparison in Supabase Edge Function |
| Storing face embeddings/encodings locally | Privacy liability; not needed when using Azure verify endpoint directly with photos | Send photos to Azure per-request, store only the score and match boolean |
| Per-employee threshold tuning | Over-engineering; creates confusing admin UX; hard to explain why thresholds differ | Single fixed threshold for all employees |
| Real-time face detection in camera preview | Heavy client-side processing, poor mobile performance, unnecessary for photo comparison | Simple photo capture (already exists), compare server-side after the fact |
| Facial recognition (identify WHO) vs verification (confirm MATCH) | Recognition requires face enrollment database, is legally more complex (BIPA, GDPR), and is not what you need | Verification only: "Is this the same person?" not "Who is this person?" |
| Admin ability to override clock entry based on face data alone | Face verification is one signal, not definitive proof; admins should use it alongside other context | Flag + review workflow; admin edits time entries through existing edit flow |
| Automatic disciplinary actions on repeated flags | Legal risk; false positives happen; HR decisions should not be automated | Surface data (flag counts, trends) but leave action to humans |

## Typical Verification UX Flow

### Employee Clock-In/Out Flow (unchanged from current)

```
1. Employee selects their name / enters PIN / scans badge
2. Camera activates, employee sees preview
3. Employee taps "Clock In" (or "Clock Out")
4. Photo is captured and uploaded to Supabase Storage
5. Clock action succeeds immediately (response to employee)
6. [NEW - async/background] Edge function sends clock photo + profile photo to Azure Face API
7. [NEW - async/background] Verification result (score, match boolean) saved to time entry record
8. Employee sees confirmation. Done. They never see verification results.
```

Key UX principle: The employee experience does not change. Verification is invisible to the person clocking in. Only admins see results.

### Admin Review Flow

```
1. Admin opens Time Tracking / Entries view
2. Flagged entries show a visual indicator (red badge, warning icon)
3. Summary banner: "X flagged entries need review" (differentiator, recommend for v1)
4. Admin clicks a flagged entry
5. Detail view shows:
   - Side-by-side: profile photo (left) vs clock photo (right)
   - Match confidence score (e.g., "42% match")
   - Verification status badge (Flagged / Verified / Unverified)
   - Time entry details (employee name, time, location if applicable)
6. Admin can:
   - "Dismiss" flag (false positive, mark as reviewed)
   - "Confirm" flag (suspected fraud, mark for follow-up)
   - Edit time entry through existing edit flow if needed
7. Resolved flags no longer appear in "needs review" filter
```

### Edge Cases in the Flow

| Scenario | Behavior |
|----------|----------|
| No profile photo uploaded | Clock succeeds, entry marked "unverified", admin prompted to upload profile photo |
| Camera declined / no clock photo | Clock succeeds (if allowed by existing config), entry marked "unverified" |
| Azure API timeout or error | Clock succeeds, entry marked "unverified", error logged for debugging |
| Azure returns "no face detected" in one or both photos | Entry marked "unverified" with reason "face not detected", not treated as mismatch |
| Score exactly at threshold | Treat as pass (>=), not flag. Prefer false negatives over false positives in a non-blocking system. |

## Data Model for Verification Results

### Per Time Entry (extend existing `time_entries` table or related)

| Field | Type | Purpose |
|-------|------|---------|
| `verification_status` | enum: `verified`, `flagged`, `unverified`, `pending` | Overall status. `pending` = photo submitted, verification not yet complete |
| `verification_score` | float (0.0 - 1.0) nullable | Azure confidence score. Null if unverified/error |
| `verification_is_match` | boolean nullable | Azure's match determination at their threshold. Null if unverified |
| `verification_flagged` | boolean default false | Whether score fell below CICO's configured threshold |
| `verification_error` | text nullable | Error message if API call failed (for debugging) |
| `verification_attempted_at` | timestamptz nullable | When the API call was made |
| `profile_photo_url` | text nullable | Snapshot of which profile photo was used for comparison (profile photos can change) |

### Admin Review (new table: `verification_reviews`)

| Field | Type | Purpose |
|-------|------|---------|
| `id` | uuid PK | |
| `time_entry_id` | uuid FK | Which entry was reviewed |
| `reviewed_by` | uuid FK to profiles | Admin who reviewed |
| `review_action` | enum: `dismissed`, `confirmed` | What the admin decided |
| `review_note` | text nullable | Optional admin comment |
| `reviewed_at` | timestamptz | When review happened |
| `company_id` | uuid FK | Tenant scoping (standard CICO pattern) |

### Verification Settings (per company, future-proofing)

| Field | Type | Purpose |
|-------|------|---------|
| `company_id` | uuid FK PK | |
| `threshold` | float default 0.7 | Match threshold (fixed for v1, but column exists for v2 configurability) |
| `enabled` | boolean default true | Kill switch to disable verification without removing code |

## Feature Dependencies

```
Profile photos exist (existing)
  +-- Photo capture at clock (existing)
       +-- Server-side Azure Face API call
            +-- Verification score stored on time entry
                 +-- Flagged entry indicator in admin view
                      +-- Side-by-side comparison detail view
                           +-- Admin resolve/dismiss action
                                +-- Flag summary dashboard widget
```

## MVP Feature Set (Recommended)

Build these for v1:

1. **Azure Face API integration in edge function** -- core capability
2. **Verification result storage on time entries** -- data foundation
3. **Graceful degradation on API failure** -- reliability
4. **Flagged entry indicator in admin time entries list** -- visibility
5. **Filter for flagged/unverified entries** -- workflow efficiency
6. **Side-by-side photo comparison view** -- admin judgment
7. **Admin resolve/dismiss action** -- prevent flag pile-up
8. **Flag summary count** -- at-a-glance awareness
9. **Verification enabled/disabled toggle per company** -- operational control

Defer to post-MVP:

- Configurable threshold: fixed 0.7 is fine to start
- Liveness detection: out of scope, high complexity
- Multiple reference photos: single profile photo is sufficient
- Notifications: admins review on their own schedule
- Analytics/trends: needs data accumulation first
- Audit log: v2 compliance feature

## Sources

- Product knowledge of Deputy, QuickBooks Time (TSheets), Homebase, Hubstaff, BambooHR Time Tracking based on training data (MEDIUM confidence -- products may have updated features since training cutoff)
- Azure AI Face API verify endpoint behavior based on training data (HIGH confidence -- well-documented, stable API)
- PROJECT.md decisions and constraints (HIGH confidence -- project-specific)

---
*Feature landscape analysis: 2026-01-27*
