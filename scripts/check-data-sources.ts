/**
 * Check Data Sources
 * 
 * This script helps identify where feed data is coming from:
 * 1. Local AsyncStorage
 * 2. Supabase moments table
 * 3. feed_moments view
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkDataSources() {
  console.log('🔍 Checking data sources...\n');

  // 1. Check local storage (AsyncStorage)
  console.log('📱 Checking local storage (AsyncStorage)...');
  try {
    const localMomentsJson = await AsyncStorage.getItem('moments');
    if (localMomentsJson) {
      const localMoments = JSON.parse(localMomentsJson);
      console.log(`  ✅ Found ${localMoments.length} moments in local storage`);
      if (localMoments.length > 0) {
        console.log('  Sample moment:', {
          id: localMoments[0].id,
          uri: localMoments[0].uri?.substring(0, 50) + '...',
          createdAt: localMoments[0].createdAt,
        });
      }
    } else {
      console.log('  ℹ️  No moments in local storage');
    }
  } catch (error) {
    console.log('  ❌ Error reading local storage:', error);
  }

  console.log('');

  // 2. Check moments table directly
  console.log('🗄️  Checking moments table...');
  try {
    const { data, error, count } = await supabase
      .from('moments')
      .select('*', { count: 'exact' })
      .limit(10);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
    } else {
      console.log(`  ✅ Found ${count || 0} moments in database`);
      if (data && data.length > 0) {
        console.log('  Sample moment:', {
          id: data[0].id,
          storage_path: data[0].storage_path,
          user_id: data[0].user_id,
          created_at: data[0].created_at,
        });
      }
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log('');

  // 3. Check feed_moments view
  console.log('👁️  Checking feed_moments view...');
  try {
    const { data, error, count } = await supabase
      .from('feed_moments')
      .select('*', { count: 'exact' })
      .limit(10);

    if (error) {
      console.log(`  ❌ Error: ${error.message}`);
      if (error.message.includes('does not exist')) {
        console.log('  💡 The feed_moments view does not exist. Create it with the migration.');
      }
    } else {
      console.log(`  ✅ Found ${count || 0} moments in feed_moments view`);
      if (data && data.length > 0) {
        console.log('  Sample moment:', {
          id: data[0].id,
          username: data[0].username,
          video_url: data[0].video_url?.substring(0, 50) + '...',
          created_at: data[0].created_at,
        });
      }
    }
  } catch (error: any) {
    console.log(`  ❌ Error: ${error.message}`);
  }

  console.log('\n💡 Summary:');
  console.log('  - If you see data in local storage but not in database:');
  console.log('    → Data is stored locally and needs to be synced');
  console.log('  - If you see data in feed_moments but not in moments table:');
  console.log('    → The view might be querying old/cached data');
  console.log('  - If tables are empty but feed shows data:');
  console.log('    → Feed is showing local storage data (AsyncStorage)');
}

checkDataSources().catch(console.error);

