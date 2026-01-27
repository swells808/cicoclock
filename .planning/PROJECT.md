# CICO Timeclock — Face Verification

## What This Is

A face verification feature for the CICO timeclock web app that compares clock-in/out photos against employee profile photos to detect potential buddy punching (clock fraud). The system flags mismatches for admin review without blocking the clock action.

## Core Value

Every clock-in/out is verified against the employee's profile photo, and mismatches are surfaced to admins so they can investigate fraud.

## Requirements

### Validated

<!-- Existing capabilities inferred from codebase -->

- ✓ Employee clock-in/out with photo capture — existing
- ✓ Admin-uploaded profile photos per employee — existing
- ✓ Supabase edge functions for clock-in/out logic — existing
- ✓ Multi-tenant company scoping on all data — existing
- ✓ Admin time tracking dashboard — existing
- ✓ PIN, password, badge, and manual employee authentication — existing

### Active

- [ ] Azure AI Face API integration for photo-to-photo comparison
- [ ] Face verification runs on every clock-in/out that includes a photo
- [ ] Mismatch results are stored with confidence score per time entry
- [ ] Clock-in/out always succeeds regardless of verification result (non-blocking)
- [ ] Flagged entries visible to admins with side-by-side photo comparison and match score
- [ ] Fixed confidence threshold for flagging (system default, e.g. 70%)
- [ ] Graceful degradation when Face API is unavailable (allow clock, log failure)

### Out of Scope

- Liveness detection — adds complexity, not needed for photo comparison use case
- Entra Verified ID / Face Check — too heavy for this use case (requires credential enrollment)
- Admin-configurable threshold — fixed default is sufficient for v1
- Blocking clock-in/out on mismatch — verification is advisory only
- Real-time notifications to admins — they review flagged entries on their own schedule
- Employee self-service profile photo update — admin uploads only

## Context

- Existing app is a React SPA + Supabase (Postgres, Edge Functions, Storage)
- Clock-in/out already captures photos via `PhotoCapture.tsx` component
- Photos stored in Supabase Storage, referenced by `photo_url` in time entries
- Profile photos are admin-uploaded and stored per employee profile
- Edge function `clock-in-out` handles the server-side clock logic
- Azure AI Face API provides a `verify` endpoint: send two face images, get confidence score + match boolean
- Face API requires an Azure Cognitive Services resource with Face API enabled

## Constraints

- **Tech stack**: Must integrate with existing Supabase Edge Functions (Deno runtime)
- **API**: Azure AI Face API for face comparison
- **UX**: Verification must not slow down or block the clock-in/out flow
- **Privacy**: Face comparison data (scores) stored only in own database, no face data persisted in Azure

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Azure AI Face API over Entra Face Check | Simpler integration, direct photo comparison without credential enrollment | — Pending |
| Non-blocking verification (flag only) | Avoids disrupting employees when API fails or false negatives occur | — Pending |
| Fixed threshold over configurable | Reduces scope, can add configurability later if needed | — Pending |
| Server-side verification via edge function | Keeps API keys secure, doesn't expose Azure credentials to client | — Pending |

---
*Last updated: 2026-01-27 after initialization*
