-- Check what's actually in the database
-- Run this in Supabase Dashboard → SQL Editor

-- 1. Check moments table directly
SELECT COUNT(*) as moments_count FROM moments;
SELECT * FROM moments LIMIT 10;

-- 2. Check feed_moments view
SELECT COUNT(*) as feed_moments_count FROM feed_moments;
SELECT * FROM feed_moments LIMIT 10;

-- 3. Check if RLS is hiding data
-- Run this as the postgres role to bypass RLS
SET ROLE postgres;
SELECT COUNT(*) as moments_count_no_rls FROM moments;
SELECT * FROM moments LIMIT 10;
RESET ROLE;

-- 4. Check profiles table
SELECT COUNT(*) as profiles_count FROM profiles;
SELECT id, username FROM profiles LIMIT 10;

-- 5. Check what the feed_moments view is actually querying
SELECT 
  pg_get_viewdef('feed_moments'::regclass, true) as view_definition;

