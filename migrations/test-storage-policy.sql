-- Test Storage Policy
-- Run this to debug why uploads are failing

-- 1. Check bucket name (case-sensitive!)
SELECT name, public, id
FROM storage.buckets 
WHERE LOWER(name) = 'moments';

-- 2. Check current policies
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%moments%'
ORDER BY policyname;

-- 3. Test the folder name function
-- This simulates what happens when uploading to "moments/{user_id}/{filename}"
SELECT 
  'moments/123e4567-e89b-12d3-a456-426614174000/test.mp4' as test_path,
  (storage.foldername('moments/123e4567-e89b-12d3-a456-426614174000/test.mp4'))[1] as first_folder,
  (storage.foldername('moments/123e4567-e89b-12d3-a456-426614174000/test.mp4'))[2] as second_folder;

-- 4. Check if bucket name matches (case-sensitive issue?)
-- Your bucket shows as "MOMENTS" but code might be using "moments"
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'moments') THEN '✅ Bucket "moments" exists'
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE name = 'MOMENTS') THEN '⚠️ Bucket "MOMENTS" exists but code uses "moments"'
    ELSE '❌ No moments bucket found'
  END as bucket_status;

