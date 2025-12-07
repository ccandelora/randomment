/**
 * Database Schema Inspection Script
 * 
 * Queries Supabase to inspect the current database schema and generate
 * SQL migration scripts to fix any issues.
 * 
 * Usage:
 *   npx ts-node scripts/inspect-schema.ts
 * 
 * Or compile and run:
 *   npx tsx scripts/inspect-schema.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials in .env file');
  console.error('Required: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

interface ColumnInfo {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
  character_maximum_length: number | null;
}

interface TableInfo {
  table_name: string;
  columns: ColumnInfo[];
}

interface ViewInfo {
  view_name: string;
  definition: string;
}

/**
 * Get all tables in the public schema
 * 
 * Note: Supabase REST API doesn't allow direct querying of information_schema.
 * We'll try to query known tables and see which ones exist.
 */
async function getTables(): Promise<string[]> {
  const knownTables = [
    'moments',
    'profiles',
    'moment_reactions',
    'moment_reports',
    'blocks',
    'device_tokens',
  ];

  const existingTables: string[] = [];

  // Try to query each table to see if it exists
  for (const tableName of knownTables) {
    try {
      const { error } = await supabase
        .from(tableName)
        .select('*')
        .limit(0); // Just check if table exists, don't fetch data

      if (!error) {
        existingTables.push(tableName);
      }
    } catch (error) {
      // Table doesn't exist or not accessible
      console.warn(`  Table ${tableName}: not found or not accessible`);
    }
  }

  if (existingTables.length === 0) {
    console.warn('⚠️  No tables found. Make sure you have the correct Supabase credentials.');
    console.warn('   You can also check tables manually in Supabase Dashboard → Database → Tables');
  }

  return existingTables;
}

/**
 * Get columns for a specific table
 */
async function getTableColumns(tableName: string): Promise<ColumnInfo[]> {
  // Use a direct SQL query via Supabase's REST API
  // Note: This requires enabling RPC functions or using the SQL editor
  // For now, we'll use a workaround by trying to query the table
  
  try {
    // Try to get one row to infer schema
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      console.warn(`Could not query ${tableName}:`, error.message);
      return [];
    }

    if (data && data.length > 0) {
      // Infer column info from the data
      const columns: ColumnInfo[] = [];
      const sampleRow = data[0];
      
      for (const [columnName, value] of Object.entries(sampleRow)) {
        columns.push({
          column_name: columnName,
          data_type: inferType(value),
          is_nullable: value === null ? 'YES' : 'NO',
          column_default: null,
          character_maximum_length: typeof value === 'string' ? value.length : null,
        });
      }
      
      return columns;
    }
  } catch (error) {
    console.warn(`Error inspecting ${tableName}:`, error);
  }

  return [];
}

/**
 * Infer PostgreSQL data type from JavaScript value
 */
function inferType(value: any): string {
  if (value === null) return 'unknown';
  if (typeof value === 'string') {
    // Check if it's a UUID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      return 'uuid';
    }
    // Check if it's a timestamp
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
      return 'timestamp';
    }
    return 'text';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? 'integer' : 'numeric';
  }
  if (typeof value === 'boolean') {
    return 'boolean';
  }
  if (value instanceof Date) {
    return 'timestamp';
  }
  return 'unknown';
}

/**
 * Check if a view exists
 */
async function checkView(viewName: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from(viewName)
      .select('*')
      .limit(1);

    return !error;
  } catch (error) {
    return false;
  }
}

/**
 * Expected schema definitions
 */
const EXPECTED_SCHEMA = {
  moments: {
    id: { type: 'uuid', nullable: false, primary: true },
    user_id: { type: 'uuid', nullable: false },
    storage_path: { type: 'text', nullable: false },
    description: { type: 'text', nullable: true },
    duration_seconds: { type: 'integer', nullable: true },
    status: { type: 'text', nullable: false, default: "'pending_review'" },
    visibility: { type: 'text', nullable: false, default: "'public'" },
    created_at: { type: 'timestamp', nullable: false, default: 'now()' },
    updated_at: { type: 'timestamp', nullable: false, default: 'now()' },
  },
  profiles: {
    id: { type: 'uuid', nullable: false, primary: true },
    username: { type: 'text', nullable: false, unique: true },
    display_name: { type: 'text', nullable: true },
    bio: { type: 'text', nullable: true },
    created_at: { type: 'timestamp', nullable: false, default: 'now()' },
    updated_at: { type: 'timestamp', nullable: false, default: 'now()' },
  },
  moment_reactions: {
    id: { type: 'uuid', nullable: false, primary: true },
    moment_id: { type: 'uuid', nullable: false },
    user_id: { type: 'uuid', nullable: false },
    reaction: { type: 'text', nullable: false, default: "'like'" },
    created_at: { type: 'timestamp', nullable: false, default: 'now()' },
  },
  moment_reports: {
    id: { type: 'uuid', nullable: false, primary: true },
    moment_id: { type: 'uuid', nullable: false },
    reporter_id: { type: 'uuid', nullable: false },
    reason: { type: 'text', nullable: false },
    reason_text: { type: 'text', nullable: true },
    created_at: { type: 'timestamp', nullable: false, default: 'now()' },
  },
  blocks: {
    id: { type: 'uuid', nullable: false, primary: true },
    blocker_id: { type: 'uuid', nullable: false },
    blocked_id: { type: 'uuid', nullable: false },
    created_at: { type: 'timestamp', nullable: false, default: 'now()' },
  },
  device_tokens: {
    id: { type: 'uuid', nullable: false, primary: true },
    user_id: { type: 'uuid', nullable: false },
    platform: { type: 'text', nullable: false },
    token: { type: 'text', nullable: false, unique: true },
    is_active: { type: 'boolean', nullable: false, default: 'true' },
    created_at: { type: 'timestamp', nullable: false, default: 'now()' },
    updated_at: { type: 'timestamp', nullable: false, default: 'now()' },
  },
};

/**
 * Generate migration SQL
 */
function generateMigrationSQL(
  tables: TableInfo[],
  hasFeedMomentsView: boolean
): string {
  const migrations: string[] = [];
  migrations.push('-- Migration Script Generated by inspect-schema.ts');
  migrations.push('-- Generated at: ' + new Date().toISOString());
  migrations.push('');
  migrations.push('-- Enable UUID extension if needed');
  migrations.push('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
  migrations.push('');
  migrations.push('BEGIN;');
  migrations.push('');

  // Check each table
  for (const [tableName, expectedColumns] of Object.entries(EXPECTED_SCHEMA)) {
    const tableInfo = tables.find((t) => t.table_name === tableName);
    
    if (!tableInfo) {
      // Table doesn't exist - create it
      migrations.push(`-- Create table ${tableName}`);
      migrations.push(`CREATE TABLE IF NOT EXISTS ${tableName} (`);
      const columnDefs: string[] = [];
      
      for (const [colName, colDef] of Object.entries(expectedColumns)) {
        let def = `  ${colName} ${colDef.type}`;
        
        // For UUID primary keys, use uuid_generate_v4() if no default specified
        let defaultValue = colDef.default;
        if (!defaultValue && colDef.type === 'uuid' && colDef.primary) {
          defaultValue = 'uuid_generate_v4()';
        }
        
        if (!colDef.nullable) def += ' NOT NULL';
        if (defaultValue) def += ` DEFAULT ${defaultValue}`;
        if (colDef.primary) def += ' PRIMARY KEY';
        columnDefs.push(def);
      }
      
      migrations.push(columnDefs.join(',\n'));
      migrations.push(');');
      migrations.push('');
    } else {
      // Table exists - check for missing columns
      const existingColumns = new Set(tableInfo.columns.map((c) => c.column_name));
      
      for (const [colName, colDef] of Object.entries(expectedColumns)) {
        if (!existingColumns.has(colName)) {
          migrations.push(`-- Add missing column ${colName} to ${tableName}`);
          let def = `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${colName} ${colDef.type}`;
          
          // Determine default value
          let defaultValue: string | null = colDef.default || null;
          
          // For UUID columns without defaults, use uuid_generate_v4()
          if (!defaultValue && colDef.type === 'uuid' && !colDef.nullable) {
            defaultValue = 'uuid_generate_v4()';
          }
          
          // For NOT NULL columns without defaults, we need a default for existing rows
          if (!colDef.nullable && !defaultValue) {
            // For non-UUID types, use appropriate defaults
            if (colDef.type === 'text') {
              defaultValue = "''";
            } else if (colDef.type === 'integer') {
              defaultValue = '0';
            } else if (colDef.type === 'boolean') {
              defaultValue = 'false';
            } else {
              // For other types, make it nullable first, then update and set NOT NULL
              migrations.push(`${def};`);
              migrations.push(`-- Note: Column ${colName} added as nullable. Update existing rows before setting NOT NULL.`);
              migrations.push('');
              continue;
            }
          }
          
          if (defaultValue) {
            def += ` DEFAULT ${defaultValue}`;
            migrations.push(def + ';');
            
            // If we used a temporary default for NOT NULL, drop it after adding
            if (!colDef.nullable && defaultValue !== colDef.default) {
              migrations.push(`ALTER TABLE ${tableName} ALTER COLUMN ${colName} DROP DEFAULT;`);
            }
            
            if (!colDef.nullable) {
              migrations.push(`ALTER TABLE ${tableName} ALTER COLUMN ${colName} SET NOT NULL;`);
            }
          } else {
            if (!colDef.nullable) def += ' NOT NULL';
            migrations.push(def + ';');
          }
          migrations.push('');
        }
      }
    }
  }

  // Check for feed_moments view
  if (!hasFeedMomentsView) {
    migrations.push('-- Create feed_moments view');
    migrations.push(`CREATE OR REPLACE VIEW feed_moments AS
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
    migrations.push('');
  }

  // Handle legacy uri -> storage_path migration
  const momentsTable = tables.find((t) => t.table_name === 'moments');
  if (momentsTable) {
    const hasUri = momentsTable.columns.some((c) => c.column_name === 'uri');
    const hasStoragePath = momentsTable.columns.some((c) => c.column_name === 'storage_path');
    
    if (hasUri && !hasStoragePath) {
      migrations.push('-- Migrate legacy uri field to storage_path');
      migrations.push('ALTER TABLE moments ADD COLUMN IF NOT EXISTS storage_path TEXT;');
      migrations.push("UPDATE moments SET storage_path = uri WHERE storage_path IS NULL AND uri IS NOT NULL;");
      migrations.push('');
    }
  }

  migrations.push('COMMIT;');
  
  return migrations.join('\n');
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Inspecting Supabase database schema...\n');

  try {
    // Get tables
    console.log('📋 Fetching tables...');
    const tableNames = await getTables();
    console.log(`Found ${tableNames.length} tables: ${tableNames.join(', ')}\n`);

    // Get columns for each table
    console.log('📊 Inspecting table columns...');
    const tables: TableInfo[] = [];
    
    for (const tableName of tableNames) {
      const columns = await getTableColumns(tableName);
      tables.push({ table_name: tableName, columns });
      console.log(`  ${tableName}: ${columns.length} columns`);
    }
    console.log('');

    // Check for feed_moments view
    console.log('👁️  Checking for feed_moments view...');
    const hasFeedMomentsView = await checkView('feed_moments');
    console.log(`  feed_moments view: ${hasFeedMomentsView ? 'EXISTS' : 'MISSING'}\n`);

    // Generate schema report
    console.log('📝 Generating schema report...');
    const reportPath = path.join(__dirname, '../docs/schema-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      tables: tables.map((t) => ({
        name: t.table_name,
        columns: t.columns.map((c) => ({
          name: c.column_name,
          type: c.data_type,
          nullable: c.is_nullable === 'YES',
        })),
      })),
      views: {
        feed_moments: hasFeedMomentsView,
      },
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`  Saved to: ${reportPath}\n`);

    // Generate migration SQL
    console.log('🔧 Generating migration SQL...');
    const migrationSQL = generateMigrationSQL(tables, hasFeedMomentsView);
    const migrationPath = path.join(__dirname, '../migrations/fix-schema.sql');
    
    // Ensure migrations directory exists
    const migrationsDir = path.join(__dirname, '../migrations');
    if (!fs.existsSync(migrationsDir)) {
      fs.mkdirSync(migrationsDir, { recursive: true });
    }
    
    fs.writeFileSync(migrationPath, migrationSQL);
    console.log(`  Saved to: ${migrationPath}\n`);

    console.log('✅ Schema inspection complete!');
    console.log('\nNext steps:');
    console.log('1. Review the migration SQL file: migrations/fix-schema.sql');
    console.log('2. Run it in Supabase SQL Editor: https://app.supabase.com → SQL Editor');
    console.log('3. Or use the Supabase CLI: supabase db push');

  } catch (error) {
    console.error('❌ Error inspecting schema:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { main as inspectSchema };

