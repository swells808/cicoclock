-- Make user_id nullable in time_entries table to support badge-only employees
-- who don't have auth accounts (and thus no user_id in profiles)
ALTER TABLE public.time_entries ALTER COLUMN user_id DROP NOT NULL;