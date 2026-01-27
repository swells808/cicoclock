---
phase: 01-foundation
plan: 02
subsystem: face-verification
tags: [edge-function, azure, admin-ui, supabase]
dependency-graph:
  requires: [01-01]
  provides: [verify-face-function, face-verification-toggle, azure-secrets]
  affects: [02-01, 02-02]
tech-stack:
  added: []
  patterns: [edge-function-stub, feature-toggle]
key-files:
  created:
    - supabase/functions/verify-face/index.ts
  modified:
    - supabase/config.toml
    - src/components/settings/CompanyForm.tsx
decisions:
  - id: verify-jwt-false
    summary: verify-face uses verify_jwt=false (called from client with anon key)
metrics:
  duration: ~5min
  completed: 2026-01-27
---

# Phase 1 Plan 2: Edge Function + Admin Toggle Summary

**Stubbed verify-face edge function deployed with Azure placeholder secrets; face verification toggle added to admin company settings.**

## What Was Done

### Task 1: Create and deploy verify-face edge function stub
- Created `supabase/functions/verify-face/index.ts` following clock-in-out pattern
- Accepts POST with `time_entry_id`, `profile_id`, `company_id`, `clock_photo_url`, `profile_photo_url`
- Validates required fields, reads Azure env vars, inserts pending record into `face_verifications`
- Returns `{ success, data, azure_configured }` response
- Registered in `config.toml` with `verify_jwt = false`
- Deployed to Supabase project `ahtiicqunajyyasuxebj`
- Set `AZURE_FACE_ENDPOINT` and `AZURE_FACE_API_KEY` as placeholder secrets
- Verified: function responds to POST (returns FK error on fake UUIDs as expected)

### Task 2: Add face verification toggle to CompanyForm.tsx
- Added `face_verification: false` to features state initialization
- Added loading from `companyFeatures.face_verification` in useEffect
- Added Switch toggle with label "Face Verification" and description
- Included `face_verification` in save handler payload

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

- verify-face function deployed and responds to HTTP POST requests
- config.toml contains `[functions.verify-face]` entry
- Azure secrets set (placeholder values)
- CompanyForm.tsx has face_verification toggle in state, loader, JSX, and save handler
- TypeScript types already include `face_verification` on `company_features` (from Plan 01 migration)

## Phase 1 Completion Status

All Phase 1 success criteria met:
1. face_verifications table exists with RLS (Plan 01)
2. verify-face edge function deployed and responds (Plan 02, Task 1)
3. Azure secrets configured and accessible from edge function (Plan 02, Task 1)
4. Admin can toggle face verification on/off per company (Plan 02, Task 2)

## Next Phase Readiness

Phase 2 (Verification Pipeline) can proceed. The verify-face stub needs to be replaced with actual Azure Face API detect+verify calls. User must update placeholder Azure secrets with real credentials before Phase 2 testing.
