/**
 * Device Tokens Service
 * 
 * Handles registration and management of push notification device tokens.
 * Stores device tokens in Supabase for sending push notifications.
 * 
 * RLS POLICY ASSUMPTIONS (see docs/supabase-rls.md):
 * - Users can only insert/update their own device tokens (user_id = auth.uid())
 * - Users can read their own device tokens
 */

import { supabase } from './supabaseClient';

export type Platform = 'ios' | 'android';

export interface DeviceToken {
  id: string;
  user_id: string;
  platform: Platform;
  token: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpsertDeviceTokenPayload {
  userId: string;
  platform: Platform;
  token: string;
}

/**
 * Upserts a device token for a user
 * 
 * RLS POLICY: INSERT/UPDATE policy requires user_id = auth.uid()
 * - This function assumes payload.userId equals the authenticated user's ID
 * - RLS will reject if user_id doesn't match auth.uid()
 * 
 * Prevents duplicate tokens by checking if (user_id, token) already exists.
 * Updates existing record or inserts new one.
 * 
 * @param payload - Device token data (user_id must match authenticated user)
 * @returns Promise resolving to the upserted device token record
 * @throws Error if upsert fails (including RLS violations)
 */
export async function upsertDeviceToken(
  payload: UpsertDeviceTokenPayload
): Promise<DeviceToken> {
  try {
    // Check if token already exists for this user
    const { data: existing, error: checkError } = await supabase
      .from('device_tokens')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('token', payload.token)
      .maybeSingle();

    if (checkError && __DEV__) {
      console.warn('Error checking for existing token:', checkError.message);
    }

    const tokenData = {
      user_id: payload.userId, // Must equal auth.uid() for RLS to allow
      platform: payload.platform,
      token: payload.token,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    let data: DeviceToken | null = null;
    let error: any = null;

    if (existing) {
      // Update existing token
      const result = await supabase
        .from('device_tokens')
        .update(tokenData)
        .eq('id', existing.id)
        .select()
        .single();
      
      data = result.data as DeviceToken | null;
      error = result.error;
    } else {
      // Insert new token
      const result = await supabase
        .from('device_tokens')
        .insert(tokenData)
        .select()
        .single();
      
      data = result.data as DeviceToken | null;
      error = result.error;
    }

    if (error) {
      if (__DEV__) {
        console.error('Supabase upsertDeviceToken error:', error);
      }
      throw new Error(`Failed to upsert device token: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upsert succeeded but no data returned');
    }

    return data as DeviceToken;
  } catch (error) {
    if (error instanceof Error) {
      if (__DEV__) {
        console.error('upsertDeviceToken failed:', error.message);
      }
      throw error;
    }
    if (__DEV__) {
      console.error('upsertDeviceToken failed with unknown error:', error);
    }
    throw new Error('Failed to upsert device token: Unknown error');
  }
}

/**
 * Deactivates a device token (marks as inactive)
 * 
 * RLS POLICY: UPDATE policy requires user_id = auth.uid()
 * 
 * @param userId - ID of the authenticated user (must match auth.uid())
 * @param platform - Platform to deactivate token for
 * @throws Error if update fails
 */
export async function deactivateDeviceToken(
  userId: string,
  platform: Platform
): Promise<void> {
  try {
    // RLS: UPDATE policy checks that user_id = auth.uid()
    const { error } = await supabase
      .from('device_tokens')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId) // Must equal auth.uid() for RLS to allow
      .eq('platform', platform);

    if (error) {
      if (__DEV__) {
        console.error('Supabase deactivateDeviceToken error:', error);
      }
      throw new Error(`Failed to deactivate device token: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      if (__DEV__) {
        console.error('deactivateDeviceToken failed:', error.message);
      }
      throw error;
    }
    if (__DEV__) {
      console.error('deactivateDeviceToken failed with unknown error:', error);
    }
    throw new Error('Failed to deactivate device token: Unknown error');
  }
}

