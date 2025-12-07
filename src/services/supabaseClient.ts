/**
 * Supabase Client Configuration
 * 
 * Creates and exports a configured Supabase client instance for use throughout the app.
 * 
 * Environment Variables Required:
 * - EXPO_PUBLIC_SUPABASE_URL: Your Supabase project URL
 * - EXPO_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anonymous/public key
 * 
 * These should be set in your .env file and will be available at runtime.
 * Get your credentials from: https://app.supabase.com/project/_/settings/api
 * 
 * RLS (Row Level Security) Policy Assumptions:
 * 
 * All queries made through this client assume RLS is enabled and enforced server-side.
 * The client automatically includes the JWT token from auth.storage in all requests.
 * 
 * See docs/supabase-rls.md for detailed policy documentation:
 * - Profiles: Public read access, users can only modify their own profile
 * - Moments: Users can read public moments and their own moments (including private)
 * 
 * IMPORTANT: Never bypass RLS by using service role key in client code.
 * RLS is the primary security layer - client-side filtering is not sufficient.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Validates that required Supabase environment variables are present
 * @throws Error if required env vars are missing
 */
function validateSupabaseConfig(): void {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || url.trim() === '') {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_URL environment variable. ' +
      'Please set it in your .env file. ' +
      'Get your URL from: https://app.supabase.com/project/_/settings/api'
    );
  }

  if (!anonKey || anonKey.trim() === '') {
    throw new Error(
      'Missing EXPO_PUBLIC_SUPABASE_ANON_KEY environment variable. ' +
      'Please set it in your .env file. ' +
      'Get your anon key from: https://app.supabase.com/project/_/settings/api'
    );
  }

  // Basic URL validation
  try {
    new URL(url);
  } catch {
    throw new Error(
      `Invalid EXPO_PUBLIC_SUPABASE_URL format: "${url}". ` +
      'Expected a valid HTTPS URL (e.g., https://your-project.supabase.co)'
    );
  }
}

// Validate configuration before creating client
validateSupabaseConfig();

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Configured Supabase client instance
 * 
 * This client is ready to use for all database operations, authentication,
 * storage, and real-time subscriptions.
 * 
 * @example
 * ```ts
 * import { supabase } from '@/services/supabaseClient';
 * 
 * const { data, error } = await supabase
 *   .from('moments')
 *   .select('*');
 * ```
 */
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

