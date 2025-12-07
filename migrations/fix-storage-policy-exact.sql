-- Fix Storage Policy - Exact Match
-- Run this in Supabase Dashboard → SQL Editor
-- This recreates the policies with explicit checks

-- Step 1: Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;

-- Step 2: Recreate with explicit check
-- The path format is: moments/{user_id}/{filename}
-- We check that the first folder matches auth.uid()
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Verify the policy
SELECT 
  policyname,
  cmd,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

-- Test: Try to understand what auth.uid() returns
-- (This will only work if you're authenticated in the SQL editor)
SELECT 
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NULL THEN '❌ Not authenticated'
    ELSE '✅ Authenticated'
  END as auth_status;

