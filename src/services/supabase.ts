/**
 * Supabase Client Configuration
 * Creates and exports the Supabase client instance
 * 
 * Configuration is loaded from environment variables:
 * - EXPO_PUBLIC_SUPABASE_URL (set in .env file)
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY (set in .env file)
 * 
 * To set up:
 * 1. Copy .env.example to .env
 * 2. Fill in your Supabase project URL and anon key
 * 3. Get these from: https://app.supabase.com/project/_/settings/api
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

// Get Supabase config from environment variables
// These are set in .env file and exposed via app.config.js -> Constants.expoConfig.extra
const SUPABASE_URL =
  Constants.expoConfig?.extra?.supabaseUrl ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://your-project.supabase.co';

const SUPABASE_ANON_KEY =
  Constants.expoConfig?.extra?.supabaseAnonKey ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'your-anon-key';

// Validate configuration
if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
  console.warn(
    '⚠️  Supabase URL not configured. Set EXPO_PUBLIC_SUPABASE_URL in .env file'
  );
}

if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.includes('your-anon-key')) {
  console.warn(
    '⚠️  Supabase anon key not configured. Set EXPO_PUBLIC_SUPABASE_ANON_KEY in .env file'
  );
}

/**
 * Supabase client instance
 * Use this for all database operations
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

