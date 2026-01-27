---
phase: 02-verification-pipeline
plan: 02
subsystem: frontend-verification
tags: [fire-and-forget, timeclock, verify-face, feature-flag]

dependency-graph:
  requires: [02-01]
  provides: [frontend-verify-face-wiring]
  affects: [03-01]

tech-stack:
  added: []
  patterns: [fire-and-forget-invocation, three-way-gate]

key-files:
  created: []
  modified:
    - src/pages/Timeclock.tsx

decisions:
  - id: skip-break-verification
    description: "Skip verify-face for break actions"
    rationale: "Breaks do not capture photos, so face verification is not applicable"
  - id: data-dot-data-dot-id
    description: "Use data.data.id for time_entry_id"
    rationale: "clock-in-out returns { success, data: entry }, supabase.functions.invoke wraps in { data: response }"

metrics:
  duration: ~2 minutes
  completed: 2026-01-27
---

# Phase 2 Plan 2: Fire-and-Forget Frontend Wiring Summary

**One-liner:** Wire Timeclock.tsx to fire-and-forget call verify-face after clock-in/out, gated by feature flag + photo availability + profile photo existence

## What Was Done

### Task 1: Add fire-and-forget verify-face calls to clock-in/out
- Added verify-face invocation in `performClockIn` (after success check, before toast)
- Added verify-face invocation in `performClockOut` (same pattern)
- Three-way gate: `companyFeatures?.face_verification && photoUrl && authenticatedEmployee?.avatar_url`
- Fire-and-forget: no `await`, `.catch(() => {})` to suppress unhandled rejections
- Passes `time_entry_id`, `profile_id`, `company_id`, `clock_photo_url`, `profile_photo_url`
- Skipped `handleBreak` -- breaks do not capture photos
- **Commit:** `872fa0d`

## Deviations from Plan

None -- plan executed exactly as written.

## Verification Results

1. `verify-face` appears in both performClockIn and performClockOut -- PASS
2. No `await` on verify-face calls -- PASS
3. `face_verification` feature flag checked before each call -- PASS
4. Build passes (`npm run build` succeeds) -- PASS

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Skip break verification | Breaks don't capture photos; no photo to verify |
| Use `data.data.id` for time_entry_id | clock-in-out returns `{ success, data: entry }`, wrapped by invoke |

## Next Phase Readiness

- Full async verification pipeline is now wired end-to-end
- Edge function (02-01) + frontend trigger (02-02) complete
- Phase 3 (Admin Review UI) can proceed
- Deployment of edge function still pending Supabase CLI authentication
