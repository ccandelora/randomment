-- IMMEDIATE FIX FOR STORAGE RLS POLICY
-- Run this in Supabase Dashboard → SQL Editor
-- This uses string_to_array instead of storage.foldername() which may be unreliable

-- Step 1: Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;

-- Step 2: Create new policy using string_to_array
-- Path format: moments/{user_id}/{filename}
-- string_to_array splits by '/' giving: ['moments', '{user_id}', '{filename}']
-- Index [2] gets the user_id folder (index 1-based in PostgreSQL arrays)
-- Wait, PostgreSQL arrays are 1-based, so:
-- [1] = 'moments'
-- [2] = '{user_id}'  <- This is what we want
-- [3] = '{filename}'

CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (string_to_array(name, '/'))[2] = (auth.uid())::text
);

-- Step 3: Verify the policy
SELECT 
  '✅ Policy Created' as status,
  policyname,
  cmd,
  with_check as policy_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

-- Step 4: Test the string extraction logic
SELECT 
  'Test: String Extraction' as test_name,
  'moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4' as test_path,
  (string_to_array('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4', '/'))[2] as extracted_user_id,
  '0143e12a-7a06-4dbc-be66-6463260ab61d' as expected_user_id,
  CASE 
    WHEN (string_to_array('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4', '/'))[2] = '0143e12a-7a06-4dbc-be66-6463260ab61d'
    THEN '✅ String extraction works correctly'
    ELSE '❌ String extraction failed'
  END as test_result;

