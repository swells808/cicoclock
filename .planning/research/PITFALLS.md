# Domain Pitfalls: Face Verification Integration

**Domain:** Face verification for timeclock app (Azure Face API)
**Researched:** 2026-01-27

## Critical Pitfalls

Mistakes that cause rewrites, legal exposure, or blocked launches.

### Pitfall 1: Azure Limited Access Gate Blocks Launch

**What goes wrong:** Azure Face API identification and verification features require approval through Microsoft's Face Recognition intake form. Teams build the entire integration only to discover their application is rejected or delayed weeks/months.
**Why it happens:** The Limited Access policy is easy to miss. Free tier detection works without approval, giving false confidence that verification will too.
**Consequences:** Entire feature blocked at deployment. No workaround -- you cannot use face verification without approval.
**Prevention:**
- Apply for Limited Access approval FIRST, before writing any verification code
- Intake form: https://aka.ms/facerecognition
- Have the business justification ready (employee timeclock verification is a strong use case)
- Do not begin integration development until approval is confirmed
**Detection:** Try calling the Verify endpoint with your key -- you will get a 403 if not approved.
**Phase:** Must be resolved before any development begins (Phase 0 / pre-requisite).

### Pitfall 2: Biometric Privacy Law Violations (BIPA, GDPR, State Laws)

**What goes wrong:** Storing face data without proper consent, notice, or retention/destruction policies violates biometric privacy laws. BIPA (Illinois) allows $1,000-$5,000 per violation statutory damages. Multiple US states have similar laws.
**Why it happens:** Teams treat face data like any other app data. Biometric data has special legal status in many jurisdictions.
**Consequences:** Class action lawsuits (BIPA cases have resulted in $650M+ settlements). Regulatory fines under GDPR.
**Prevention:**
- Obtain explicit written consent before capturing/storing any face data
- Provide clear notice: what biometric data is collected, why, how long it is retained, when it is destroyed
- Implement a retention and destruction policy (do not store face data indefinitely)
- Document a lawful basis under GDPR if employees are in the EU
- Consult legal counsel on which state/country laws apply to your workforce
- Store face data (enrollment photos, faceIds) separately from general employee records with stricter access controls
**Detection:** No consent flow in the app is the warning sign. If employees can be enrolled without explicit opt-in, you have a problem.
**Phase:** Consent UI and privacy policy must ship WITH the feature, not after.

### Pitfall 3: Fixed Threshold Set Wrong

**What goes wrong:** Azure Face API returns a confidence score (0.0-1.0). A threshold set too high rejects legitimate employees (false negatives causing clock-in failures). A threshold set too low accepts wrong people (false positives defeating the purpose).
**Why it happens:** Teams pick a threshold without testing on their actual population. Azure documentation suggests thresholds but real-world conditions vary.
**Consequences:** Too strict = employees frustrated, unable to clock in, call support. Too lenient = verification is security theater.
**Prevention:**
- Start with Azure's recommended threshold of 0.6 for verification
- Log ALL confidence scores during initial rollout (even passing ones) to understand your distribution
- Plan a tuning period: run verification in "audit mode" (log but don't block) for 1-2 weeks
- Review the score distribution before committing to a blocking threshold
- Different populations and camera setups produce different score distributions
**Detection:** If more than 5% of legitimate clock-ins score below threshold during audit mode, the threshold is too strict or photo quality is an issue.
**Phase:** Initial implementation should be non-blocking (log only). Threshold tuning happens after real data collection.

---

## Moderate Pitfalls

Mistakes that cause delays, bad UX, or technical debt.

### Pitfall 4: Poor Enrollment Photo Quality

**What goes wrong:** The reference photo (enrollment) is low quality, and every subsequent verification attempt scores poorly against it.
**Why it happens:** Enrollment happens once, often casually. If the enrollment photo has bad lighting, odd angle, or obstructions, every future comparison suffers.
**Consequences:** Persistent false negatives for specific employees. "It never works for me" complaints.
**Prevention:**
- Enforce quality checks at enrollment time using Azure's `qualityForRecognition` attribute (requires Detection03 model + Recognition04)
- Reject enrollment photos rated below "high" quality
- Require: neutral expression, front-facing, good lighting, no obstructions
- Azure recommends face size of at least 200x200 pixels
- Allow employees to re-enroll if their appearance changes significantly (new glasses, beard, etc.)
**Detection:** Specific employees consistently failing verification while others pass.
**Phase:** Enrollment flow must include quality validation from day one.

### Pitfall 5: Rate Limits and Cost Surprises

**What goes wrong:** Azure Face API has per-second transaction limits (typically 10 TPS on free tier, higher on paid). Shift changes with many simultaneous clock-ins hit rate limits. Costs scale per transaction.
**Why it happens:** Normal usage is fine; peak load during shift changes is not normal usage.
**Consequences:** 429 errors during the busiest moment (shift change) when the feature matters most. Unexpected monthly bills if not monitored.
**Prevention:**
- Use the paid tier (S0) which offers higher TPS
- Implement retry with exponential backoff for 429 responses
- Queue verification requests server-side rather than firing them all simultaneously
- Since verification is non-blocking, a brief queue delay is acceptable
- Set up Azure cost alerts and monitor transaction volume
- Cache faceIds (they are valid for 24 hours by default, configurable via `faceIdTimeToLive`)
**Detection:** 429 errors in logs during shift change times.
**Phase:** Edge function implementation must include retry logic from the start.

### Pitfall 6: FaceId Expiration Causes Silent Failures

**What goes wrong:** Azure Face API faceIds expire after 24 hours by default. If you store a faceId and try to verify against it later, the API returns an error.
**Why it happens:** Teams treat faceIds as permanent identifiers. They are temporary.
**Consequences:** Verification silently fails or errors for employees who enrolled more than 24 hours ago.
**Prevention:**
- Do NOT rely on stored faceIds for the reference/enrollment photo
- For verification: call Detect on the enrollment photo to get a fresh faceId, then call Verify with both faceIds
- Alternatively, use PersonGroup/LargePersonGroup which persist faces server-side (but require Limited Access approval for identification)
- Store the actual enrollment photo (in Supabase Storage), not just the faceId
**Detection:** Verification starts failing exactly 24 hours after enrollment.
**Phase:** Architecture design must account for this from the start.

### Pitfall 7: No Face Detected in Clock-In Photo

**What goes wrong:** The Detect API returns zero faces from the clock-in photo. No faceId means no verification possible.
**Why it happens:** Bad lighting, camera too far away, employee not looking at camera, face partially out of frame.
**Consequences:** If not handled, the entire clock-in flow breaks or silently skips verification.
**Prevention:**
- Handle the zero-faces case explicitly: log it, flag the punch, but do NOT block clock-in (non-blocking requirement)
- Return a clear status: "verified", "failed", "no_face_detected", "error"
- Track no-face rates per location/device to identify environmental issues (bad camera placement, poor lighting)
- Consider client-side face detection (lightweight, before upload) to prompt retake
**Detection:** High no-face rates at specific locations.
**Phase:** Edge function must handle this from the initial implementation.

---

## Minor Pitfalls

Mistakes that cause annoyance but are fixable.

### Pitfall 8: Image Size Bloats Supabase Storage

**What goes wrong:** Full-resolution phone photos (3-5MB each) stored for every clock-in quickly consume storage.
**Why it happens:** Azure accepts up to 6MB per image, so there is no API-side pressure to compress.
**Prevention:**
- Resize/compress images client-side before upload (target 200-400KB)
- Azure recommends 200x200px minimum face size, so a 640x480 image is sufficient
- Implement a retention policy: delete verification photos after N days (align with privacy policy)
**Phase:** Client-side compression should be in the initial implementation.

### Pitfall 9: Sunglasses, Masks, Hats Cause Failures

**What goes wrong:** Azure documentation explicitly states face must be free of glasses, masks, hats, headphones, and head coverings for best results. Real-world employees wear these.
**Why it happens:** Lab conditions differ from workplace conditions.
**Prevention:**
- Azure's Detection03 model includes a `mask` attribute -- use it to detect masks and warn appropriately
- For non-blocking verification: log the obstruction, flag the punch, but do not block
- Enrollment photos must be obstruction-free (enforce this in the enrollment flow)
- Accept that verification accuracy degrades with obstructions and design the system accordingly
**Phase:** Detection of obstructions can be added as an enhancement after core flow works.

### Pitfall 10: Region Availability

**What goes wrong:** Azure Face API is not available in all Azure regions. Choosing a distant region adds latency to every verification call.
**Why it happens:** Teams pick regions based on other Azure services without checking Face API availability.
**Prevention:**
- Verify Face API availability in your chosen region before provisioning
- Choose the region closest to your Supabase Edge Functions deployment
- Test round-trip latency during development
**Phase:** Infrastructure setup (pre-development).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Pre-development | Limited Access not approved | Apply immediately, do not write code until approved |
| Pre-development | Region selection | Verify Face API availability in target region |
| Enrollment flow | Poor reference photo quality | Enforce qualityForRecognition check, reject low quality |
| Enrollment flow | No consent collected | Consent UI must be part of enrollment, not bolted on |
| Edge function (Verify) | FaceId expiration | Store photos, generate fresh faceIds per verification |
| Edge function (Verify) | Rate limits at shift change | Retry with backoff, queue if needed |
| Edge function (Verify) | No face in photo | Return explicit status, do not block clock-in |
| Threshold tuning | Wrong threshold | Run in audit/log-only mode first, tune from real data |
| Storage | Photo bloat | Compress client-side, enforce retention policy |
| Ongoing operations | Employee appearance change | Allow re-enrollment, monitor persistent failures per employee |

## Sources

- Azure Face API Limited Access documentation: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-identity (HIGH confidence)
- Azure Face Detection API guide: https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/how-to/identity-detect-faces (HIGH confidence)
- BIPA statutory damages and biometric consent requirements (MEDIUM confidence -- based on training data, verify with legal counsel)
- Azure rate limits and pricing specifics (LOW confidence -- could not fetch pricing page, verify at https://azure.microsoft.com/en-us/pricing/details/cognitive-services/face-api/)
