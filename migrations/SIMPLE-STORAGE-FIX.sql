-- SIMPLE STORAGE FIX - Try this first
-- Run in Supabase Dashboard → SQL Editor

-- Drop existing policy
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;

-- Create new policy with simpler check
-- The issue might be with the storage.foldername() function or type casting
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (string_to_array(name, '/'))[2] = (auth.uid())::text
);

-- This uses string_to_array instead of storage.foldername()
-- Path: moments/{user_id}/{filename}
-- Array: ['moments', '{user_id}', '{filename}']
-- Index [2] gets the user_id folder

-- Verify
SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname = 'Users can upload their own moments';

