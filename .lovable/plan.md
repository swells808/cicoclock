# Replace Azure Face API with Client-Side face-api.js Verification

## ✅ IMPLEMENTATION COMPLETE

This plan has been implemented. The Azure Face API dependency has been replaced with client-side face verification using face-api.js (MIT license) with TensorFlow.js.

## What Was Implemented

### 1. Database Changes ✅
- Added `pgvector` extension for vector storage
- Added `face_embedding vector(128)` column to profiles
- Added `face_embedding_updated_at` and `face_enrollment_status` columns to profiles
- Extended `face_verifications` table with new columns: `captured_face_embedding`, `match_distance`, `match_threshold`, `match_reason`, `verification_version`
- Added RLS policy for inserting face verifications

### 2. Model Assets ✅
- Downloaded face-api.js model files to `/public/models/`:
  - `tiny_face_detector_model-*` (face detection)
  - `face_landmark_68_model-*` (landmarks)
  - `face_recognition_model-*` (128-d embeddings)

### 3. New Files Created ✅
- `src/lib/faceVerification.ts` - Core face-api.js wrapper with:
  - `loadFaceModelsOnce()` - Lazy model loading
  - `getDescriptorFromImage()` - Extract 128-d embedding
  - `euclideanDistance()` - Compare embeddings
  - `verifyFace()` - Full verification pipeline
  - `extractEmbeddingFromUrl()` - Enrollment helper
  - `formatEmbeddingForPgvector()` - Database formatting

- `src/hooks/useFaceEnrollment.ts` - Hook for enrolling faces when profile photos are uploaded

### 4. Modified Files ✅
- `src/pages/Timeclock.tsx` - Replaced Azure verify-face calls with client-side `runFaceVerification()`
- `src/components/employee/EmployeeEditDialog.tsx` - Added face enrollment on profile photo upload

### 5. Dependencies ✅
- Added `face-api.js@^0.22.2`

## How It Works

### Enrollment Flow
1. Admin uploads/changes employee profile photo
2. `useFaceEnrollment` hook extracts 128-d face embedding using face-api.js
3. Embedding stored in `profiles.face_embedding` as pgvector
4. Status set to `enrolled` or `failed`

### Verification Flow
1. Employee clocks in/out with photo
2. Photo uploaded to storage (unchanged)
3. Client-side verification runs in parallel (fire-and-forget):
   - Load face-api models (cached after first use)
   - Extract embedding from clock photo
   - Fetch stored embedding from profile
   - Compute Euclidean distance
   - Log result to `face_verifications` table
4. Clock action never blocks on verification

## Configuration
- Default threshold: 0.55 (Euclidean distance)
- Lower = stricter matching
- Can be stored in `company_features` for per-tenant configuration later

## Performance
- Model loading: ~2-3 seconds on first use, cached thereafter
- Embedding extraction: ~200-500ms per image
- Non-blocking: Verification runs after clock action succeeds
