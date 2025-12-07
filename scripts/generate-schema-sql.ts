/**
 * Generate Expected Schema SQL
 * 
 * Generates SQL scripts for the expected database schema.
 * This creates a reference file showing what the schema should look like.
 * 
 * Usage:
 *   npx ts-node scripts/generate-schema-sql.ts
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate complete schema SQL
 */
function generateSchemaSQL(): string {
  const sql: string[] = [];

  sql.push('-- Complete Database Schema for Moment Roulette');
  sql.push('-- Generated at: ' + new Date().toISOString());
  sql.push('');
  sql.push('-- Enable UUID extension');
  sql.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  sql.push('');
  sql.push('BEGIN;');
  sql.push('');

  // Profiles table
  sql.push('-- Profiles table');
  sql.push(`CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
  sql.push('');

  // Moments table
  sql.push('-- Moments table');
  sql.push(`CREATE TABLE IF NOT EXISTS moments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  description TEXT,
  duration_seconds INTEGER,
  status TEXT NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'published')),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
  sql.push('');

  // Moment reactions table
  sql.push('-- Moment reactions table');
  sql.push(`CREATE TABLE IF NOT EXISTS moment_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like' CHECK (reaction IN ('like')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(moment_id, user_id, reaction)
);`);
  sql.push('');

  // Moment reports table
  sql.push('-- Moment reports table');
  sql.push(`CREATE TABLE IF NOT EXISTS moment_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moment_id UUID NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate_content', 'violence', 'hate_speech', 'other')),
  reason_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
  sql.push('');

  // Blocks table
  sql.push('-- Blocks table');
  sql.push(`CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id),
  CHECK (blocker_id != blocked_id)
);`);
  sql.push('');

  // Device tokens table
  sql.push('-- Device tokens table');
  sql.push(`CREATE TABLE IF NOT EXISTS device_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('ios', 'android')),
  token TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);`);
  sql.push('');

  // Indexes
  sql.push('-- Indexes');
  sql.push('CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_moments_status ON moments(status);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_moments_visibility ON moments(visibility);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_moment_reactions_moment_id ON moment_reactions(moment_id);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_moment_reactions_user_id ON moment_reactions(user_id);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id ON device_tokens(user_id);');
  sql.push('CREATE INDEX IF NOT EXISTS idx_device_tokens_token ON device_tokens(token);');
  sql.push('');

  // Feed moments view
  sql.push('-- Feed moments view');
  sql.push(`CREATE OR REPLACE VIEW feed_moments AS
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
  AND m.status IN ('published', 'pending_review', 'approved')
ORDER BY m.created_at DESC;`);
  sql.push('');

  sql.push('COMMIT;');
  sql.push('');
  sql.push('-- Note: RLS policies should be set up separately');
  sql.push('-- See docs/supabase-rls.md for RLS policy definitions');

  return sql.join('\n');
}

/**
 * Main function
 */
function main() {
  console.log('📝 Generating expected schema SQL...\n');

  const sql = generateSchemaSQL();
  
  // Ensure migrations directory exists
  const migrationsDir = path.join(__dirname, '../migrations');
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
  }

  const outputPath = path.join(migrationsDir, 'expected-schema.sql');
  fs.writeFileSync(outputPath, sql);
  
  console.log(`✅ Schema SQL generated: ${outputPath}`);
  console.log('\nThis file contains the complete expected database schema.');
  console.log('You can use it as a reference or run it to create a fresh database.');
}

if (require.main === module) {
  main();
}

export { generateSchemaSQL };

