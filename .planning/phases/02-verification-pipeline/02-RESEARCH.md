# Phase 2: Verification Pipeline - Research

**Researched:** 2026-01-27
**Domain:** Azure Face API integration, async fire-and-forget pattern, Supabase Edge Functions
**Confidence:** HIGH

## Summary

Phase 2 replaces the stub `verify-face` edge function with real Azure Face API calls, and wires the frontend to fire-and-forget call it after every clock-in/out. The existing stub already accepts the right parameters and inserts into `face_verifications`. The work is: (1) implement Azure detect+verify in the edge function, (2) add error handling for all failure modes, (3) trigger the call from the frontend after clock-in/out succeeds, and (4) gate on the `face_verification` company feature toggle.

The Azure Face API flow is 3 REST calls: detect clock photo, detect profile photo, verify the two faceIds. All via native `fetch` in Deno -- no SDK needed. The edge function must handle: API down, no face detected, missing profile photo, missing clock photo, and network timeouts. Every failure results in a record with appropriate status (`error`, `no_face`, `skipped`) -- never blocks the clock action.

The frontend integration point is `src/pages/Timeclock.tsx` where `supabase.functions.invoke('clock-in-out', ...)` is called. After a successful clock-in/out, fire `supabase.functions.invoke('verify-face', ...)` without awaiting. The employee's profile photo is `avatar_url` from the `profiles` table.

**Primary recommendation:** Keep the edge function self-contained -- all Azure logic, error handling, and DB updates happen inside `verify-face`. The frontend just fires and forgets.

## Standard Stack

### Core (already in project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Native `fetch` (Deno) | Built-in | Azure Face API REST calls | No SDK for Deno; REST is simple |
| @supabase/supabase-js | ^2 | DB writes from edge function + frontend invoke | Already used |
| @tanstack/react-query | ^5 | Feature flag check via useCompanyFeatures | Already used |

### No New Dependencies Needed

Phase 2 requires zero new packages. Azure Face API is called via native `fetch`. Everything else uses existing project infrastructure.

## Architecture Patterns

### Pattern 1: Fire-and-Forget from Frontend
**What:** After clock-in/out succeeds, call verify-face without awaiting the result.
**When to use:** Every clock-in/out that has a photo and face_verification is enabled.
**Example:**
```typescript
// In Timeclock.tsx, after successful clock-in/out
const { data, error } = await supabase.functions.invoke('clock-in-out', { body: { ... } });

if (!error && data?.success && photoUrl && features?.face_verification) {
  // Fire and forget -- do NOT await
  supabase.functions.invoke('verify-face', {
    body: {
      time_entry_id: data.data.id,
      profile_id: authenticatedEmployee.id,
      company_id: company.id,
      clock_photo_url: photoUrl,
      profile_photo_url: authenticatedEmployee.avatar_url,
    },
  });
}
```

### Pattern 2: Edge Function Azure Flow
**What:** detect(clock photo) + detect(profile photo) + verify(faceId1, faceId2), then update DB record.
**When to use:** Inside verify-face edge function.
**Flow:**
1. Insert `face_verifications` record with status `pending`
2. Validate both photo URLs exist (if not, update to `skipped`)
3. Fetch both images as bytes
4. Call Azure detect on each
5. Call Azure verify with the two faceIds
6. Update record with confidence_score, is_match, status=`verified`, verified_at

### Pattern 3: Comprehensive Error Handling
**What:** Every failure mode writes a record -- never throws unhandled.
**Status mapping:**
| Scenario | Status | error_message |
|----------|--------|---------------|
| Success | `verified` | null |
| No profile photo | `skipped` | "No profile photo" |
| No clock photo | `skipped` | "No clock photo" |
| No face in clock photo | `no_face` | "No face detected in clock photo" |
| No face in profile photo | `no_face` | "No face detected in profile photo" |
| Azure API error | `error` | Azure error message |
| Azure timeout | `error` | "Azure API timeout" |
| Network error | `error` | Error message |
| Missing Azure secrets | `error` | "Azure Face API not configured" |

### Pattern 4: Image Fetching for Azure
**What:** Azure detect accepts either image URL or raw bytes. Use URL mode for Supabase Storage photos.
**Why:** Photos are in Supabase Storage with public/signed URLs. Passing the URL directly avoids downloading in the edge function.
**Caveat:** URLs must be publicly accessible or use signed URLs. Check if Supabase Storage bucket is public or requires signed URLs.
```typescript
// URL mode -- simpler, no download needed
const detectUrl = `${FACE_ENDPOINT}/face/v1.2/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceId=true&faceIdTimeToLive=120`;

const res = await fetch(detectUrl, {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": FACE_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ url: imageUrl }),
});
```

**Fallback:** If URLs are not publicly accessible, download bytes first:
```typescript
const imgRes = await fetch(imageUrl);
const bytes = new Uint8Array(await imgRes.arrayBuffer());

const res = await fetch(detectUrl, {
  method: "POST",
  headers: {
    "Ocp-Apim-Subscription-Key": FACE_KEY,
    "Content-Type": "application/octet-stream",
  },
  body: bytes,
});
```

### Anti-Patterns to Avoid
- **Don't await verify-face in the clock flow:** The entire point is non-blocking. Use fire-and-forget.
- **Don't let verify-face throw without writing a record:** Every invocation must result in a face_verifications row, even on failure.
- **Don't call Azure without checking for photo URLs first:** Skip early if either photo is missing.
- **Don't use the Azure Node.js SDK:** It doesn't work in Deno. Use native fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Face detection/comparison | Custom ML model | Azure Face API | Accuracy, compliance, no model hosting |
| Async invocation | Custom queue/worker | `supabase.functions.invoke()` fire-and-forget | Already works, edge function handles everything |
| Feature flag checking | Custom flag system | `useCompanyFeatures()` hook reading `face_verification` column | Already exists |
| Image storage/URLs | Custom file handling | Supabase Storage URLs already in `clock_in_photo_url` / `avatar_url` | Photos already stored by existing clock flow |

## Common Pitfalls

### Pitfall 1: Awaiting verify-face Blocks Clock Action
**What goes wrong:** Clock-in/out takes 3-5 seconds instead of <1 second because it waits for Azure API.
**Why it happens:** Developer adds `await` to the verify-face call.
**How to avoid:** Never await. Just call `supabase.functions.invoke(...)` without await. Wrap in try-catch or `.catch(() => {})` to suppress unhandled promise warnings.
**Warning signs:** Clock-in/out UI shows spinner for >2 seconds.

### Pitfall 2: Edge Function Timeout
**What goes wrong:** Azure API takes >60 seconds, Supabase Edge Function times out (default 60s max).
**Why it happens:** Azure API latency or network issues.
**How to avoid:** Set a 25-second timeout on Azure fetch calls using AbortController. If timeout, update record to `error` status.
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 25000);
const res = await fetch(url, { signal: controller.signal, ... });
clearTimeout(timeoutId);
```

### Pitfall 3: Photo URLs Not Accessible to Azure
**What goes wrong:** Azure detect returns 400/404 because it can't fetch the Supabase Storage URL.
**Why it happens:** Supabase Storage bucket is private, or URL is a signed URL that expired.
**How to avoid:** Two options: (a) make the photos bucket public, or (b) download bytes in the edge function and send as `application/octet-stream`. Option (b) is safer and works regardless of bucket policy.
**Recommendation:** Use binary mode (download bytes, send as octet-stream) to avoid URL accessibility issues.

### Pitfall 4: No Company Feature Check in Frontend
**What goes wrong:** verify-face is called for companies that haven't enabled face verification.
**Why it happens:** Frontend doesn't check the toggle before firing.
**How to avoid:** Read `features?.face_verification` from `useCompanyFeatures()` before invoking verify-face.

### Pitfall 5: Missing Profile Photo Not Handled
**What goes wrong:** Edge function tries to detect a face from a null URL, gets a crash.
**Why it happens:** Employee has no `avatar_url` set.
**How to avoid:** Check for both `clock_photo_url` and `profile_photo_url` before calling Azure. If either is missing, update status to `skipped` with appropriate message.

### Pitfall 6: Race Condition on Verification Record
**What goes wrong:** Edge function inserts `pending` record, then tries to update it, but the record ID is lost.
**Why it happens:** Insert and update are separate operations.
**How to avoid:** Insert returns the record with its ID. Use that ID for all subsequent updates. Keep it in a variable throughout the function.

## Code Examples

### Complete verify-face Edge Function Flow
```typescript
// Source: Phase 1 STACK.md research + codebase patterns
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  let recordId: string | null = null;

  try {
    const { time_entry_id, profile_id, company_id, clock_photo_url, profile_photo_url } = await req.json();

    if (!time_entry_id || !profile_id || !company_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Insert pending record
    const { data: record, error: insertError } = await supabase
      .from('face_verifications')
      .insert({
        time_entry_id, profile_id, company_id,
        clock_photo_url: clock_photo_url || null,
        profile_photo_url: profile_photo_url || null,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) throw new Error(`Insert failed: ${insertError.message}`);
    recordId = record.id;

    // Step 2: Check prerequisites
    const endpoint = Deno.env.get('AZURE_FACE_ENDPOINT');
    const apiKey = Deno.env.get('AZURE_FACE_API_KEY');

    if (!endpoint || !apiKey) {
      await updateRecord(supabase, recordId, { status: 'error', error_message: 'Azure Face API not configured' });
      return jsonResponse({ success: true, status: 'error' });
    }

    if (!clock_photo_url) {
      await updateRecord(supabase, recordId, { status: 'skipped', error_message: 'No clock photo' });
      return jsonResponse({ success: true, status: 'skipped' });
    }

    if (!profile_photo_url) {
      await updateRecord(supabase, recordId, { status: 'skipped', error_message: 'No profile photo' });
      return jsonResponse({ success: true, status: 'skipped' });
    }

    // Step 3: Detect faces (download bytes, send as binary)
    const clockFaceId = await detectFace(endpoint, apiKey, clock_photo_url);
    if (!clockFaceId) {
      await updateRecord(supabase, recordId, { status: 'no_face', error_message: 'No face detected in clock photo' });
      return jsonResponse({ success: true, status: 'no_face' });
    }

    const profileFaceId = await detectFace(endpoint, apiKey, profile_photo_url);
    if (!profileFaceId) {
      await updateRecord(supabase, recordId, { status: 'no_face', error_message: 'No face detected in profile photo' });
      return jsonResponse({ success: true, status: 'no_face' });
    }

    // Step 4: Verify
    const result = await verifyFaces(endpoint, apiKey, clockFaceId, profileFaceId);

    await updateRecord(supabase, recordId, {
      status: 'verified',
      confidence_score: result.confidence,
      is_match: result.isIdentical,
      verified_at: new Date().toISOString(),
    });

    return jsonResponse({ success: true, status: 'verified', confidence: result.confidence, is_match: result.isIdentical });

  } catch (error) {
    console.error('verify-face error:', error);
    if (recordId) {
      await updateRecord(supabase, recordId, {
        status: 'error',
        error_message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    return jsonResponse({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

// Helper: update face_verifications record
async function updateRecord(supabase: any, id: string, fields: Record<string, any>) {
  await supabase.from('face_verifications').update(fields).eq('id', id);
}

// Helper: detect face, returns faceId or null
async function detectFace(endpoint: string, apiKey: string, imageUrl: string): Promise<string | null> {
  // Download image bytes
  const imgRes = await fetchWithTimeout(imageUrl, {}, 15000);
  const bytes = new Uint8Array(await imgRes.arrayBuffer());

  const res = await fetchWithTimeout(
    `${endpoint}/face/v1.2/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceId=true&faceIdTimeToLive=120`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/octet-stream",
      },
      body: bytes,
    },
    25000
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Azure detect failed (${res.status}): ${errBody}`);
  }

  const faces = await res.json();
  return faces.length > 0 ? faces[0].faceId : null;
}

// Helper: verify two faces
async function verifyFaces(endpoint: string, apiKey: string, faceId1: string, faceId2: string) {
  const res = await fetchWithTimeout(
    `${endpoint}/face/v1.2/verify`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ faceId1, faceId2 }),
    },
    25000
  );

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Azure verify failed (${res.status}): ${errBody}`);
  }

  return res.json(); // { isIdentical: boolean, confidence: number }
}

// Helper: fetch with timeout
async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

function jsonResponse(body: any) {
  return new Response(
    JSON.stringify(body),
    { status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' } }
  );
}
```

### Frontend Fire-and-Forget Integration
```typescript
// In Timeclock.tsx handleClockIn, after successful clock-in
const features = companyFeatures; // from useCompanyFeatures()

if (features?.face_verification && photoUrl && authenticatedEmployee?.avatar_url) {
  supabase.functions.invoke('verify-face', {
    body: {
      time_entry_id: data.data.id,
      profile_id: authenticatedEmployee.id,
      company_id: company.id,
      clock_photo_url: photoUrl,
      profile_photo_url: authenticatedEmployee.avatar_url,
    },
  }).catch(() => {}); // Suppress unhandled rejection
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Azure Face API v1.0 | v1.2 | 2024 | New detection/recognition models |
| `detection_01` model | `detection_03` | 2023+ | Better accuracy for small/rotated faces |
| `recognition_01` | `recognition_04` | 2023+ | Better accuracy, handles masks |

## Open Questions

1. **Are Supabase Storage photo URLs publicly accessible to Azure?**
   - What we know: Photos are stored in Supabase Storage. URLs exist in `clock_in_photo_url` and `avatar_url`.
   - What's unclear: Whether the storage bucket is public or requires signed URLs.
   - Recommendation: Use binary mode (download bytes in edge function, send to Azure as octet-stream). This works regardless of bucket policy and is more reliable.

2. **Should profile photo faceId be cached?**
   - What we know: Azure faceIds expire after `faceIdTimeToLive` (max 86400s / 24h). Caching could reduce API calls from 3 to 2 per verification.
   - Recommendation: Skip caching for Phase 2 (premature optimization). Implement in a future optimization pass if costs warrant it. 3 calls per verification at $0.003 total is negligible.

3. **What confidence threshold flags a mismatch?**
   - What we know: Azure default `isIdentical` threshold is 0.5. STACK.md recommends 0.6-0.7 for flagging.
   - Recommendation: Store raw confidence and `isIdentical` from Azure. Use Azure's default threshold (`isIdentical` field) for Phase 2. Application-level threshold can be tuned in Phase 3 when admins review results.

## Sources

### Primary (HIGH confidence)
- Codebase: `supabase/functions/verify-face/index.ts` (existing stub, request shape)
- Codebase: `supabase/functions/clock-in-out/index.ts` (clock flow, photo_url field)
- Codebase: `supabase/migrations/20260127181524_face_verifications.sql` (table schema)
- Codebase: `src/pages/Timeclock.tsx` (frontend clock invocation pattern)
- Codebase: `src/hooks/useCompanyFeatures.ts` (feature toggle reading)
- `.planning/research/STACK.md` (Azure Face API v1.2 endpoints, auth, flow)

### Secondary (MEDIUM confidence)
- `.planning/phases/01-foundation/01-RESEARCH.md` (Phase 1 patterns, all verified against codebase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new libraries, all native fetch + existing deps
- Architecture: HIGH - fire-and-forget pattern is straightforward, edge function pattern established
- Azure API integration: HIGH - verified against official REST docs in STACK.md
- Pitfalls: HIGH - derived from codebase inspection and API constraints

**Research date:** 2026-01-27
**Valid until:** 2026-02-27
