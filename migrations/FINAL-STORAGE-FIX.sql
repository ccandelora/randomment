-- FINAL STORAGE FIX - Run this in Supabase Dashboard → SQL Editor
-- This will completely fix storage RLS policies

-- Step 1: Check if bucket exists
SELECT 
  name, 
  public, 
  file_size_limit, 
  allowed_mime_types,
  CASE 
    WHEN name = 'moments' THEN '✅ Bucket exists'
    ELSE '❌ Bucket missing - create it in Storage → New bucket'
  END as status
FROM storage.buckets 
WHERE name = 'moments';

-- Step 2: If bucket doesn't exist, you need to create it manually:
-- 1. Go to Storage in Supabase Dashboard
-- 2. Click "New bucket"
-- 3. Name: moments
-- 4. Public bucket: ✅ (checked)
-- 5. File size limit: 50MB (or leave default)
-- 6. Click "Create bucket"

-- Step 3: Drop ALL existing storage policies (clean slate)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%moments%'
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- Step 4: Create storage policies fresh
BEGIN;

-- Policy 1: INSERT - Users can upload to their own folder
-- Path format: moments/{user_id}/{filename}
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: SELECT - Public can read all moments
CREATE POLICY "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');

-- Policy 3: DELETE - Users can delete their own files
CREATE POLICY "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: UPDATE - Users can update their own files
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

-- Step 5: Verify policies were created
SELECT 
  '✅ Policies Created' as status,
  policyname,
  cmd as command_type,
  array_to_string(roles, ', ') as roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%moments%'
ORDER BY policyname;

-- Step 6: Test - Check if you can query storage (should work if policies are correct)
SELECT 
  '✅ Storage Access Test' as status,
  COUNT(*) as existing_files
FROM storage.objects
WHERE bucket_id = 'moments';

-- If you see errors, check:
-- 1. Bucket exists: SELECT * FROM storage.buckets WHERE name = 'moments';
-- 2. Bucket is public: The SELECT query above should show public = true
-- 3. User is authenticated: Make sure you're logged in when uploading

