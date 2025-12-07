# Database Schema Tools

Quick guide for inspecting and fixing your Supabase database schema.

## Quick Start

### 1. Inspect Current Schema

```bash
npm run db:inspect
```

This will:
- Connect to your Supabase database
- Inspect all tables and columns
- Check for missing views
- Generate migration SQL: `migrations/fix-schema.sql`
- Generate schema report: `docs/schema-report.json`

### 2. Generate Expected Schema

```bash
npm run db:schema
```

This generates `migrations/expected-schema.sql` with the complete expected schema.

### 3. Apply Migrations

1. Review `migrations/fix-schema.sql`
2. Go to Supabase Dashboard → SQL Editor
3. Copy and paste the SQL
4. Click **Run**

## What Gets Generated

### `migrations/fix-schema.sql`

SQL script that:
- ✅ Adds missing columns
- ✅ Creates missing tables
- ✅ Creates missing views
- ✅ Migrates legacy data (e.g., `uri` → `storage_path`)
- ✅ Uses transactions (safe to re-run)

### `docs/schema-report.json`

JSON report showing:
- Current tables and their columns
- Column types and nullability
- Whether views exist

## Example Workflow

```bash
# 1. Inspect current schema
npm run db:inspect

# 2. Review generated migration
cat migrations/fix-schema.sql

# 3. Apply via Supabase Dashboard
# (Copy SQL to Dashboard → SQL Editor → Run)

# 4. Verify changes
npm run db:inspect  # Run again to confirm fixes
```

## Manual Schema Inspection

If scripts don't work, inspect manually:

### Via Supabase Dashboard

1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **Database** → **Tables**
4. Click on each table to see columns

### Via SQL Editor

```sql
-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

-- Get columns for a table
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'moments'
ORDER BY ordinal_position;

-- Check if view exists
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public' 
  AND table_name = 'feed_moments';
```

## Troubleshooting

### Script Can't Connect

- ✅ Check `.env` file has `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- ✅ Verify credentials in Supabase Dashboard → Settings → API

### Script Can't Inspect Schema

- ✅ Supabase REST API has limitations
- ✅ Use Supabase Dashboard for full schema inspection
- ✅ Script uses fallback methods (querying sample rows)

### Migration SQL Fails

- ✅ Review SQL for syntax errors
- ✅ Check you have proper permissions
- ✅ Some operations require superuser (use Supabase Dashboard)
- ✅ Test on development database first

## Expected Schema Overview

### Tables

- **profiles** - User profiles (username, display_name, bio)
- **moments** - Video moments (storage_path, description, status, visibility)
- **moment_reactions** - Likes/reactions on moments
- **moment_reports** - Reports on moments
- **blocks** - User blocking relationships
- **device_tokens** - Push notification device tokens

### Views

- **feed_moments** - Combined view for feed (moments + profiles + reactions)

See `migrations/expected-schema.sql` for complete schema.

## Related Documentation

- `docs/legacy-data-migration.md` - Migration guide for legacy data
- `docs/supabase-rls.md` - Row Level Security policies
- `scripts/README.md` - Detailed script documentation

