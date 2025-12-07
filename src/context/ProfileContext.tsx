/**
 * Profile Context
 * 
 * Manages user profile data from Supabase profiles table.
 * Provides profile fetching, loading states, and error handling.
 * 
 * RLS POLICY ASSUMPTIONS (see docs/supabase-rls.md):
 * 
 * - SELECT: All authenticated users can read any profile (public read access)
 * - INSERT: Users can only insert profiles with their own id (id must equal auth.uid())
 * - UPDATE: Users can only update their own profile (id must equal auth.uid())
 * - DELETE: Users can only delete their own profile (id must equal auth.uid())
 * 
 * All queries assume RLS is enabled and enforced server-side.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';
import { validateProfile, logValidationErrors } from '../utils/dataValidation';

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  created_at: string;
  updated_at: string;
}

interface ProfileContextValue {
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: { display_name?: string | null; bio?: string | null }) => Promise<{ error: Error | null }>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // RLS: SELECT policy allows reading any profile (public read access)
      // Filtering by id ensures we get the specific user's profile
      // RLS will allow this query for any authenticated user
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id) // RLS allows reading any profile, so this works
        .single();

      if (fetchError) {
        // If no profile found, that's okay - user needs onboarding
        if (fetchError.code === 'PGRST116') {
          setProfile(null);
        } else {
          throw fetchError;
        }
      } else if (data) {
        // Validate profile data (handles legacy data gracefully)
        const validation = validateProfile(data);
        
        if (!validation.isValid) {
          logValidationErrors('fetchProfile', validation.errors, data);
          // Use sanitized data if possible, otherwise set to null
          if (validation.sanitized.id && validation.sanitized.username) {
            setProfile(validation.sanitized as Profile);
          } else {
            setProfile(null);
          }
        } else {
          setProfile(validation.sanitized as Profile);
        }
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch profile');
      setError(error);
      console.error('Profile fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Clear profile when user signs out
  useEffect(() => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      setError(null);
    }
  }, [user]);

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(async (updates: { display_name?: string | null; bio?: string | null }) => {
    if (!user) {
      const error = new Error('User not authenticated');
      if (__DEV__) {
        console.error('updateProfile: User not authenticated');
      }
      return { error };
    }

    try {
      // Debug: Check authentication before update
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !authUser) {
        const error = new Error(`Authentication error: ${authError?.message || 'No authenticated user'}`);
        if (__DEV__) {
          console.error('updateProfile: Auth check failed:', { authError, authUser, userId: user.id });
        }
        return { error };
      }

      if (user.id !== authUser.id) {
        const error = new Error(`User ID mismatch: context user ${user.id} != auth user ${authUser.id}`);
        if (__DEV__) {
          console.error('updateProfile: User ID mismatch:', { contextUserId: user.id, authUserId: authUser.id });
        }
        return { error };
      }

      if (__DEV__) {
        console.log('updateProfile: Updating profile:', {
          userId: user.id,
          updates,
        });
      }

      // RLS: UPDATE policy requires id = auth.uid()
      // Filtering by .eq('id', user.id) ensures we only update own profile
      // RLS will reject if user.id doesn't match auth.uid()
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: updates.display_name ?? null,
          bio: updates.bio ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id) // Must equal auth.uid() for RLS to allow update
        .select()
        .single();

      if (updateError) {
        if (__DEV__) {
          console.error('updateProfile: Supabase update error:', {
            error: updateError,
            code: updateError.code,
            message: updateError.message,
            details: updateError.details,
            hint: updateError.hint,
            userId: user.id,
            updates,
          });
        }
        throw updateError;
      }

      if (!data) {
        const error = new Error('Update succeeded but no data returned');
        if (__DEV__) {
          console.error('updateProfile: No data returned');
        }
        throw error;
      }

      // Validate updated data
      const validation = validateProfile(data);
      if (!validation.isValid) {
        logValidationErrors('updateProfile', validation.errors, data);
        // Use sanitized data if possible
        if (validation.sanitized.id && validation.sanitized.username) {
          setProfile(validation.sanitized as Profile);
        } else {
          // If validation fails, refresh from server
          await fetchProfile();
        }
      } else {
        setProfile(validation.sanitized as Profile);
      }

      if (__DEV__) {
        console.log('updateProfile: Successfully updated profile:', data);
      }

      return { error: null };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(`Failed to update profile: ${err instanceof Error ? err.message : String(err)}`);
      setError(error);
      if (__DEV__) {
        console.error('updateProfile: Exception caught:', {
          error,
          originalError: err,
          userId: user?.id,
        });
      }
      return { error };
    }
  }, [user, fetchProfile]);

  const value: ProfileContextValue = {
    profile,
    isLoading,
    error,
    refreshProfile,
    updateProfile,
  };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
}

