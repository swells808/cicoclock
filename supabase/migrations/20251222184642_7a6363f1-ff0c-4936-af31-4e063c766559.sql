-- Add geolocation columns to time_entries table
ALTER TABLE time_entries
ADD COLUMN clock_in_latitude numeric,
ADD COLUMN clock_in_longitude numeric,
ADD COLUMN clock_in_address text,
ADD COLUMN clock_out_latitude numeric,
ADD COLUMN clock_out_longitude numeric,
ADD COLUMN clock_out_address text;