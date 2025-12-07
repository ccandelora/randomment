-- COMPLETE FIX: Recreate tables + Storage policies
-- Run this in Supabase Dashboard → SQL Editor
-- This will fix the "0 columns" issue and set up storage policies

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

BEGIN;

-- ============================================================================
-- DROP EXISTING TABLES (if they're broken)
-- ============================================================================

-- Drop view first (depends on moments table)
DROP VIEW IF EXISTS feed_moments CASCADE;

-- Drop tables in reverse dependency order
DROP TABLE IF EXISTS moment_reactions CASCADE;
DROP TABLE IF EXISTS moment_reports CASCADE;
DROP TABLE IF EXISTS blocks CASCADE;
DROP TABLE IF EXISTS device_tokens CASCADE;
DROP TABLE IF EXISTS moments CASCADE;
-- Keep profiles table (it has columns and is working)

-- ============================================================================
-- RECREATE MOMENTS TABLE
-- ============================================================================

CREATE TABLE moments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  description text,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'pending_review',
  visibility text NOT NULL DEFAULT 'public',
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT moments_status_check CHECK (status IN ('pending_review', 'approved', 'rejected', 'published')),
  CONSTRAINT moments_visibility_check CHECK (visibility IN ('public', 'private'))
);

-- ============================================================================
-- RECREATE MOMENT_REACTIONS TABLE
-- ============================================================================

CREATE TABLE moment_reactions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id uuid NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction text NOT NULL DEFAULT 'like',
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT moment_reactions_unique UNIQUE (moment_id, user_id, reaction),
  CONSTRAINT moment_reactions_reaction_check CHECK (reaction = 'like')
);

-- ============================================================================
-- RECREATE MOMENT_REPORTS TABLE
-- ============================================================================

CREATE TABLE moment_reports (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id uuid NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  reporter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  reason_text text,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT moment_reports_reason_check CHECK (
    reason IN ('spam', 'harassment', 'inappropriate_content', 'violence', 'hate_speech', 'other')
  )
);

-- ============================================================================
-- RECREATE BLOCKS TABLE
-- ============================================================================

CREATE TABLE blocks (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT blocks_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT blocks_no_self_block CHECK (blocker_id != blocked_id)
);

-- ============================================================================
-- RECREATE DEVICE_TOKENS TABLE
-- ============================================================================

CREATE TABLE device_tokens (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  token text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT device_tokens_unique UNIQUE (user_id, platform, token)
);

-- ============================================================================
-- CREATE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_status ON moments(status);
CREATE INDEX IF NOT EXISTS idx_moments_visibility ON moments(visibility);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_moment_reactions_moment_id ON moment_reactions(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_reactions_user_id ON moment_reactions(user_id);

CREATE INDEX IF NOT EXISTS idx_moment_reports_moment_id ON moment_reports(moment_id);
CREATE INDEX IF NOT EXISTS idx_moment_reports_reporter_id ON moment_reports(reporter_id);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);

COMMIT;

-- ============================================================================
-- ENABLE RLS
-- ============================================================================

ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE moment_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CREATE RLS POLICIES
-- ============================================================================

BEGIN;

-- Profiles policies (if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Profiles are viewable by everyone'
  ) THEN
    CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can insert their own profile'
  ) THEN
    CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);
  END IF;
END $$;

-- Moments policies
CREATE POLICY "Users can view public moments and their own moments"
ON public.moments FOR SELECT
TO authenticated
USING (
  visibility = 'public' 
  OR user_id = auth.uid()
);

CREATE POLICY "Users can insert their own moments"
ON public.moments FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own moments"
ON public.moments FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own moments"
ON public.moments FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Moment reactions policies
CREATE POLICY "Users can view all reactions"
ON public.moment_reactions FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Users can insert their own reactions"
ON public.moment_reactions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reactions"
ON public.moment_reactions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Moment reports policies
CREATE POLICY "Users can view their own reports"
ON public.moment_reports FOR SELECT
TO authenticated
USING (auth.uid() = reporter_id);

CREATE POLICY "Users can insert their own reports"
ON public.moment_reports FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = reporter_id);

-- Blocks policies
CREATE POLICY "Users can view their own blocks"
ON public.blocks FOR SELECT
TO authenticated
USING (auth.uid() = blocker_id);

CREATE POLICY "Users can insert their own blocks"
ON public.blocks FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can delete their own blocks"
ON public.blocks FOR DELETE
TO authenticated
USING (auth.uid() = blocker_id);

-- Device tokens policies
CREATE POLICY "Users can view their own device tokens"
ON public.device_tokens FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own device tokens"
ON public.device_tokens FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own device tokens"
ON public.device_tokens FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own device tokens"
ON public.device_tokens FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

COMMIT;

-- ============================================================================
-- RECREATE FEED_MOMENTS VIEW
-- ============================================================================

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
  AND m.status IN ('published', 'pending_review');

-- ============================================================================
-- STORAGE POLICIES (CRITICAL FOR UPLOADS)
-- ============================================================================

BEGIN;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload their own moments" ON storage.objects;
DROP POLICY IF EXISTS "Public can read moments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own moments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own moments" ON storage.objects;

-- Policy 1: Allow authenticated users to upload files
-- Users can only upload to folders matching their user_id
CREATE POLICY "Users can upload their own moments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 2: Allow public read access to all moments
-- Anyone can view/download videos from the moments bucket
CREATE POLICY "Public can read moments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'moments');

-- Policy 3: Allow users to delete their own files
-- Users can only delete files from their own folder
CREATE POLICY "Users can delete their own moments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to update their own files (optional)
-- Users can update metadata for files in their own folder
CREATE POLICY "Users can update their own moments"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'moments' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

COMMIT;

-- ============================================================================
-- VERIFICATION (Removed to prevent migration failures)
-- ============================================================================

-- Verification queries have been removed from this migration file.
-- Run 'npm run db:inspect' after migration completes to verify the schema.
-- The migration should complete successfully now.
