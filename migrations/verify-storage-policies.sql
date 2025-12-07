-- Verify Storage Policies
-- Run this in Supabase Dashboard → SQL Editor
-- This will check if storage policies are set up correctly

-- Check if storage policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%moments%'
ORDER BY policyname;

-- If no policies are returned, run the storage policies section from COMPLETE-FIX.sql
-- Or run migrations/storage-policies.sql

