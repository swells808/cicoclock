---
phase: 03-admin-review
plan: 01
subsystem: admin-ui
tags: [react, supabase, face-verification, admin]

dependency-graph:
  requires: [01-01, 01-02, 02-01, 02-02]
  provides: [face-verification-indicators, flagged-count-summary, useFaceVerifications-hook]
  affects: [03-02]

tech-stack:
  added: []
  patterns: [feature-flag-gated-ui, manual-supabase-join, verification-map-pattern]

key-files:
  created:
    - src/hooks/useFaceVerifications.ts
  modified:
    - src/components/reports/TimeEntryTimelineCard.tsx
    - src/pages/AdminTimeTracking.tsx

decisions:
  - id: worst-case-verification
    description: "When multiple verifications exist per entry, keep is_match=false (worst case)"
    rationale: "Admins should see flagged entries even if one of two checks passed"

metrics:
  duration: "4 minutes"
  completed: "2026-01-27"
---

# Phase 3 Plan 1: Flag Indicators Summary

JWT-less face verification flag badges on admin time tracking with flagged count in summary card, all gated behind face_verification feature flag.

## What Was Done

### Task 1: Create useFaceVerifications hook and useFlaggedCount hook
- Created `src/hooks/useFaceVerifications.ts` with two exported hooks
- `useFaceVerifications(entryIds, enabled)` fetches face_verifications by time_entry_id, returns Map keyed by entry ID
- Handles multiple verifications per entry by keeping worst case (is_match=false)
- `useFlaggedCount(companyId, enabled)` returns count of unreviewed flagged entries (is_match=false, review_decision=null)
- Both hooks gated by `enabled` param for feature flag control
- **Commit:** 13fc59c

### Task 2: Add flag badge to TimeEntryTimelineCard and wire into AdminTimeTracking
- Added `flagStatus` prop to `TimeEntryForCard` interface
- Added `onReviewClick` prop to `TimeEntryTimelineCardProps` (for Plan 02 review dialog)
- Imported ShieldAlert, ShieldCheck, ShieldX icons from lucide-react
- Renders flag badges in header row: red destructive "Flagged", green outline "Cleared", red outline "Rejected"
- Flagged badge is clickable via onReviewClick prop
- Wired useFaceVerifications and useFlaggedCount into AdminTimeTracking
- Maps verification data to flagStatus on each transformed entry
- Summary card shows "Flagged: N" when face_verification enabled and count > 0
- **Commit:** 5c471e4

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Worst-case verification selection | When multiple verifications exist per entry (clock-in + clock-out), keep the one with is_match=false so admins see flagged entries |
| Separate flagged count query | Lightweight head-only count query avoids fetching all verifications globally |
| onReviewClick prop added now | Prepares TimeEntryTimelineCard for Plan 02 review dialog without requiring future interface changes |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. TypeScript compiles without errors
2. Production build succeeds
3. TimeEntryForCard interface includes flagStatus field
4. AdminTimeTracking imports and uses both hooks
5. Summary card conditionally shows flagged count
6. All new UI gated behind companyFeatures?.face_verification

## Next Phase Readiness

Plan 03-02 (Face Review Dialog) can proceed. The `onReviewClick` prop and `FaceVerification` type export are ready for the review dialog to consume.
