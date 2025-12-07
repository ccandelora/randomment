-- Fix duration_seconds column type to support decimal values
-- Run this in Supabase Dashboard → SQL Editor

-- Change duration_seconds from integer to numeric(10,3) to support decimal durations
-- numeric(10,3) allows up to 10 digits total with 3 decimal places (e.g., 9999999.999)
ALTER TABLE moments 
ALTER COLUMN duration_seconds TYPE numeric(10,3) USING duration_seconds::numeric(10,3);

-- Verify the change
SELECT 
  column_name,
  data_type,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'moments'
  AND column_name = 'duration_seconds';

