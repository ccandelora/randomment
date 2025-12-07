-- Fix Status Enum Values
-- Run this if your status column is an enum and missing 'approved'
-- 
-- This script checks the enum type and adds missing values if needed

-- First, check what enum type exists
DO $$
DECLARE
  enum_name text;
  enum_values text[];
BEGIN
  -- Find the enum type for status column
  SELECT t.typname INTO enum_name
  FROM pg_type t
  JOIN pg_attribute a ON a.atttypid = t.oid
  JOIN pg_class c ON c.oid = a.attrelid
  WHERE c.relname = 'moments'
    AND a.attname = 'status'
    AND t.typtype = 'e';
  
  IF enum_name IS NOT NULL THEN
    -- Get current enum values
    SELECT array_agg(enumlabel::text ORDER BY enumsortorder) INTO enum_values
    FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = enum_name);
    
    RAISE NOTICE 'Found enum type: %', enum_name;
    RAISE NOTICE 'Current values: %', array_to_string(enum_values, ', ');
    
    -- Add 'approved' if it doesn't exist
    IF NOT ('approved' = ANY(enum_values)) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''approved''', enum_name);
      RAISE NOTICE 'Added ''approved'' to enum';
    END IF;
    
    -- Add other values if missing
    IF NOT ('published' = ANY(enum_values)) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''published''', enum_name);
      RAISE NOTICE 'Added ''published'' to enum';
    END IF;
    
    IF NOT ('pending_review' = ANY(enum_values)) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''pending_review''', enum_name);
      RAISE NOTICE 'Added ''pending_review'' to enum';
    END IF;
    
    IF NOT ('rejected' = ANY(enum_values)) THEN
      EXECUTE format('ALTER TYPE %I ADD VALUE IF NOT EXISTS ''rejected''', enum_name);
      RAISE NOTICE 'Added ''rejected'' to enum';
    END IF;
  ELSE
    RAISE NOTICE 'Status column is not an enum type - no changes needed';
  END IF;
END $$;

-- After running this, update the feed_moments view to include 'approved' if needed
-- The view in complete-setup.sql will work once the enum has the right values

