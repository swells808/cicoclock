# Roadmap: CICO Face Verification

**Created:** 2026-01-27
**Depth:** Quick (3 phases)
**Coverage:** 13/13 v1 requirements mapped

## Overview

Three phases deliver face verification end-to-end: infrastructure and configuration first, then the async verification pipeline, then admin review UI. Each phase builds on the previous and delivers a testable capability.

---

## Phase 1: Foundation

**Goal:** Infrastructure exists to support face verification -- database, edge function, secrets, and company toggle.

**Dependencies:** None (first phase)

**Requirements:** INFRA-01, INFRA-02, INFRA-03, SETT-01

**Plans:** 2 plans

Plans:
- [ ] 01-01-PLAN.md -- Database migration (face_verifications table, company_features column, RLS, types)
- [ ] 01-02-PLAN.md -- Edge function stub, Azure secrets, admin toggle UI

**Success Criteria:**
1. `face_verifications` table exists with RLS policies that scope data to the correct company
2. `verify-face` edge function is deployed and responds to invocations (even if verification logic is stubbed)
3. Azure Face API secrets are configured and accessible from the edge function
4. Admin can toggle face verification on/off per company, and the setting persists

---

## Phase 2: Verification Pipeline

**Goal:** Every clock-in/out with a photo is automatically verified against the employee's profile photo, with results stored and clock action never blocked.

**Dependencies:** Phase 1 (DB table, edge function, secrets)

**Requirements:** VCORE-01, VCORE-02, VCORE-03, VCORE-04, VCORE-05

**Success Criteria:**
1. After clocking in/out with a photo, a verification record appears in `face_verifications` with a confidence score and match status
2. Clock-in/out completes immediately without waiting for verification (async fire-and-forget)
3. Clock-in/out succeeds even when Azure Face API is down, unreachable, or returns an error -- the entry is marked "unverified"
4. When an employee has no profile photo, clock succeeds and verification is skipped gracefully

---

## Phase 3: Admin Review

**Goal:** Admins can see flagged entries, compare photos side-by-side, and approve or reject flags.

**Dependencies:** Phase 2 (verification data exists to display)

**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04

**Success Criteria:**
1. Flagged time entries show a visual indicator (icon/badge) in the admin time tracking view
2. Admin can open a side-by-side view showing profile photo vs clock photo with the confidence score
3. Admin can approve (dismiss flag) or reject (confirm fraud) a flagged entry, and the decision persists
4. Admin dashboard shows a count of unreviewed flagged entries

---

## Progress

| Phase | Status | Requirements |
|-------|--------|--------------|
| 1 - Foundation | Planned | INFRA-01, INFRA-02, INFRA-03, SETT-01 |
| 2 - Verification Pipeline | Not Started | VCORE-01, VCORE-02, VCORE-03, VCORE-04, VCORE-05 |
| 3 - Admin Review | Not Started | ADMIN-01, ADMIN-02, ADMIN-03, ADMIN-04 |

---
*Roadmap created: 2026-01-27*
