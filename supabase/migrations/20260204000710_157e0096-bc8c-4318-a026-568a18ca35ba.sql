-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Add face embedding columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS face_embedding vector(128) NULL,
ADD COLUMN IF NOT EXISTS face_embedding_updated_at TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS face_enrollment_status TEXT NOT NULL DEFAULT 'not_enrolled';

-- Add check constraint for enrollment status
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_face_enrollment_status_check;
ALTER TABLE public.profiles
ADD CONSTRAINT profiles_face_enrollment_status_check 
  CHECK (face_enrollment_status IN ('not_enrolled', 'enrolled', 'failed'));

-- Extend face_verifications for client-side verification
ALTER TABLE public.face_verifications
ADD COLUMN IF NOT EXISTS captured_face_embedding vector(128) NULL,
ADD COLUMN IF NOT EXISTS match_distance FLOAT8 NULL,
ADD COLUMN IF NOT EXISTS match_threshold FLOAT8 NOT NULL DEFAULT 0.55,
ADD COLUMN IF NOT EXISTS match_reason TEXT NULL,
ADD COLUMN IF NOT EXISTS verification_version TEXT NOT NULL DEFAULT 'faceapi-v1';