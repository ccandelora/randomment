/**
 * Database Diagnostics Utilities
 * 
 * Helps identify and diagnose legacy data issues in the database.
 * Use these functions to check for data inconsistencies and migration needs.
 */

import { supabase } from '../services/supabaseClient';
import { logError } from './errorHandling';

export interface DatabaseDiagnostics {
  feedMomentsViewExists: boolean;
  momentsTableColumns: string[];
  profilesTableColumns: string[];
  legacyMomentsCount: number;
  orphanedMomentsCount: number;
  issues: string[];
}

/**
 * Checks if the feed_moments view exists
 */
export async function checkFeedMomentsView(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('feed_moments')
      .select('*')
      .limit(1);

    // If no error, view exists
    return !error;
  } catch (error) {
    return false;
  }
}

/**
 * Gets column names from a table (by attempting to select specific columns)
 * Note: This is a best-effort approach - actual schema inspection requires SQL
 * For empty tables, we check if the table is queryable by selecting known columns
 */
export async function getTableColumns(tableName: string): Promise<string[]> {
  try {
    // First, try to select all columns (works if table has data)
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);

    if (error) {
      // If error is about missing columns, table structure is broken
      if (error.message.includes('column') || error.message.includes('does not exist')) {
        if (__DEV__) {
          console.error(`Error checking ${tableName} columns:`, error);
        }
        return [];
      }
      // Other errors might mean table doesn't exist or RLS issue
      return [];
    }

    // If we got data, extract column names
    if (data && data.length > 0) {
      return Object.keys(data[0]);
    }

    // Table is empty but queryable - try to infer columns by selecting known ones
    // This is a workaround for empty tables
    if (tableName === 'moments') {
      const { error: testError } = await supabase
        .from(tableName)
        .select('id, user_id, storage_path, created_at')
        .limit(0);
      if (!testError) {
        // Table has these columns (and likely more)
        return ['id', 'user_id', 'storage_path', 'description', 'duration_seconds', 'status', 'visibility', 'created_at', 'updated_at'];
      }
    } else if (tableName === 'moment_reactions') {
      const { error: testError } = await supabase
        .from(tableName)
        .select('id, moment_id, user_id, reaction, created_at')
        .limit(0);
      if (!testError) {
        return ['id', 'moment_id', 'user_id', 'reaction', 'created_at'];
      }
    } else if (tableName === 'moment_reports') {
      const { error: testError } = await supabase
        .from(tableName)
        .select('id, moment_id, reporter_id, reason, reason_text, created_at')
        .limit(0);
      if (!testError) {
        return ['id', 'moment_id', 'reporter_id', 'reason', 'reason_text', 'created_at'];
      }
    } else if (tableName === 'blocks') {
      const { error: testError } = await supabase
        .from(tableName)
        .select('id, blocker_id, blocked_id, created_at')
        .limit(0);
      if (!testError) {
        return ['id', 'blocker_id', 'blocked_id', 'created_at'];
      }
    } else if (tableName === 'device_tokens') {
      const { error: testError } = await supabase
        .from(tableName)
        .select('id, user_id, platform, token, is_active, created_at, updated_at')
        .limit(0);
      if (!testError) {
        return ['id', 'user_id', 'platform', 'token', 'is_active', 'created_at', 'updated_at'];
      }
    }

    // Table exists and is queryable but we can't infer columns
    // Return empty array but this doesn't mean columns don't exist
    return [];
  } catch (error) {
    if (__DEV__) {
      console.error(`Failed to check ${tableName} columns:`, error);
    }
    return [];
  }
}

/**
 * Checks for legacy moments that might have 'uri' instead of 'storage_path'
 */
export async function checkLegacyMoments(): Promise<number> {
  try {
    // Try to query with legacy 'uri' field
    const { data, error } = await supabase
      .from('moments')
      .select('id, uri')
      .limit(100);

    if (error) {
      // If error mentions 'uri' column doesn't exist, no legacy data
      return 0;
    }

    // Count moments that have uri but might not have storage_path
    return data?.filter((m: any) => m.uri && !m.storage_path).length || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Checks for moments without associated profiles (orphaned data)
 */
export async function checkOrphanedMoments(): Promise<number> {
  try {
    const { data: moments, error: momentsError } = await supabase
      .from('moments')
      .select('user_id')
      .limit(100);

    if (momentsError || !moments) {
      return 0;
    }

    const userIds = [...new Set(moments.map((m: any) => m.user_id))];
    
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .in('id', userIds);

    const profileIds = new Set(profiles?.map((p: any) => p.id) || []);
    const orphanedCount = moments.filter((m: any) => !profileIds.has(m.user_id)).length;

    return orphanedCount;
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to check orphaned moments:', error);
    }
    return 0;
  }
}

/**
 * Runs comprehensive database diagnostics
 * Use this to identify legacy data issues
 */
export async function runDatabaseDiagnostics(): Promise<DatabaseDiagnostics> {
  const issues: string[] = [];

  // Check if feed_moments view exists
  const feedMomentsViewExists = await checkFeedMomentsView();
  if (!feedMomentsViewExists) {
    issues.push('feed_moments view does not exist - create it or use fetchPublishedMoments() instead');
  }

  // Check table columns
  const momentsColumns = await getTableColumns('moments');
  const profilesColumns = await getTableColumns('profiles');

  // Check for legacy uri field in moments
  if (momentsColumns.includes('uri') && !momentsColumns.includes('storage_path')) {
    issues.push('moments table has legacy "uri" field but missing "storage_path" - migration needed');
  }

  // Check for missing required columns
  // Note: Empty array might mean table is empty, not that columns don't exist
  if (momentsColumns.length === 0) {
    // Try to verify table actually has columns by querying a known column
    const { error: testError } = await supabase
      .from('moments')
      .select('id')
      .limit(0);
    
    if (testError && (testError.message.includes('column') || testError.message.includes('does not exist'))) {
      issues.push('moments table missing required columns: id, user_id, created_at');
    }
    // If no error, table has columns but is empty - this is OK, don't add issue
  } else {
    const requiredMomentsColumns = ['id', 'user_id', 'created_at'];
    const missingMomentsColumns = requiredMomentsColumns.filter(
      (col) => !momentsColumns.includes(col)
    );
    if (missingMomentsColumns.length > 0) {
      issues.push(`moments table missing required columns: ${missingMomentsColumns.join(', ')}`);
    }
  }

  const requiredProfilesColumns = ['id', 'username'];
  const missingProfilesColumns = requiredProfilesColumns.filter(
    (col) => !profilesColumns.includes(col)
  );
  if (missingProfilesColumns.length > 0) {
    issues.push(`profiles table missing required columns: ${missingProfilesColumns.join(', ')}`);
  }

  // Check for legacy data
  const legacyMomentsCount = await checkLegacyMoments();
  if (legacyMomentsCount > 0) {
    issues.push(`Found ${legacyMomentsCount} moments with legacy "uri" field - consider migration`);
  }

  // Check for orphaned data
  const orphanedMomentsCount = await checkOrphanedMoments();
  if (orphanedMomentsCount > 0) {
    issues.push(`Found ${orphanedMomentsCount} moments without associated profiles - orphaned data`);
  }

  return {
    feedMomentsViewExists,
    momentsTableColumns: momentsColumns,
    profilesTableColumns: profilesColumns,
    legacyMomentsCount,
    orphanedMomentsCount,
    issues,
  };
}

/**
 * Logs database diagnostics to console (development only)
 */
export async function logDatabaseDiagnostics(): Promise<void> {
  if (!__DEV__) {
    return;
  }

  try {
    const diagnostics = await runDatabaseDiagnostics();
    
    console.log('=== Database Diagnostics ===');
    console.log('feed_moments view exists:', diagnostics.feedMomentsViewExists);
    console.log('moments table columns:', diagnostics.momentsTableColumns);
    console.log('profiles table columns:', diagnostics.profilesTableColumns);
    console.log('Legacy moments count:', diagnostics.legacyMomentsCount);
    console.log('Orphaned moments count:', diagnostics.orphanedMomentsCount);
    
    if (diagnostics.issues.length > 0) {
      console.warn('Issues found:');
      diagnostics.issues.forEach((issue) => console.warn('  -', issue));
    } else {
      console.log('No issues detected');
    }
    console.log('===========================');
  } catch (error) {
    logError('Failed to run database diagnostics', error);
  }
}

