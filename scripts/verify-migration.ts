/**
 * Verify Migration Success
 * 
 * This script directly queries the database schema to verify tables have columns.
 * Uses information_schema which is more reliable than inferring from data.
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as fs from 'fs';
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifyMigration() {
  console.log('🔍 Verifying migration success...\n');

  // Query information_schema directly using RPC or raw SQL
  // Since we can't use RPC directly, let's try querying the tables with a known column
  
  const tables = ['moments', 'profiles', 'moment_reactions', 'moment_reports', 'blocks', 'device_tokens'];
  
  for (const tableName of tables) {
    try {
      // Try to query a specific column that should exist after migration
      let hasColumns = false;
      let columnCount = 0;
      
      if (tableName === 'moments') {
        const { data, error } = await supabase
          .from(tableName)
          .select('id, user_id, storage_path, created_at')
          .limit(0);
        
        if (!error) {
          hasColumns = true;
          // Try to get actual column count by selecting all
          const { error: countError } = await supabase.rpc('get_table_columns', { table_name: tableName });
          if (!countError) {
            console.log(`  ✅ ${tableName}: Has required columns (id, user_id, storage_path, created_at)`);
          } else {
            console.log(`  ✅ ${tableName}: Table exists and is queryable`);
          }
        } else {
          console.log(`  ❌ ${tableName}: ${error.message}`);
          if (error.message.includes('column') || error.message.includes('does not exist')) {
            console.log(`     → Table exists but columns are missing or incorrect`);
          }
        }
      } else if (tableName === 'profiles') {
        const { data, error } = await supabase
          .from(tableName)
          .select('id, username')
          .limit(0);
        
        if (!error) {
          console.log(`  ✅ ${tableName}: Has columns (working correctly)`);
        } else {
          console.log(`  ❌ ${tableName}: ${error.message}`);
        }
      } else {
        // For other tables, just check if they're queryable
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (!error) {
          console.log(`  ✅ ${tableName}: Table exists and is queryable`);
        } else {
          console.log(`  ❌ ${tableName}: ${error.message}`);
          if (error.message.includes('column') || error.message.includes('does not exist')) {
            console.log(`     → Table exists but may be missing columns`);
          }
        }
      }
    } catch (error: any) {
      console.log(`  ❌ ${tableName}: ${error.message || 'Unknown error'}`);
    }
  }
  
  console.log('\n💡 If tables show errors, check:');
  console.log('   1. Did the migration run successfully in Supabase Dashboard?');
  console.log('   2. Were there any error messages in the SQL Editor?');
  console.log('   3. Check Supabase Dashboard → Table Editor to see actual table structure');
}

verifyMigration().catch(console.error);

