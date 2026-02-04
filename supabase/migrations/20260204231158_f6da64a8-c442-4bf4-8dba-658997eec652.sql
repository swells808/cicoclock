-- Add overtime tracking settings to company_features
ALTER TABLE public.company_features
ADD COLUMN IF NOT EXISTS overtime_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS overtime_daily_threshold_hours numeric(4,2) NOT NULL DEFAULT 8.00;

-- Add comment for clarity
COMMENT ON COLUMN public.company_features.overtime_enabled IS 'Whether the company tracks overtime hours';
COMMENT ON COLUMN public.company_features.overtime_daily_threshold_hours IS 'Hours per day after which work is considered overtime';