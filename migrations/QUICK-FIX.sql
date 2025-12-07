-- QUICK FIX: Run this if complete-setup.sql had issues
-- This focuses on the most critical fixes

-- ============================================================================
-- STEP 1: FIX MOMENTS TABLE COLUMNS
-- ============================================================================

-- Check if moments table exists and has any columns
DO $$
BEGIN
  -- If moments table has 0 columns, it might be a view or need recreation
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'Moments table appears empty - you may need to recreate it';
  END IF;
END $$;

-- Add columns one by one with error handling
DO $$
BEGIN
  -- Add id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'id'
  ) THEN
    ALTER TABLE moments ADD COLUMN id uuid DEFAULT uuid_generate_v4();
    ALTER TABLE moments ALTER COLUMN id DROP DEFAULT;
    ALTER TABLE moments ALTER COLUMN id SET NOT NULL;
  END IF;

  -- Add user_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE moments ADD COLUMN user_id uuid DEFAULT uuid_generate_v4();
    ALTER TABLE moments ALTER COLUMN user_id DROP DEFAULT;
    ALTER TABLE moments ALTER COLUMN user_id SET NOT NULL;
  END IF;

  -- Add storage_path column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'moments' AND column_name = 'storage_path'
  ) THEN
    ALTER TABLE moments ADD COLUMN storage_path text DEFAULT '';
    ALTER TABLE moments ALTER COLUMN storage_path DROP DEFAULT;
    ALTER TABLE moments ALTER COLUMN storage_path SET NOT NULL;
  END IF;

  -- Add other columns
  ALTER TABLE moments ADD COLUMN IF NOT EXISTS description text;
  ALTER TABLE moments ADD COLUMN IF NOT EXISTS duration_seconds integer;
  ALTER TABLE moments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_review';
  ALTER TABLE moments ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
  ALTER TABLE moments ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
  ALTER TABLE moments ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();
END $$;

-- ============================================================================
-- STEP 2: ENABLE RLS
-- ============================================================================

ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: STORAGE POLICIES (CRITICAL FOR UPLOADS)
-- ============================================================================

BEGIN;

-- Drop and recreate storage policies
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Public can read moments" ON storage.objects;
CREATE POLICY "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');

DROP POLICY IF EXISTS "Users can delete their own moments" ON storage.objects;
CREATE POLICY "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;

-- ============================================================================
-- STEP 4: BASIC TABLE POLICIES (MINIMUM REQUIRED)
-- ============================================================================

BEGIN;

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Moments policies
DROP POLICY IF EXISTS "Users can view public moments and their own moments" ON public.moments;
CREATE POLICY "Users can view public moments and their own moments"
ON public.moments FOR SELECT
TO authenticated
USING (
  visibility = 'public' 
  OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can insert their own moments" ON public.moments;
CREATE POLICY "Users can insert their own moments"
ON public.moments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check what we created
SELECT 
  'Moments columns' as check_type,
  COUNT(*) as count
FROM information_schema.columns
WHERE table_name = 'moments' AND table_schema = 'public'

UNION ALL

SELECT 
  'Storage policies',
  COUNT(*)
FROM storage.policies
WHERE bucket_id = 'moments'

UNION ALL

SELECT 
  'Table policies',
  COUNT(*)
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('moments', 'profiles');

