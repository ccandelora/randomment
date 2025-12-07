-- Verify Storage Setup
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Check if storage bucket exists
SELECT name, public 
FROM storage.buckets 
WHERE name = 'moments';

-- 2. Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as command_type,
  roles
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
ORDER BY policyname;

-- 3. If bucket doesn't exist, you need to create it:
-- Go to Storage → New bucket → Name: "moments" → Public: ✅

-- 4. If no policies exist, run the storage policies from COMPLETE-FIX.sql
-- Or run migrations/storage-policies.sql

