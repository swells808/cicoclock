-- Add columns to track start time changes in admin_time_adjustments
ALTER TABLE admin_time_adjustments 
ADD COLUMN IF NOT EXISTS old_start_time timestamptz,
ADD COLUMN IF NOT EXISTS new_start_time timestamptz;