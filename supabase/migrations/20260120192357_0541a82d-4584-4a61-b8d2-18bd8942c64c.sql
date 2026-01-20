-- Add timezone field to companies table
ALTER TABLE public.companies 
ADD COLUMN timezone TEXT NOT NULL DEFAULT 'America/Los_Angeles';

-- Add comment explaining the field
COMMENT ON COLUMN public.companies.timezone IS 'IANA timezone identifier (e.g., America/New_York, America/Los_Angeles, Europe/London)';