-- Fix Storage Policy - Handle Case Sensitivity
-- Run this in Supabase Dashboard → SQL Editor
-- Your bucket shows as "MOMENTS" but code uses "moments"

-- Step 1: Check actual bucket name
SELECT name, id, public 
FROM storage.buckets 
WHERE LOWER(name) = 'moments';

-- Step 2: Drop existing policy
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;

-- Step 3: Recreate policy - try both case variations
-- First, let's check what the actual bucket_id value is
-- The bucket_id in storage.objects uses the bucket's ID, not name
-- But the policy checks bucket_id = 'moments' (name)

-- Get the actual bucket ID
DO $$
DECLARE
  bucket_name_var TEXT;
BEGIN
  SELECT name INTO bucket_name_var FROM storage.buckets WHERE LOWER(name) = 'moments' LIMIT 1;
  
  IF bucket_name_var IS NULL THEN
    RAISE EXCEPTION 'Bucket "moments" not found. Create it in Storage → New bucket';
  END IF;
  
  RAISE NOTICE 'Found bucket: %', bucket_name_var;
END $$;

-- Create policy using the actual bucket name (case-sensitive match)
-- Replace 'moments' with the actual bucket name if different
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = (SELECT name FROM storage.buckets WHERE LOWER(name) = 'moments' LIMIT 1) AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Alternative: If above doesn't work, try this (uses bucket ID instead of name)
-- But first we need to check if bucket_id in storage.objects is the name or ID
-- Usually it's the name, so the above should work

-- Verify policy
SELECT 
  policyname,
  cmd,
  with_check as policy_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

