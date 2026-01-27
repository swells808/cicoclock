---
phase: 02-verification-pipeline
plan: 01
subsystem: verification-engine
tags: [azure-face-api, edge-function, face-verification, deno]

dependency-graph:
  requires: [01-01, 01-02]
  provides: [verify-face-azure-integration]
  affects: [02-02, 03-01]

tech-stack:
  added: []
  patterns: [binary-image-upload, abort-controller-timeout, detect-verify-pipeline]

key-files:
  created: []
  modified:
    - supabase/functions/verify-face/index.ts

decisions:
  - id: binary-mode
    description: "Use binary (octet-stream) image upload to Azure instead of URL mode"
    rationale: "Works regardless of Supabase Storage bucket policy (public vs private)"

metrics:
  duration: ~1 minute
  completed: 2026-01-27
---

# Phase 2 Plan 1: Azure Face API Integration Summary

**One-liner:** Replace verify-face stub with full Azure Face API detect+verify pipeline using binary image upload and comprehensive error handling

## What Was Done

### Task 1: Implement Azure Face API verification in edge function
- Replaced the Phase 1 stub with complete Azure Face API integration
- Implements 3-call flow: detect(clock photo) + detect(profile photo) + verify(faceId1, faceId2)
- Binary mode (application/octet-stream) -- downloads image bytes, sends to Azure
- Five helper functions: `updateRecord`, `detectFace`, `verifyFaces`, `fetchWithTimeout`, `jsonResponse`
- AbortController timeouts: 25s for Azure API calls, 15s for image downloads
- All failure modes produce a `face_verifications` record with appropriate status:
  - `pending` -- initial insert
  - `verified` -- successful match/mismatch with confidence score
  - `skipped` -- missing clock or profile photo
  - `no_face` -- no face detected in either image
  - `error` -- Azure API failure, timeout, missing secrets, or unhandled error
- **Commit:** `4a311c7`

### Task 2: Deploy updated edge function
- Deployment attempted via `supabase functions deploy verify-face --no-verify-jwt`
- Blocked by: Supabase CLI not authenticated (no access token)
- Per plan: "If deployment fails due to CLI issues, note the error but do not block"
- **Action needed:** Run `supabase login` then `supabase functions deploy verify-face --no-verify-jwt`

## Deviations from Plan

None -- plan executed exactly as written.

## Authentication Gates

1. Task 2: Supabase CLI required authentication for deployment
   - Error: "Access token not provided. Supply an access token by running supabase login"
   - Function code is correct and ready to deploy after authentication

## Verification Results

1. File contains `face/v1.2/detect` and `face/v1.2/verify` API calls -- PASS
2. All error/skip paths call `updateRecord` -- PASS
3. AbortController timeout used via `fetchWithTimeout` -- PASS
4. Binary image mode (octet-stream) used -- PASS
5. All five status values handled (pending, verified, skipped, no_face, error) -- PASS

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Binary mode for image upload | Works regardless of storage bucket policy |
| Download-then-send pattern | Edge function fetches image bytes, sends to Azure as octet-stream |
| Status 200 for all handled outcomes | Even errors/skips return 200 since the function handled them; only validation failures return 400 |

## Next Phase Readiness

- Edge function code is complete and ready
- Deployment pending Supabase CLI authentication
- Azure Face API secrets must be set as real credentials (currently placeholders)
- Frontend fire-and-forget integration (02-02) can proceed
