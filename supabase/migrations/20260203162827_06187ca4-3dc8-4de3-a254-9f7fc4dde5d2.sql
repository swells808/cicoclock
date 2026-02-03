-- Make user_id nullable so roles can be saved for timeclock-only users (via profile_id)
ALTER TABLE public.user_roles ALTER COLUMN user_id DROP NOT NULL;