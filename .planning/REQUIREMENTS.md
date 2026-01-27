# Requirements: CICO Face Verification

**Defined:** 2026-01-27
**Core Value:** Every clock-in/out is verified against the employee's profile photo, and mismatches are surfaced to admins

## v1 Requirements

### Verification Core

- [x] **VCORE-01**: System compares clock-in/out photo against employee profile photo using Azure AI Face API
- [x] **VCORE-02**: Verification runs asynchronously after clock action (non-blocking, fire-and-forget)
- [x] **VCORE-03**: Confidence score and match status stored per time entry verification
- [x] **VCORE-04**: Clock-in/out always succeeds regardless of verification result
- [x] **VCORE-05**: System gracefully handles API errors, timeouts, and missing photos (marks as "unverified")

### Admin Review

- [x] **ADMIN-01**: Flagged time entries display visual indicator in admin time tracking view
- [x] **ADMIN-02**: Admin can view side-by-side profile photo vs clock photo with confidence score
- [x] **ADMIN-03**: Admin can approve (dismiss) or reject (confirm fraud) flagged entries
- [x] **ADMIN-04**: Summary count of unreviewed flagged entries shown to admins

### Settings

- [x] **SETT-01**: Company-level toggle to enable/disable face verification

### Infrastructure

- [x] **INFRA-01**: New `verify-face` Supabase Edge Function calling Azure Face API
- [x] **INFRA-02**: New `face_verifications` database table with RLS policies
- [x] **INFRA-03**: Azure Face API secrets configured as Supabase Edge Function secrets

## v2 Requirements

### Configurable Threshold

- **THRESH-01**: Admin can adjust confidence threshold per company

### Enhanced Detection

- **DETECT-01**: Client-side prompt to retake photo when no face detected
- **DETECT-02**: Multiple reference photos per employee for better accuracy

### Analytics

- **ANAL-01**: Verification trend analytics per employee
- **ANAL-02**: Audit log of admin review actions

### Notifications

- **NOTIF-01**: Email/push notification to admin on flagged entry

## Out of Scope

| Feature | Reason |
|---------|--------|
| Liveness detection | High complexity, adds UX friction, not needed for photo comparison |
| Blocking clock-in on mismatch | False negatives lock out employees, legal risk |
| Entra Verified ID / Face Check | Too heavy, requires credential enrollment |
| Client-side face comparison | Security risk (API keys exposed), inconsistent results |
| Per-employee threshold tuning | Over-engineering, confusing admin UX |
| Automatic disciplinary actions | Legal risk, HR decisions should not be automated |
| Facial recognition (identify WHO) | Only verification (confirm MATCH) needed, recognition has stricter legal requirements |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VCORE-01 | Phase 2 | Complete |
| VCORE-02 | Phase 2 | Complete |
| VCORE-03 | Phase 2 | Complete |
| VCORE-04 | Phase 2 | Complete |
| VCORE-05 | Phase 2 | Complete |
| ADMIN-01 | Phase 3 | Complete |
| ADMIN-02 | Phase 3 | Complete |
| ADMIN-03 | Phase 3 | Complete |
| ADMIN-04 | Phase 3 | Complete |
| SETT-01 | Phase 1 | Complete |
| INFRA-01 | Phase 1 | Complete |
| INFRA-02 | Phase 1 | Complete |
| INFRA-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0

---
*Requirements defined: 2026-01-27*
*Last updated: 2026-01-27 after roadmap creation*
