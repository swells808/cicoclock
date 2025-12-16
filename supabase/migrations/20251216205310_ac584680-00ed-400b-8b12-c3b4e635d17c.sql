-- Add profile_id column to time_entries table for employees without auth accounts
ALTER TABLE public.time_entries 
ADD COLUMN profile_id uuid REFERENCES public.profiles(id);

-- Create index for efficient lookups
CREATE INDEX idx_time_entries_profile_id ON public.time_entries(profile_id);

-- Backfill profile_id for existing time entries where possible
UPDATE public.time_entries te
SET profile_id = p.id
FROM public.profiles p
WHERE te.user_id = p.user_id AND te.profile_id IS NULL;