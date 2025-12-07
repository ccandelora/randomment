-- Fix Storage RLS Policies
-- Run this in Supabase Dashboard → SQL Editor
-- This will ensure storage policies are set up correctly

-- First, check if bucket exists
SELECT name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE name = 'moments';

-- If bucket doesn't exist, create it:
-- Go to Storage → New bucket → Name: "moments" → Public: ✅ → File size limit: 50MB

-- Drop ALL existing policies for storage.objects (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects') LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
  END LOOP;
END $$;

-- Now create the policies fresh
BEGIN;

-- Policy 1: Allow authenticated users to upload files to their own folder
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow public read access to all moments
CREATE POLICY "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');

-- Policy 3: Allow users to delete their own files
CREATE POLICY "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to update their own files
CREATE POLICY "Users can update their own moments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;

-- Verify policies were created
SELECT 
  policyname,
  cmd as command_type,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- Test: Check if you can see the bucket
SELECT COUNT(*) as file_count
FROM storage.objects
WHERE bucket_id = 'moments';

