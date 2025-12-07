-- FINAL Storage Policy Fix
-- Run this in Supabase Dashboard → SQL Editor
-- This fixes the RLS policy violation issue

-- Your user ID from debug: 0143e12a-7a06-4dbc-be66-6463260ab61d
-- Upload path format: moments/0143e12a-7a06-4dbc-be66-6463260ab61d/{uuid}.mp4

-- Step 1: Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;

-- Step 2: Recreate with explicit type casting and better error handling
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Step 3: Verify the policy was created
SELECT 
  policyname,
  cmd,
  with_check as policy_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

-- Step 4: Test the folder extraction function
-- This simulates what happens when uploading
SELECT 
  'moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4' as test_path,
  (storage.foldername('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4'))[1] as extracted_folder,
  '0143e12a-7a06-4dbc-be66-6463260ab61d' as expected_user_id,
  CASE 
    WHEN (storage.foldername('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4'))[1] = '0143e12a-7a06-4dbc-be66-6463260ab61d'
    THEN '✅ Folder extraction works correctly'
    ELSE '❌ Folder extraction failed - check policy syntax'
  END as test_result;

-- Step 5: Check if bucket name is case-sensitive
SELECT 
  name as bucket_name,
  LOWER(name) as lower_name,
  CASE 
    WHEN LOWER(name) = 'moments' THEN '✅ Bucket name matches'
    ELSE '❌ Bucket name mismatch'
  END as bucket_check
FROM storage.buckets 
WHERE LOWER(name) = 'moments';

