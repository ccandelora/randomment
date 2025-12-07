-- Verification Script
-- Run this to check what's actually set up in your database
-- Helps diagnose issues before running the main setup script

-- Check tables and their columns
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('moments', 'profiles', 'moment_reactions', 'moment_reports', 'blocks', 'device_tokens')
ORDER BY table_name, ordinal_position;

-- Check if RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('moments', 'profiles', 'moment_reactions', 'moment_reports', 'blocks', 'device_tokens')
ORDER BY tablename;

-- Check table policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Check storage policies
SELECT 
  name as policy_name,
  bucket_id,
  definition
FROM storage.policies
WHERE bucket_id = 'moments'
ORDER BY name;

-- Check if feed_moments view exists
SELECT 
  table_name,
  view_definition
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name = 'feed_moments';

-- Check status column type (enum vs text)
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'moments'
  AND column_name = 'status';

-- If status is an enum, show its values
SELECT 
  t.typname as enum_name,
  e.enumlabel as enum_value
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
WHERE t.oid = (
  SELECT atttypid
  FROM pg_attribute
  WHERE attrelid = 'public.moments'::regclass
    AND attname = 'status'
  LIMIT 1
)
ORDER BY e.enumsortorder;

