/**
 * Profile Query Helpers
 * 
 * Helper functions for querying profiles with RLS policy awareness.
 * All queries assume RLS is enabled and enforced server-side.
 * 
 * RLS POLICY ASSUMPTIONS (see docs/supabase-rls.md):
 * - SELECT: All authenticated users can read any profile (public read access)
 * - INSERT: Users can only insert profiles with their own id (id = auth.uid())
 * - UPDATE: Users can only update their own profile (id = auth.uid())
 * - DELETE: Users can only delete their own profile (id = auth.uid())
 */

import { supabase } from './supabaseClient';
import { Profile } from '../context/ProfileContext';

/**
 * Fetches a profile by username
 * 
 * RLS POLICY: SELECT policy allows reading any profile
 * - Any authenticated user can read any profile
 * - This query will work as long as the user is authenticated
 * 
 * @param username - Username to look up (case-insensitive)
 * @returns Promise resolving to profile or null if not found
 * @throws Error if query fails
 */
export async function getProfileByUsername(username: string): Promise<Profile | null> {
  try {
    // RLS: SELECT policy allows reading any profile
    // This query will return the profile if it exists and user is authenticated
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data as Profile;
  } catch (error) {
    if (error instanceof Error) {
      console.error('getProfileByUsername failed:', error.message);
      throw error;
    }
    throw new Error('Failed to fetch profile by username: Unknown error');
  }
}

/**
 * Fetches the current user's own profile
 * 
 * RLS POLICY: SELECT policy allows reading any profile
 * - Filtering by id = auth.uid() ensures we get the authenticated user's profile
 * - RLS allows this query for any authenticated user
 * 
 * @param userId - ID of the authenticated user (must match auth.uid())
 * @returns Promise resolving to profile or null if not found
 * @throws Error if query fails
 */
export async function getCurrentUserProfile(userId: string): Promise<Profile | null> {
  try {
    // RLS: SELECT policy allows reading any profile
    // Filtering by id ensures we get the specific user's profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId) // RLS allows reading any profile, so this works
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return data as Profile;
  } catch (error) {
    if (error instanceof Error) {
      console.error('getCurrentUserProfile failed:', error.message);
      throw error;
    }
    throw new Error('Failed to fetch current user profile: Unknown error');
  }
}

/**
 * Checks if a username is available (not taken)
 * 
 * RLS POLICY: SELECT policy allows reading any profile
 * - This query checks if a username exists
 * - RLS allows authenticated users to read any profile, so this works
 * 
 * @param username - Username to check (case-insensitive)
 * @returns Promise resolving to true if available, false if taken
 * @throws Error if query fails
 */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  try {
    // RLS: SELECT policy allows reading any profile
    // This query checks if username exists
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      throw error;
    }

    // If data exists, username is taken
    return !data;
  } catch (error) {
    if (error instanceof Error) {
      console.error('isUsernameAvailable failed:', error.message);
      throw error;
    }
    throw new Error('Failed to check username availability: Unknown error');
  }
}

