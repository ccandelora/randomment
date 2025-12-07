-- Debug Storage Upload Issue
-- Run this to understand why uploads are failing

-- 1. Check bucket name and case sensitivity
SELECT 
  name as bucket_name,
  public,
  file_size_limit,
  CASE 
    WHEN name = 'moments' THEN '✅ Exact match'
    WHEN LOWER(name) = 'moments' THEN '⚠️ Case mismatch (should still work)'
    ELSE '❌ Name mismatch'
  END as name_check
FROM storage.buckets 
WHERE LOWER(name) = 'moments';

-- 2. Check the INSERT policy details
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

-- 3. Test the folder name extraction
-- The policy checks: (storage.foldername(name))[1] = auth.uid()::text
-- Upload path format: moments/{user_id}/{filename}
SELECT 
  'moments/123e4567-e89b-12d3-a456-426614174000/video.mp4' as test_path,
  (storage.foldername('moments/123e4567-e89b-12d3-a456-426614174000/video.mp4'))[1] as extracted_user_id,
  '123e4567-e89b-12d3-a456-426614174000' as expected_user_id,
  CASE 
    WHEN (storage.foldername('moments/123e4567-e89b-12d3-a456-426614174000/video.mp4'))[1] = '123e4567-e89b-12d3-a456-426614174000' 
    THEN '✅ Folder extraction works'
    ELSE '❌ Folder extraction failed'
  END as extraction_test;

-- 4. Check if there are any conflicting policies
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'INSERT' AND policyname LIKE '%moments%' THEN '✅ Upload policy'
    WHEN cmd = 'SELECT' AND policyname LIKE '%moments%' THEN '✅ Read policy'
    WHEN cmd = 'DELETE' AND policyname LIKE '%moments%' THEN '✅ Delete policy'
    ELSE '⚠️ Other policy'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY cmd, policyname;

-- 5. Check if RLS is enabled on storage.objects
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'storage'
  AND tablename = 'objects';

