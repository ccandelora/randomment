# Run Migration in Supabase Dashboard

Since the CLI is having authentication issues, run this migration directly in the Supabase Dashboard:

## Steps:

1. **Open Supabase Dashboard**: https://app.supabase.com
2. **Select your project**: `gqenovknwpnydyhbwtqw`
3. **Go to SQL Editor**: Click "SQL Editor" in the left sidebar
4. **Click "New Query"**
5. **Copy and paste** the entire contents of `migrations/COMPLETE-FIX.sql`
6. **Click "Run"** (or press Cmd+Enter / Ctrl+Enter)

## What This Migration Does:

- ✅ Drops and recreates broken tables (moments, moment_reactions, etc.)
- ✅ Sets up RLS policies for all tables
- ✅ Creates storage policies for the moments bucket
- ✅ Recreates the feed_moments view
- ✅ Preserves your profiles table (won't touch it)

## After Running:

Run `npm run db:inspect` to verify everything worked correctly.

## Alternative: Use psql Directly

If you prefer command line, you can also use `psql` directly:

```bash
psql "postgresql://postgres.gqenovknwpnydyhbwtqw:itGRM5dlk8ZGtM5p@aws-0-us-west-2.pooler.supabase.com:6543/postgres" -f migrations/COMPLETE-FIX.sql
```

But the Dashboard SQL Editor is usually easier and more reliable.

