-- COMPREHENSIVE STORAGE RLS DIAGNOSTIC AND FIX
-- Run this in Supabase Dashboard → SQL Editor
-- This will diagnose and fix the storage policy issue

-- ============================================================================
-- STEP 1: DIAGNOSTICS
-- ============================================================================

-- Check bucket exists and get exact name
SELECT 
  'Bucket Check' as step,
  name as bucket_name,
  id as bucket_id,
  public as is_public,
  CASE 
    WHEN name = 'moments' THEN '✅ Exact match'
    WHEN LOWER(name) = 'moments' THEN '⚠️ Case mismatch - name is: ' || name
    ELSE '❌ Not found'
  END as status
FROM storage.buckets 
WHERE LOWER(name) = 'moments';

-- Check current storage policies
SELECT 
  'Current Policies' as step,
  policyname,
  cmd as command_type,
  roles,
  qual as using_clause,
  with_check as with_check_clause
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (policyname LIKE '%moments%' OR policyname LIKE '%upload%');

-- Test folder extraction function with your actual path
SELECT 
  'Folder Extraction Test' as step,
  'moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4' as test_path,
  (storage.foldername('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4'))[1] as extracted_folder,
  '0143e12a-7a06-4dbc-be66-6463260ab61d' as expected_user_id,
  CASE 
    WHEN (storage.foldername('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4'))[1] = '0143e12a-7a06-4dbc-be66-6463260ab61d'
    THEN '✅ Folder extraction works'
    ELSE '❌ Folder extraction failed'
  END as test_result;

-- Check if auth.uid() is accessible in storage context
SELECT 
  'Auth Check' as step,
  auth.uid() as current_user_id,
  CASE 
    WHEN auth.uid() IS NOT NULL THEN '✅ User authenticated'
    ELSE '❌ No authenticated user'
  END as auth_status;

-- ============================================================================
-- STEP 2: FIX - Drop all existing policies
-- ============================================================================

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND (policyname LIKE '%moments%' OR policyname LIKE '%upload%' OR policyname LIKE '%Users can%')
  ) LOOP
    EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON storage.objects';
    RAISE NOTICE 'Dropped policy: %', r.policyname;
  END LOOP;
END $$;

-- ============================================================================
-- STEP 3: CREATE ROBUST POLICIES
-- ============================================================================

-- Get the actual bucket name (handles case sensitivity)
DO $$
DECLARE
  bucket_name_var TEXT;
BEGIN
  SELECT name INTO bucket_name_var FROM storage.buckets WHERE LOWER(name) = 'moments' LIMIT 1;
  
  IF bucket_name_var IS NULL THEN
    RAISE EXCEPTION 'Bucket "moments" not found. Create it in Storage → New bucket';
  END IF;
  
  RAISE NOTICE 'Using bucket name: %', bucket_name_var;
END $$;

-- Policy 1: INSERT - Users can upload to their own folder
-- Using multiple approaches to ensure it works
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  -- Check bucket (case-insensitive)
  LOWER(bucket_id) = 'moments' AND
  -- Extract folder name and compare with auth.uid()
  -- Using both text comparison methods
  (
    (storage.foldername(name))[1] = (auth.uid())::text OR
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Policy 2: SELECT - Public can read all moments
CREATE POLICY "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (LOWER(bucket_id) = 'moments');

-- Policy 3: DELETE - Users can delete their own files
CREATE POLICY "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  LOWER(bucket_id) = 'moments' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- Policy 4: UPDATE - Users can update their own files
CREATE POLICY "Users can update their own moments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  LOWER(bucket_id) = 'moments' AND
  (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  LOWER(bucket_id) = 'moments' AND
  (storage.foldername(name))[1] = (auth.uid())::text
);

-- ============================================================================
-- STEP 4: VERIFY POLICIES
-- ============================================================================

SELECT 
  '✅ Policies Created' as status,
  policyname,
  cmd as command_type,
  array_to_string(roles, ', ') as roles,
  CASE 
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || substring(with_check, 1, 100)
    ELSE 'USING: ' || substring(qual, 1, 100)
  END as policy_definition
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND policyname LIKE '%moments%'
ORDER BY policyname;

-- ============================================================================
-- STEP 5: TEST POLICY LOGIC
-- ============================================================================

-- Simulate the policy check with your actual user ID
SELECT 
  'Policy Logic Test' as step,
  'moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4' as test_path,
  LOWER('moments') as bucket_check,
  (storage.foldername('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4'))[1] as folder_extracted,
  '0143e12a-7a06-4dbc-be66-6463260ab61d' as expected_user_id,
  CASE 
    WHEN LOWER('moments') = 'moments' 
      AND (storage.foldername('moments/0143e12a-7a06-4dbc-be66-6463260ab61d/test.mp4'))[1] = '0143e12a-7a06-4dbc-be66-6463260ab61d'
    THEN '✅ Policy logic should work'
    ELSE '❌ Policy logic failed'
  END as test_result;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- If this still doesn't work, try:
-- 1. Check if bucket is public: SELECT public FROM storage.buckets WHERE name = 'moments';
-- 2. Verify auth.uid() returns your user ID: SELECT auth.uid();
-- 3. Check storage.objects table structure: SELECT column_name FROM information_schema.columns WHERE table_schema = 'storage' AND table_name = 'objects';
-- 4. Try uploading via Supabase Dashboard → Storage → Upload file manually to test

