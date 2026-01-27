# Technology Stack: Face Verification

**Project:** CICO Timeclock - Face Verification Milestone
**Researched:** 2026-01-27
**Overall Confidence:** HIGH (verified against official Microsoft REST API docs)

## Recommended Stack

### Azure AI Face API

| Item | Value | Notes |
|------|-------|-------|
| Service | Azure AI Face | Cognitive Services resource |
| API Version | `v1.2` | Current stable version per official docs |
| Base URL | `https://{resource}.cognitiveservices.azure.com` | Region-specific |
| Auth | API Key via `Ocp-Apim-Subscription-Key` header | Simplest for Edge Functions |
| Detection Model | `detection_03` | Best accuracy for small/rotated faces |
| Recognition Model | `recognition_04` | Best accuracy, handles masked faces |

### Integration Approach: REST via fetch (No SDK)

Azure has no Deno SDK. The REST API is straightforward -- use native `fetch` from Supabase Edge Functions. This is the correct approach; no npm shim needed.

## Critical Prerequisite: Limited Access Approval

**Azure Face API requires approval.** Face verification is gated behind Microsoft's Responsible AI policy. You must:

1. Apply via the [Face Recognition intake form](https://aka.ms/facerecognition)
2. Be approved as a managed customer/partner
3. Comply with biometric data notice, consent, and deletion requirements

**This is a blocker.** Apply immediately. Approval timeline is unclear but typically days to weeks.

## API Flow: Two-Step Verify

Face verification requires two API calls:

### Step 1: Detect faces (called twice -- once per image)

```
POST https://{endpoint}/face/v1.2/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceId=true&faceIdTimeToLive=120
```

**Headers:**
```
Ocp-Apim-Subscription-Key: {api-key}
Content-Type: application/octet-stream
```

**Body:** Raw image bytes (binary)

**Response:**
```json
[{
  "faceId": "uuid-string",
  "faceRectangle": { "top": 0, "left": 0, "width": 100, "height": 100 }
}]
```

Alternative: send image URL instead of bytes:
```
Content-Type: application/json
Body: { "url": "https://publicly-accessible-url/image.jpg" }
```

### Step 2: Verify face-to-face

```
POST https://{endpoint}/face/v1.2/verify
```

**Headers:**
```
Ocp-Apim-Subscription-Key: {api-key}
Content-Type: application/json
```

**Body:**
```json
{
  "faceId1": "uuid-from-detect-call-1",
  "faceId2": "uuid-from-detect-call-2"
}
```

**Response:**
```json
{
  "isIdentical": true,
  "confidence": 0.82
}
```

- `isIdentical`: boolean, true when confidence >= 0.5 (default threshold)
- `confidence`: float 0.0 to 1.0

## Image Requirements

| Requirement | Value |
|-------------|-------|
| Formats | JPEG, PNG, GIF (first frame), BMP |
| File size | 1 KB to 6 MB |
| Min face size | 36x36 px (in images up to 1920x1080) |
| Optimal face size | 200x200 px (100 px between eyes) |
| Max image dimensions | 1920x1080 |
| Max faces per image | 100 (returns largest first) |

**Recommendation for CICO:** Capture photos at 640x480 or 720x480. Ensure face fills at least 200x200 px area. JPEG format at 80% quality keeps file size reasonable.

## Authentication: API Key (Recommended)

For Supabase Edge Functions, use API key auth:

- Store `AZURE_FACE_API_KEY` and `AZURE_FACE_ENDPOINT` as Supabase Edge Function secrets
- Pass key via `Ocp-Apim-Subscription-Key` header
- No OAuth token refresh needed, no managed identity complexity

Managed identity is not applicable -- Edge Functions run on Supabase infrastructure, not Azure. API key is the only practical option.

## Deno Edge Function Pattern

```typescript
// supabase/functions/verify-face/index.ts
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const FACE_ENDPOINT = Deno.env.get("AZURE_FACE_ENDPOINT")!;
const FACE_KEY = Deno.env.get("AZURE_FACE_API_KEY")!;

async function detectFace(imageBytes: Uint8Array): Promise<string> {
  const res = await fetch(
    `${FACE_ENDPOINT}/face/v1.2/detect?detectionModel=detection_03&recognitionModel=recognition_04&returnFaceId=true&faceIdTimeToLive=120`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": FACE_KEY,
        "Content-Type": "application/octet-stream",
      },
      body: imageBytes,
    }
  );
  const faces = await res.json();
  if (!faces.length) throw new Error("No face detected");
  return faces[0].faceId;
}

async function verifyFaces(faceId1: string, faceId2: string) {
  const res = await fetch(`${FACE_ENDPOINT}/face/v1.2/verify`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": FACE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ faceId1, faceId2 }),
  });
  return res.json(); // { isIdentical: boolean, confidence: number }
}
```

## Pricing

| Tier | Cost | Notes |
|------|------|-------|
| Free (F0) | 20 calls/min, 30K calls/month | Good for development |
| Standard (S0) | ~$1.00 per 1,000 calls | Each detect = 1 call, each verify = 1 call |

**Per verification = 3 API calls:** detect(clockin photo) + detect(profile photo) + verify. So ~$0.003 per verification at standard pricing.

**Optimization:** Cache the profile photo's faceId. Face IDs are valid for up to 24 hours (configurable via `faceIdTimeToLive`, max 86400 seconds). Cache profile faceId in the database to reduce to 2 calls per verification.

## Confidence Threshold Recommendation

- Default `isIdentical` threshold: 0.5 (liberal)
- **Recommended for CICO:** Use 0.6-0.7 as your application-level threshold for flagging
- Since this is non-blocking (flag only), err on the side of flagging rather than missing mismatches
- Store raw `confidence` score in the database; apply threshold in application logic

## Secrets Required

Set via Supabase CLI or Dashboard:

```bash
supabase secrets set AZURE_FACE_ENDPOINT="https://your-resource.cognitiveservices.azure.com"
supabase secrets set AZURE_FACE_API_KEY="your-api-key-here"
```

## Alternatives Considered

| Option | Why Not |
|--------|---------|
| Azure SDK (@azure/ai-face) | Node.js only, not compatible with Deno runtime |
| AWS Rekognition | REST API equally viable, but Azure was specified |
| Client-side face comparison (TensorFlow.js) | Less accurate, no server-side audit trail, model size burden |
| Open source (face-api.js) | Unmaintained, lower accuracy, no commercial support |

## Sources

- Azure Face API Detect endpoint: [Microsoft REST API docs, v1.2](https://learn.microsoft.com/en-us/rest/api/face/face-detection-operations/detect)
- Azure Face API Verify endpoint: [Microsoft REST API docs, v1.2](https://learn.microsoft.com/en-us/rest/api/face/face-recognition-operations/verify-face-to-face)
- Limited Access policy: [Azure AI Face overview](https://learn.microsoft.com/en-us/azure/ai-services/computer-vision/overview-identity)

---

*Stack research: 2026-01-27*
