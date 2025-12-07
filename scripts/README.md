# Database Schema Scripts

This directory contains scripts for inspecting and managing your Supabase database schema.

## Scripts

### `inspect-schema.ts`

Inspects your current Supabase database schema and generates migration SQL to fix any issues.

**Usage:**
```bash
npm run db:inspect
```

**What it does:**
1. Connects to your Supabase database (using `.env` credentials)
2. Inspects all tables and their columns
3. Checks for the `feed_moments` view
4. Compares current schema with expected schema
5. Generates migration SQL file: `migrations/fix-schema.sql`
6. Generates schema report: `docs/schema-report.json`

**Output:**
- `migrations/fix-schema.sql` - SQL script to fix schema issues
- `docs/schema-report.json` - JSON report of current schema

### `generate-schema-sql.ts`

Generates a complete SQL script for the expected database schema.

**Usage:**
```bash
npm run db:schema
```

**What it does:**
- Generates `migrations/expected-schema.sql` with the complete expected schema
- Includes all tables, indexes, and views
- Useful as a reference or for creating a fresh database

**Output:**
- `migrations/expected-schema.sql` - Complete expected schema SQL

## Prerequisites

1. **Environment Variables**: Make sure your `.env` file has:
   ```
   EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
   ```

2. **Dependencies**: Install required packages:
   ```bash
   npm install
   ```

## Running Scripts

### Option 1: Using npm scripts (Recommended)
```bash
# Inspect current schema and generate migration
npm run db:inspect

# Generate expected schema SQL
npm run db:schema
```

### Option 2: Using tsx directly
```bash
# Install tsx if not already installed
npm install -D tsx

# Run scripts
npx tsx scripts/inspect-schema.ts
npx tsx scripts/generate-schema-sql.ts
```

## Applying Migrations

After generating migration SQL:

### Option 1: Supabase Dashboard (Easiest)
1. Go to https://app.supabase.com
2. Select your project
3. Navigate to **SQL Editor**
4. Copy and paste the contents of `migrations/fix-schema.sql`
5. Click **Run**

### Option 2: Supabase CLI
```bash
# If you have Supabase CLI installed
supabase db push migrations/fix-schema.sql
```

### Option 3: psql (Direct connection)
```bash
# Get connection string from Supabase Dashboard → Settings → Database
psql "your_connection_string" -f migrations/fix-schema.sql
```

## Understanding the Output

### Schema Report (`docs/schema-report.json`)

Shows the current state of your database:
```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "tables": [
    {
      "name": "moments",
      "columns": [
        { "name": "id", "type": "uuid", "nullable": false },
        { "name": "storage_path", "type": "text", "nullable": false }
      ]
    }
  ],
  "views": {
    "feed_moments": true
  }
}
```

### Migration SQL (`migrations/fix-schema.sql`)

Contains SQL statements to:
- Add missing columns
- Create missing tables
- Create missing views
- Migrate legacy data (e.g., `uri` → `storage_path`)

**Important**: Always review the migration SQL before running it!

## Troubleshooting

### Script fails to connect
- Check that `.env` file exists and has correct credentials
- Verify Supabase URL and anon key are correct
- Ensure you have network access to Supabase

### Script can't inspect schema
- Some schema inspection requires direct SQL access
- The script uses fallback methods (querying sample rows)
- For full schema inspection, use Supabase Dashboard → Database → Tables

### Migration SQL doesn't work
- Review the SQL for syntax errors
- Check that you have proper permissions
- Some operations may require superuser access (use Supabase Dashboard)

## Manual Schema Inspection

If scripts don't work, you can inspect schema manually:

1. **Supabase Dashboard**:
   - Go to **Database** → **Tables**
   - View table structures and columns
   - Check **Database** → **Views** for views

2. **SQL Editor**:
   ```sql
   -- List all tables
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';

   -- Get columns for a table
   SELECT column_name, data_type, is_nullable
   FROM information_schema.columns
   WHERE table_name = 'moments';
   ```

## Expected Schema

See `migrations/expected-schema.sql` for the complete expected schema, or refer to:

- `docs/supabase-rls.md` - RLS policies
- `docs/legacy-data-migration.md` - Migration guide

## Next Steps

1. Run `npm run db:inspect` to see current state
2. Review generated migration SQL
3. Apply migrations via Supabase Dashboard
4. Verify app works correctly
5. Run diagnostics again to confirm fixes

