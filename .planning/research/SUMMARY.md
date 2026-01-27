# Project Research Summary

**Project:** CICO Timeclock - Face Verification
**Domain:** Workforce time-and-attendance biometric verification
**Researched:** 2026-01-27
**Confidence:** HIGH

## Executive Summary

Face verification for timeclocks is a well-understood domain. The proven approach is: capture a photo at clock-in, compare it server-side against a stored profile photo using a cloud face API, and surface mismatches to admins as flags -- never block the clock action. Azure Face API v1.2 provides a simple two-step REST flow (Detect + Verify) that runs cleanly from Supabase Edge Functions via native fetch. No SDK is needed or available for Deno.

The recommended architecture is async fire-and-forget: the existing `clock-in-out` edge function triggers a new `verify-face` edge function after the clock event succeeds. Results land in a dedicated `face_verifications` table. The admin UI surfaces flagged entries with side-by-side photo comparison and approve/reject workflow. The employee experience does not change at all.

The single biggest risk is the Azure Limited Access gate -- face verification requires Microsoft approval, and building before approval is confirmed wastes effort. Apply immediately. Secondary risks are biometric privacy compliance (BIPA/GDPR require explicit consent before capturing face data) and threshold tuning (start non-blocking, collect real data, then tune). All three are manageable with upfront planning.

## Key Findings

### Recommended Stack

Azure Face API v1.2 via REST, called from a new Supabase Edge Function. API key auth stored as Edge Function secrets. No SDK, no npm shims.

**Core technologies:**
- **Azure Face API v1.2**: Face detection + verification -- best accuracy with detection_03 and recognition_04 models
- **Supabase Edge Function (Deno)**: `verify-face` function -- runs async, writes to database, no client exposure of API keys
- **REST via fetch**: Integration method -- Azure has no Deno SDK; REST is straightforward and correct

**Critical version/config:** detection_03 model, recognition_04 model, `faceIdTimeToLive=120` on detect calls.

### Expected Features

**Must have (table stakes):**
- Server-side async verification (non-blocking clock action)
- Confidence score + verification status stored per time entry
- Flagged entry indicators in admin time entries view
- Side-by-side photo comparison for admin review
- Graceful degradation on API failure (mark "unverified", never block)

**Should have (build in v1):**
- Flag summary count for admins ("3 flagged entries today")
- Filter for flagged/unverified entries
- Admin resolve/dismiss action on flags (prevents pile-up)
- Company-level verification enable/disable toggle

**Defer (v2+):**
- Configurable threshold per company
- Liveness detection (high complexity, out of scope)
- Multiple reference photos per employee
- Notification on flag, analytics/trends, audit log

### Architecture Approach

Async fire-and-forget. The `clock-in-out` function fires a non-awaited fetch to `verify-face` after the clock event DB write succeeds. `verify-face` downloads both photos, calls Azure Detect twice (one per photo) to get temporary faceIds, calls Verify, and writes the result to `face_verifications`. No pre-registration or PersonGroup needed -- every verification is self-contained.

**Major components:**
1. **`clock-in-out` edge function (modified)** -- adds fire-and-forget call to verify-face after clock event
2. **`verify-face` edge function (new)** -- Azure Face API integration, writes to face_verifications
3. **`face_verifications` table (new)** -- stores status, confidence, photos used, admin review fields
4. **Admin UI components (new)** -- flag indicators, side-by-side view, review actions on AdminTimeTracking page

### Critical Pitfalls

1. **Azure Limited Access gate** -- Apply for approval NOW via https://aka.ms/facerecognition. Do not write code until approved. This is a hard blocker.
2. **Biometric privacy (BIPA/GDPR)** -- Explicit consent UI and privacy notice must ship WITH the feature. BIPA allows $1K-$5K per violation in statutory damages.
3. **Threshold tuning** -- Start with Azure's default (0.5 for isIdentical), store raw confidence scores, run in audit mode before committing to a threshold. Non-blocking model makes this safe.
4. **FaceId expiration** -- Azure faceIds expire after 24 hours. Never store/reuse faceIds across sessions. Always call Detect fresh on both images per verification.
5. **Rate limits at shift change** -- Implement retry with exponential backoff for 429s. Use paid tier (S0) for higher TPS. Queue is acceptable since verification is non-blocking.

## Implications for Roadmap

### Phase 0: Prerequisites
**Rationale:** Hard blockers that must be resolved before any code is written.
**Delivers:** Azure access, legal compliance plan, infrastructure
**Actions:**
- Apply for Azure Limited Access approval
- Provision Azure Face API resource in nearest region to Supabase Edge Functions
- Set AZURE_FACE_ENDPOINT and AZURE_FACE_API_KEY as Supabase secrets
- Draft biometric consent copy and retention policy (legal review)
**Avoids:** Pitfall 1 (Limited Access gate), Pitfall 2 (privacy), Pitfall 10 (region)

### Phase 1: Database + Edge Function
**Rationale:** Data layer and API integration are the foundation; nothing else works without them.
**Delivers:** Working face verification pipeline that produces records in the database
**Features:** Server-side verification, confidence score storage, graceful degradation, verification status per entry
**Avoids:** Pitfall 6 (faceId expiration -- fresh detect per call), Pitfall 5 (rate limits -- retry logic), Pitfall 7 (no face detected -- explicit status handling)

### Phase 2: Admin UI
**Rationale:** Depends on Phase 1 producing verification records. This is how admins consume the data.
**Delivers:** Complete admin review workflow for flagged entries
**Features:** Flag indicators on time entries, side-by-side photo comparison, approve/reject actions, flag summary count, flagged entry filter
**Avoids:** Flag pile-up (resolve/dismiss action included from the start)

### Phase 3: Polish and Operational Controls
**Rationale:** Refinements based on real usage data from Phases 1-2
**Delivers:** Production hardening and company-level controls
**Features:** Company enable/disable toggle, enrollment photo quality validation, edge case handling (multiple faces, obstructions), image compression/retention policy

### Phase Ordering Rationale

- Phase 0 must come first because Azure approval is a hard gate with unpredictable timeline
- Phase 1 before Phase 2 because admin UI needs real verification records to display
- Phase 3 last because it requires real-world usage data to inform decisions (threshold tuning, quality checks)
- All phases maintain the non-blocking guarantee -- the clock action is never degraded

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 0:** Legal/consent requirements vary by jurisdiction -- may need legal counsel input
- **Phase 2:** Admin UI layout decisions benefit from reviewing existing AdminTimeTracking page structure

Phases with standard patterns (skip research-phase):
- **Phase 1:** Azure REST API is well-documented; edge function pattern is established in the codebase
- **Phase 3:** Standard CRUD and configuration patterns

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Verified against official Microsoft REST API v1.2 docs |
| Features | MEDIUM | Based on training data knowledge of competitor products; features may have evolved |
| Architecture | HIGH | Based on codebase analysis + Azure API behavior |
| Pitfalls | HIGH for technical, MEDIUM for legal | BIPA/privacy guidance needs legal counsel validation |

**Overall confidence:** HIGH

### Gaps to Address

- **Azure Limited Access approval timeline:** Unknown -- apply immediately and track
- **Biometric consent legal review:** Research identified the risk; actual consent language needs legal counsel
- **Azure pricing verification:** Pricing page could not be fetched live; verify at https://azure.microsoft.com/en-us/pricing/details/cognitive-services/face-api/
- **Existing codebase integration points:** Architecture assumes current `clock-in-out` edge function structure; verify during Phase 1 planning

## Sources

### Primary (HIGH confidence)
- Azure Face API Detect endpoint: https://learn.microsoft.com/en-us/rest/api/face/face-detection-operations/detect
- Azure Face API Verify endpoint: https://learn.microsoft.com/en-us/rest/api/face/face-recognition-operations/verify-face-to-face
- Azure Limited Access policy: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-identity
- Azure Face Detection guide: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/how-to/identity-detect-faces

### Secondary (MEDIUM confidence)
- Competitor product feature sets (Deputy, QuickBooks Time, Homebase, Hubstaff, BambooHR) -- based on training data
- BIPA statutory damages and biometric consent requirements -- verify with legal counsel

### Tertiary (LOW confidence)
- Azure rate limits and pricing specifics -- verify at Azure pricing page

---
*Research completed: 2026-01-27*
*Ready for roadmap: yes*
