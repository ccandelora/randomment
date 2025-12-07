-- Fix Storage Policy - Handle Bucket Name Case
-- Run this in Supabase Dashboard → SQL Editor
-- Your bucket shows as "MOMENTS" but policy uses "moments"

-- Step 1: Check actual bucket name (case-sensitive!)
SELECT name, id, public 
FROM storage.buckets 
WHERE LOWER(name) = 'moments';

-- Step 2: Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;

-- Step 3: The issue might be that bucket_id in storage.objects uses the exact bucket name
-- Let's use a case-insensitive check OR use the actual bucket name
-- First, try with the exact bucket name from the query above

-- If your bucket is "MOMENTS" (uppercase), use this:
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id IN ('moments', 'MOMENTS') AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- OR if that doesn't work, try using the bucket's actual ID instead of name
-- But usually bucket_id in storage.objects is the name, not the UUID

-- Verify
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

