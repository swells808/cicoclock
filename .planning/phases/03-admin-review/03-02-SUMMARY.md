---
phase: 03-admin-review
plan: 02
subsystem: admin-ui
tags: [react, supabase, face-verification, dialog, admin-review]

dependency-graph:
  requires: [03-01]
  provides: [face-review-dialog, approve-reject-workflow]
  affects: []

tech-stack:
  added: []
  patterns: [signed-url-fetching-in-dialog, supabase-update-with-auth-user]

key-files:
  created:
    - src/components/admin/FaceReviewDialog.tsx
  modified:
    - src/pages/AdminTimeTracking.tsx

decisions:
  - id: dialog-owns-signed-urls
    description: "FaceReviewDialog fetches its own signed URLs on open rather than receiving them as props"
    rationale: "Profile photo URLs from face_verifications are not part of the existing signed URL pipeline in AdminTimeTracking"

metrics:
  duration: "3 minutes"
  completed: "2026-01-27"
---

# Phase 3 Plan 2: Face Review Dialog Summary

Side-by-side photo comparison dialog with approve/reject actions persisting review decisions to face_verifications table, with cache invalidation for instant UI updates.

## What Was Done

### Task 1: Create FaceReviewDialog component
- Created `src/components/admin/FaceReviewDialog.tsx` following EditTimeEntryDialog pattern
- Side-by-side grid: profile photo (left) vs clock photo (right) with signed URL fetching
- Confidence score display with color coding: red (<50%), orange (50-80%), green (>=80%)
- Match status: "Yes" (green) / "No" (red)
- Approve button (green) and Reject button (destructive) calling handleReview
- handleReview updates face_verifications with review_decision, reviewed_by, reviewed_at
- Loading skeletons while fetching signed URLs, placeholder for missing photos
- **Commit:** 8cf32f0

### Task 2: Wire FaceReviewDialog into AdminTimeTracking
- Added useQueryClient import and reviewDialog state variables
- Created handleReviewClick handler that looks up verification from verificationMap
- Passed onReviewClick to TimeEntryTimelineCard for flagged entries (gated on admin + feature flag)
- Rendered FaceReviewDialog after EditTimeEntryDialog, gated on isAdmin and face_verification
- onSuccess invalidates both face-verifications and flagged-count query caches
- **Commit:** a4ea22e

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Dialog fetches own signed URLs | Profile photo URL from face_verifications not in existing signed URL pipeline |
| Parent handles cache invalidation | Keeps dialog reusable; onSuccess callback pattern matches EditTimeEntryDialog |

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

1. TypeScript compiles without errors
2. Production build succeeds
3. FaceReviewDialog component exists with approve/reject functionality
4. AdminTimeTracking wires dialog open/close and cache invalidation
5. Review decisions persist (review_decision, reviewed_by, reviewed_at columns updated)
6. Flag badge updates after review without page refresh (via query invalidation)

## Next Phase Readiness

Phase 3 is now complete. All admin review requirements are implemented:
- Flag indicators on time entries (Plan 01)
- Side-by-side photo review dialog with approve/reject (Plan 02)
- Flagged count in summary card (Plan 01)
- Cache invalidation for instant UI updates (Plan 02)
