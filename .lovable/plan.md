

# Replace Azure Face API with Client-Side face-api.js Verification

## Overview

This plan removes the Azure Face API dependency and implements client-side face verification using face-api.js (MIT license) with TensorFlow.js. Embeddings are stored in Supabase using pgvector for audit and admin review.

## Current State

- **Azure Face API integration** exists in `supabase/functions/verify-face/index.ts` but fails due to Microsoft's Limited Access requirements
- **Photo capture** already works via `PhotoCapture.tsx` component
- **face_verifications table** already exists with status, confidence, is_match fields
- **profiles table** has `avatar_url` for profile photos
- **time_entries table** has `clock_in_photo_url` and `clock_out_photo_url`

## Architecture Change

```text
BEFORE (Server-Side):
┌─────────┐    ┌──────────────┐    ┌─────────────────┐
│ Browser │───▶│ verify-face  │───▶│ Azure Face API  │
│         │    │ Edge Function│    │ (BLOCKED)       │
└─────────┘    └──────────────┘    └─────────────────┘

AFTER (Client-Side):
┌─────────────────────────────────────┐    ┌──────────────────┐
│           Browser                   │    │    Supabase      │
│  ┌─────────────┐  ┌──────────────┐  │    │                  │
│  │ face-api.js │  │ TensorFlow.js│  │───▶│ profiles         │
│  │ (detection) │  │ (inference)  │  │    │ (face_embedding) │
│  └─────────────┘  └──────────────┘  │    │                  │
│           │                         │    │ face_verifications│
│     128-d embedding                 │───▶│ (match results)  │
└─────────────────────────────────────┘    └──────────────────┘
```

## Implementation

### 1. Database Changes

**A. Add pgvector extension and embedding columns to profiles:**

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add face embedding columns to profiles
ALTER TABLE public.profiles
ADD COLUMN face_embedding vector(128) NULL,
ADD COLUMN face_embedding_updated_at TIMESTAMPTZ NULL,
ADD COLUMN face_enrollment_status TEXT NOT NULL DEFAULT 'not_enrolled'
  CHECK (face_enrollment_status IN ('not_enrolled', 'enrolled', 'failed'));
```

**B. Add verification columns to face_verifications table:**

```sql
-- Extend face_verifications for client-side verification
ALTER TABLE public.face_verifications
ADD COLUMN captured_face_embedding vector(128) NULL,
ADD COLUMN match_distance FLOAT8 NULL,
ADD COLUMN match_threshold FLOAT8 NOT NULL DEFAULT 0.55,
ADD COLUMN verification_version TEXT NOT NULL DEFAULT 'faceapi-v1';
```

### 2. Model Assets

**Host face-api.js model files in `/public/models/`:**

Required model files (download from face-api.js repo):
- `tiny_face_detector_model-weights_manifest.json` + shard files
- `face_landmark_68_model-weights_manifest.json` + shard files  
- `face_recognition_model-weights_manifest.json` + shard files

Total size: ~6MB (loaded lazily on first use)

### 3. Face Verification Utility Module

**Create `src/lib/faceVerification.ts`:**

```typescript
import * as faceapi from 'face-api.js';

let modelsLoaded = false;

// Lazy-load models once
export async function loadFaceModelsOnce(): Promise<void> {
  if (modelsLoaded) return;
  
  await Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/models'),
  ]);
  
  modelsLoaded = true;
}

// Extract 128-d face descriptor from image
export async function getDescriptorFromImage(
  input: HTMLImageElement | HTMLCanvasElement
): Promise<{ ok: true; descriptor: Float32Array } | { ok: false; reason: string }> {
  const detection = await faceapi
    .detectSingleFace(input, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptor();
    
  if (!detection) {
    return { ok: false, reason: 'no_face' };
  }
  
  return { ok: true, descriptor: detection.descriptor };
}

// Euclidean distance between two embeddings
export function euclideanDistance(a: Float32Array, b: Float32Array): number {
  return Math.sqrt(
    a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0)
  );
}

// Run full verification
export async function verifyFace(
  clockPhotoBlob: Blob,
  profileEmbedding: number[]
): Promise<{
  ok: boolean;
  distance?: number;
  pass?: boolean;
  reason: string;
  embedding?: number[];
}> {
  try {
    await loadFaceModelsOnce();
    
    // Convert blob to image
    const img = await blobToImage(clockPhotoBlob);
    
    // Get clock photo descriptor
    const clockResult = await getDescriptorFromImage(img);
    if (!clockResult.ok) {
      return { ok: true, reason: clockResult.reason, pass: false };
    }
    
    // Compute distance
    const profileArray = new Float32Array(profileEmbedding);
    const distance = euclideanDistance(clockResult.descriptor, profileArray);
    const threshold = 0.55;
    const pass = distance <= threshold;
    
    return {
      ok: true,
      distance,
      pass,
      reason: 'ok',
      embedding: Array.from(clockResult.descriptor),
    };
  } catch (error) {
    return { ok: false, reason: 'model_load_failed' };
  }
}
```

### 4. Face Enrollment Flow

**Add enrollment to profile photo upload (employee profile page):**

When admin uploads/changes profile photo:
1. Load face-api models
2. Extract 128-d embedding from profile photo
3. Update `profiles.face_embedding` with the vector
4. Set `face_enrollment_status` to `'enrolled'` or `'failed'`
5. Update `face_embedding_updated_at`

**UI indicator:** Show enrollment status badge on employee profile (Enrolled/Not Enrolled/Failed)

### 5. Patch Timeclock Flow

**Modify `src/pages/Timeclock.tsx` `handlePhotoCapture`:**

After photo capture and upload, run client-side verification:

```typescript
// After photo upload succeeds
if (companyFeatures?.face_verification && authenticatedEmployee?.face_embedding) {
  try {
    const result = await verifyFace(photoBlob, authenticatedEmployee.face_embedding);
    
    // Log to face_verifications table (fire-and-forget)
    supabase.from('face_verifications').insert({
      time_entry_id: timeEntryId,
      profile_id: authenticatedEmployee.id,
      company_id: company.id,
      clock_photo_url: photoUrl,
      profile_photo_url: authenticatedEmployee.avatar_url,
      captured_face_embedding: result.embedding,
      match_distance: result.distance,
      match_threshold: 0.55,
      match_pass: result.pass,
      match_reason: result.reason,
      status: result.pass ? 'verified' : (result.reason === 'no_face' ? 'no_face' : 'verified'),
      is_match: result.pass,
      confidence_score: result.distance ? (1 - result.distance) : null,
      verified_at: new Date().toISOString(),
      verification_version: 'faceapi-v1',
    }).then(() => {}).catch(() => {});
  } catch (error) {
    // Log error but don't block clock action
    console.error('Face verification failed:', error);
  }
}
```

### 6. Remove Azure Integration

- Delete `supabase/functions/verify-face/index.ts` (or repurpose as audit-only edge function)
- Remove Azure Face API calls from Timeclock.tsx (lines 410-434)
- Keep `AZURE_FACE_ENDPOINT` and `AZURE_FACE_API_KEY` secrets for now (can be removed later)

### 7. Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/XXXXXX_add_face_embeddings.sql` | Create | Add pgvector extension + embedding columns |
| `public/models/*` | Create | Host face-api.js model files (~6MB) |
| `src/lib/faceVerification.ts` | Create | Face-api wrapper utilities |
| `src/pages/Timeclock.tsx` | Modify | Replace Azure verify-face call with client-side verification |
| `src/hooks/useEmployees.ts` | Modify | Include `face_embedding` in employee queries |
| `src/components/employee/EmployeeEditDialog.tsx` | Modify | Add face enrollment after profile photo upload |
| `package.json` | Modify | Add `face-api.js` dependency |
| `src/integrations/supabase/types.ts` | Regenerate | Include new columns |

### 8. RLS Policies

```sql
-- Employees can update their own face_embedding (for self-enrollment if allowed)
-- In practice, only admins upload profile photos, so existing RLS should work

-- face_verifications: keep existing policies
-- SELECT: company_id matches user's company
-- INSERT: unrestricted (service role for edge functions, or client-side with company_id check)
```

### 9. Acceptance Criteria

| Criteria | Verification |
|----------|--------------|
| Profile photo → face_embedding populated | Check DB after upload |
| face_enrollment_status = 'enrolled' | Check profile record |
| Clock action logs match_distance | Check face_verifications table |
| Clock action logs match_pass | Boolean based on threshold |
| Clock never blocks on verification error | Verify clock succeeds even if face-api fails |
| Flagged entries show in admin view | Existing admin UI works unchanged |

### 10. Performance Notes

- **Model loading:** ~2-3 seconds on first use, cached thereafter
- **Embedding extraction:** ~200-500ms per image
- **Total verification time:** ~0.5s after models loaded
- **Non-blocking:** Verification runs after clock action succeeds, doesn't delay user

## Technical Details

### NPM Package
```json
{
  "dependencies": {
    "face-api.js": "^0.22.2"
  }
}
```

### pgvector Usage
```sql
-- Store embedding (from TypeScript array)
UPDATE profiles SET face_embedding = '[0.1, 0.2, ...]'::vector WHERE id = '...';

-- Compare embeddings (for future analytics)
SELECT * FROM face_verifications
WHERE captured_face_embedding <-> profile_embedding < 0.55;
```

### Threshold Tuning
- Default: 0.55 (Euclidean distance)
- Lower = stricter matching
- Can be stored in `company_features` for per-tenant configuration later

