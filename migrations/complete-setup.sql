-- Complete Supabase Setup Script
-- Run this entire script in Supabase Dashboard → SQL Editor
-- 
-- This script includes:
-- 1. Database schema fixes (adds missing columns)
-- 2. Table RLS policies (profiles, moments, reactions, reports, blocks, device_tokens)
-- 3. Storage RLS policies (moments bucket)
-- 4. Feed moments view creation
--
-- Prerequisites:
-- 1. Create the 'moments' storage bucket in Storage (must be public)
--    - Go to Storage → New bucket
--    - Name: moments
--    - Public bucket: ✅ Checked
-- 2. Ensure you're authenticated as a user with admin privileges

-- ============================================================================
-- PART 1: ENABLE EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 2: DATABASE SCHEMA FIXES
-- ============================================================================

BEGIN;

-- Add missing columns to moments table
ALTER TABLE moments ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moments ALTER COLUMN id DROP DEFAULT;
ALTER TABLE moments ALTER COLUMN id SET NOT NULL;

ALTER TABLE moments ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moments ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE moments ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE moments ADD COLUMN IF NOT EXISTS storage_path text DEFAULT '';
ALTER TABLE moments ALTER COLUMN storage_path DROP DEFAULT;
ALTER TABLE moments ALTER COLUMN storage_path SET NOT NULL;

ALTER TABLE moments ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE moments ADD COLUMN IF NOT EXISTS duration_seconds integer;
ALTER TABLE moments ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending_review';
ALTER TABLE moments ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
ALTER TABLE moments ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
ALTER TABLE moments ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

-- Add missing columns to moment_reactions table
ALTER TABLE moment_reactions ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moment_reactions ALTER COLUMN id DROP DEFAULT;
ALTER TABLE moment_reactions ALTER COLUMN id SET NOT NULL;

ALTER TABLE moment_reactions ADD COLUMN IF NOT EXISTS moment_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moment_reactions ALTER COLUMN moment_id DROP DEFAULT;
ALTER TABLE moment_reactions ALTER COLUMN moment_id SET NOT NULL;

ALTER TABLE moment_reactions ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moment_reactions ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE moment_reactions ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE moment_reactions ADD COLUMN IF NOT EXISTS reaction text NOT NULL DEFAULT 'like';
ALTER TABLE moment_reactions ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- Add missing columns to moment_reports table
ALTER TABLE moment_reports ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moment_reports ALTER COLUMN id DROP DEFAULT;
ALTER TABLE moment_reports ALTER COLUMN id SET NOT NULL;

ALTER TABLE moment_reports ADD COLUMN IF NOT EXISTS moment_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moment_reports ALTER COLUMN moment_id DROP DEFAULT;
ALTER TABLE moment_reports ALTER COLUMN moment_id SET NOT NULL;

ALTER TABLE moment_reports ADD COLUMN IF NOT EXISTS reporter_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE moment_reports ALTER COLUMN reporter_id DROP DEFAULT;
ALTER TABLE moment_reports ALTER COLUMN reporter_id SET NOT NULL;

ALTER TABLE moment_reports ADD COLUMN IF NOT EXISTS reason text DEFAULT '';
ALTER TABLE moment_reports ALTER COLUMN reason DROP DEFAULT;
ALTER TABLE moment_reports ALTER COLUMN reason SET NOT NULL;

ALTER TABLE moment_reports ADD COLUMN IF NOT EXISTS reason_text text;
ALTER TABLE moment_reports ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- Add missing columns to blocks table
ALTER TABLE blocks ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4();
ALTER TABLE blocks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE blocks ALTER COLUMN id SET NOT NULL;

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS blocker_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE blocks ALTER COLUMN blocker_id DROP DEFAULT;
ALTER TABLE blocks ALTER COLUMN blocker_id SET NOT NULL;

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS blocked_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE blocks ALTER COLUMN blocked_id DROP DEFAULT;
ALTER TABLE blocks ALTER COLUMN blocked_id SET NOT NULL;

ALTER TABLE blocks ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();

-- Add missing columns to device_tokens table
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS id uuid DEFAULT uuid_generate_v4();
ALTER TABLE device_tokens ALTER COLUMN id DROP DEFAULT;
ALTER TABLE device_tokens ALTER COLUMN id SET NOT NULL;

ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT uuid_generate_v4();
ALTER TABLE device_tokens ALTER COLUMN user_id DROP DEFAULT;
ALTER TABLE device_tokens ALTER COLUMN user_id SET NOT NULL;

ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS platform text DEFAULT '';
ALTER TABLE device_tokens ALTER COLUMN platform DROP DEFAULT;
ALTER TABLE device_tokens ALTER COLUMN platform SET NOT NULL;

ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS token text DEFAULT '';
ALTER TABLE device_tokens ALTER COLUMN token DROP DEFAULT;
ALTER TABLE device_tokens ALTER COLUMN token SET NOT NULL;

ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS created_at timestamp NOT NULL DEFAULT now();
ALTER TABLE device_tokens ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

COMMIT;

-- ============================================================================
-- PART 3: ENABLE RLS ON TABLES
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: TABLE RLS POLICIES
-- ============================================================================

BEGIN;

-- Drop existing policies if they exist (to allow re-running this script)
-- Profiles Table Policies
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

DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- Moments Table Policies
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

DROP POLICY IF EXISTS "Users can update their own moments" ON public.moments;
CREATE POLICY "Users can update their own moments"
ON public.moments FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own moments" ON public.moments;
CREATE POLICY "Users can delete their own moments"
ON public.moments FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Moment Reactions Table Policies
DROP POLICY IF EXISTS "Users can read reactions on visible moments" ON public.moment_reactions;
CREATE POLICY "Users can read reactions on visible moments"
ON public.moment_reactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM moments m
    WHERE m.id = moment_reactions.moment_id
    AND (m.visibility = 'public' OR m.user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can insert their own reactions" ON public.moment_reactions;
CREATE POLICY "Users can insert their own reactions"
ON public.moment_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.moment_reactions;
CREATE POLICY "Users can delete their own reactions"
ON public.moment_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Moment Reports Table Policies
DROP POLICY IF EXISTS "Users can insert reports" ON public.moment_reports;
CREATE POLICY "Users can insert reports"
ON public.moment_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Note: Reports are admin-only for reading/updating/deleting
-- Add admin policies separately if needed

-- Blocks Table Policies
DROP POLICY IF EXISTS "Users can read their own blocks" ON public.blocks;
CREATE POLICY "Users can read their own blocks"
ON public.blocks FOR SELECT
TO authenticated
USING (blocker_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own blocks" ON public.blocks;
CREATE POLICY "Users can insert their own blocks"
ON public.blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

DROP POLICY IF EXISTS "Users can delete their own blocks" ON public.blocks;
CREATE POLICY "Users can delete their own blocks"
ON public.blocks FOR DELETE
TO authenticated
USING (blocker_id = auth.uid());

-- Device Tokens Table Policies
DROP POLICY IF EXISTS "Users can read their own device tokens" ON public.device_tokens;
CREATE POLICY "Users can read their own device tokens"
ON public.device_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert their own device tokens" ON public.device_tokens;
CREATE POLICY "Users can insert their own device tokens"
ON public.device_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own device tokens" ON public.device_tokens;
CREATE POLICY "Users can update their own device tokens"
ON public.device_tokens FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own device tokens" ON public.device_tokens;
CREATE POLICY "Users can delete their own device tokens"
ON public.device_tokens FOR DELETE
TO authenticated
USING (user_id = auth.uid());

COMMIT;

-- ============================================================================
-- PART 5: STORAGE RLS POLICIES
-- ============================================================================

BEGIN;

-- Storage Policies for moments bucket
-- Drop existing policies if they exist (to allow re-running this script)
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

DROP POLICY IF EXISTS "Users can update their own moments" ON storage.objects;
CREATE POLICY "Users can update their own moments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;

-- ============================================================================
-- PART 6: CREATE FEED MOMENTS VIEW
-- ============================================================================

-- Drop view if it exists (to avoid column conflicts)
DROP VIEW IF EXISTS feed_moments;

-- Create the view
CREATE VIEW feed_moments AS
SELECT 
  m.id,
  m.storage_path,
  m.description,
  m.created_at,
  m.user_id,
  p.username,
  p.display_name,
  COALESCE(
    (SELECT COUNT(*) FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.reaction = 'like'),
    0
  ) as like_count,
  COALESCE(
    (SELECT EXISTS(SELECT 1 FROM moment_reactions mr WHERE mr.moment_id = m.id AND mr.user_id = auth.uid() AND mr.reaction = 'like')),
    false
  ) as has_liked,
  CASE 
    WHEN m.storage_path IS NOT NULL THEN
      CONCAT('https://', current_setting('app.supabase_url', true), '/storage/v1/object/public/moments/', m.storage_path)
    ELSE NULL
  END as video_url
FROM moments m
JOIN profiles p ON m.user_id = p.id
WHERE m.visibility = 'public'
  -- Cast enum to text for comparison
  -- Only include statuses that should appear in feed
  -- If you get an enum error, check what values your enum has and adjust this list
  -- Common values: 'published', 'pending_review', 'approved', 'rejected'
  -- For now, using only 'published' and 'pending_review' to avoid enum errors
  AND m.status::text IN ('published', 'pending_review')
ORDER BY m.created_at DESC;

-- ============================================================================
-- PART 7: CREATE INDEXES (OPTIONAL BUT RECOMMENDED)
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_status ON moments(status);
CREATE INDEX IF NOT EXISTS idx_moments_visibility ON moments(visibility);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_moment_reactions_moment_id ON moment_reactions(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_reactions_user_id ON moment_reactions(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

-- ============================================================================
-- SETUP COMPLETE!
-- ============================================================================

-- Next steps:
-- 1. Verify bucket 'moments' exists and is public (Storage → Buckets)
-- 2. Test the app - try uploading a moment
-- 3. Check that feed loads correctly
-- 4. Verify RLS policies are working (try unauthorized operations)

