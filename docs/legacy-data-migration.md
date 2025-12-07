# Legacy Data Migration Guide

This guide helps identify and resolve legacy data issues in your Supabase database.

## Common Legacy Data Issues

### 1. Missing `feed_moments` View

**Problem**: The app expects a `feed_moments` database view that combines data from multiple tables.

**Solution**: The app will automatically fall back to `fetchPublishedMoments()` which queries tables directly. However, for better performance, create the view:

```sql
CREATE OR REPLACE VIEW feed_moments AS
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
ORDER BY m.created_at DESC;
```

### 2. Legacy `uri` Field Instead of `storage_path`

**Problem**: Older database schemas may have a `uri` field instead of `storage_path` in the `moments` table.

**Detection**: The app automatically detects and handles this, but you'll see warnings in development mode.

**Solution**: Migrate the data:

```sql
-- Add storage_path column if it doesn't exist
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Migrate data from uri to storage_path
UPDATE moments 
SET storage_path = uri 
WHERE storage_path IS NULL AND uri IS NOT NULL;

-- Optional: Remove uri column after migration
-- ALTER TABLE moments DROP COLUMN uri;
```

### 3. Missing Required Columns

**Problem**: Tables may be missing required columns like `status`, `visibility`, etc.

**Solution**: Add missing columns with defaults:

```sql
-- Add status column if missing
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending_review';

-- Add visibility column if missing
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS visibility TEXT DEFAULT 'public';

-- Add duration_seconds if missing
ALTER TABLE moments 
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
```

### 4. Orphaned Moments (Moments Without Profiles)

**Problem**: Moments may reference users that don't have profiles.

**Detection**: The app will show these moments with username "unknown".

**Solution**: Either create missing profiles or clean up orphaned moments:

```sql
-- Find orphaned moments
SELECT m.* FROM moments m
LEFT JOIN profiles p ON m.user_id = p.id
WHERE p.id IS NULL;

-- Option 1: Create placeholder profiles (if users exist in auth.users)
INSERT INTO profiles (id, username, display_name)
SELECT 
  u.id,
  'user_' || SUBSTRING(u.id::text, 1, 8),
  NULL
FROM auth.users u
WHERE u.id IN (
  SELECT DISTINCT user_id FROM moments
  WHERE user_id NOT IN (SELECT id FROM profiles)
);

-- Option 2: Delete orphaned moments (use with caution!)
-- DELETE FROM moments 
-- WHERE user_id NOT IN (SELECT id FROM profiles);
```

### 5. Missing Profile Data

**Problem**: Users may not have profiles created.

**Solution**: Ensure profiles are created during onboarding. For existing users:

```sql
-- Create profiles for users without profiles
INSERT INTO profiles (id, username, display_name)
SELECT 
  u.id,
  'user_' || SUBSTRING(u.id::text, 1, 8),
  COALESCE(u.raw_user_meta_data->>'display_name', NULL)
FROM auth.users u
WHERE u.id NOT IN (SELECT id FROM profiles);
```

## Using the Diagnostic Tools

The app includes diagnostic tools that run automatically in development mode:

1. **Automatic Diagnostics**: On app startup, diagnostics run automatically (development only)
2. **Check Console**: Look for "=== Database Diagnostics ===" in your console
3. **Manual Check**: Import and call `logDatabaseDiagnostics()` from `src/utils/databaseDiagnostics.ts`

## Data Validation

The app includes automatic data validation that:

- **Validates** all data before processing
- **Sanitizes** legacy data formats
- **Skips** invalid rows instead of crashing
- **Logs** warnings for debugging

## Migration Checklist

- [ ] Check if `feed_moments` view exists
- [ ] Verify `moments` table has `storage_path` column (or migrate from `uri`)
- [ ] Ensure `moments` table has `status` and `visibility` columns
- [ ] Check for orphaned moments (moments without profiles)
- [ ] Verify all users have profiles
- [ ] Test feed loading after migration
- [ ] Check console for any validation warnings

## Testing After Migration

1. **Load Feed**: Verify feed loads without errors
2. **Check Console**: Look for any validation warnings
3. **Test Moments**: Create a new moment and verify it appears in feed
4. **Test Profiles**: Verify user profiles display correctly

## Getting Help

If you encounter issues:

1. Check the console for diagnostic output
2. Review the error messages (they include specific column/table names)
3. Use the diagnostic tools to identify specific issues
4. Check Supabase Dashboard → Database → Tables to verify schema

## Prevention

To prevent legacy data issues:

1. **Use Migrations**: Always use database migrations for schema changes
2. **Version Schema**: Track schema versions in your codebase
3. **Test Migrations**: Test migrations on a copy of production data
4. **Document Changes**: Document all schema changes in migration files

