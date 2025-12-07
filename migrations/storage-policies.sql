-- Supabase Storage RLS Policies for moments bucket
-- Run this in Supabase Dashboard → SQL Editor
-- 
-- Prerequisites:
-- 1. Create the 'moments' bucket in Storage (must be public)
-- 2. Ensure you're authenticated as a user with admin privileges

BEGIN;

-- Policy 1: Allow authenticated users to upload files
-- Users can only upload to folders matching their user_id
CREATE POLICY IF NOT EXISTS "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow public read access to all moments
-- Anyone can view/download videos from the moments bucket
CREATE POLICY IF NOT EXISTS "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');

-- Policy 3: Allow users to delete their own files
-- Users can only delete files from their own folder
CREATE POLICY IF NOT EXISTS "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to update their own files (optional)
-- Users can update metadata for files in their own folder
CREATE POLICY IF NOT EXISTS "Users can update their own moments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;

-- Troubleshooting:
-- If policies don't work, check:
-- 1. Bucket name is exactly 'moments' (case-sensitive)
-- 2. Bucket is set to "Public bucket" in Storage settings
-- 3. User is authenticated (auth.uid() returns a value)
-- 4. File path structure matches: moments/{user_id}/{filename}
--
-- To test policies:
-- SELECT * FROM storage.objects WHERE bucket_id = 'moments';
-- This should show files if SELECT policy works

