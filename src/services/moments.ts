/**
 * Moments Service
 *
 * Handles video upload to Supabase Storage and moment record creation.
 * Encapsulates the complete flow of uploading a moment video and creating a database record.
 *
 * RLS POLICY ASSUMPTIONS (see docs/supabase-rls.md):
 *
 * - moments table:
 *   - SELECT: Users can read public moments (visibility='public') and their own moments (user_id=auth.uid())
 *   - INSERT: Users can only insert moments with their own user_id (user_id must equal auth.uid())
 *   - UPDATE: Users can only update their own moments (user_id must equal auth.uid())
 *   - DELETE: Users can only delete their own moments (user_id must equal auth.uid())
 *
 * All queries assume RLS is enabled and enforced server-side.
 */

import { supabase } from './supabaseClient';
import * as FileSystem from 'expo-file-system/legacy'; // Use legacy import for readAsStringAsync
import { randomUUID } from 'expo-crypto';
import { getReactionsForMoments } from './reactions';
import { validateFeedMomentRow, logValidationErrors, validateMomentRecord } from '../utils/dataValidation';
import { logError } from '../utils/errorHandling';

export interface MomentRecord {
  id: string;
  user_id: string;
  storage_path: string;
  description: string | null;
  duration_seconds: number | null;
  status: 'pending_review' | 'approved' | 'rejected' | 'published';
  visibility: 'public' | 'private';
  created_at: string;
  updated_at: string;
}

export interface CreateMomentPayload {
  userId: string;
  storagePath: string;
  description?: string | null;
  durationSeconds?: number | null;
  status?: 'pending_review' | 'approved' | 'rejected' | 'published';
  visibility?: 'public' | 'private';
}

/**
 * Uploads a video file to Supabase Storage
 *
 * @param uri - Local file URI of the video
 * @param userId - Current user's ID
 * @returns Promise resolving to the storage path
 * @throws Error if upload fails
 */
export async function uploadMomentVideo(
  uri: string,
  userId: string
): Promise<{ storagePath: string }> {
  try {
    // Generate unique filename using expo-crypto randomUUID
    const uuid = randomUUID();
    const filename = `${uuid}.mp4`;
    const storagePath = `moments/${userId}/${filename}`;

    // Read file as base64
    const fileData = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Convert base64 to ArrayBuffer for React Native compatibility
    const byteCharacters = atob(fileData);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const arrayBuffer = byteArray.buffer;

    // Upload to Supabase Storage using ArrayBuffer
    const { data, error } = await supabase.storage
      .from('moments')
      .upload(storagePath, arrayBuffer, {
        contentType: 'video/mp4',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      if (__DEV__) {
        console.error('Supabase storage upload error:', error);
        console.error('Upload details:', {
          bucket: 'moments',
          storagePath,
          userId,
          pathFormat: `moments/${userId}/${filename}`,
          errorMessage: error.message,
          errorStatus: (error as any).statusCode,
        });
      }
      
      // Provide helpful error messages
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
        throw new Error(
          'Storage bucket "moments" not found. ' +
          'Please create it in Supabase Dashboard → Storage. ' +
          'See docs/supabase-storage-setup.md for instructions.'
        );
      }
      
      if (error.message.includes('row-level security') || error.message.includes('RLS')) {
        // More detailed RLS error message
        throw new Error(
          'Storage RLS policy violation. ' +
          `Upload path: moments/${userId}/${filename}. ` +
          `User ID: ${userId}. ` +
          'Please verify storage policies in Supabase Dashboard → Storage → Policies. ' +
          'The policy should allow: bucket_id = "moments" AND folder[1] = auth.uid()::text'
        );
      }
      
      throw new Error(`Failed to upload video: ${error.message}`);
    }

    if (!data) {
      throw new Error('Upload succeeded but no data returned');
    }

    return { storagePath: data.path };
  } catch (error) {
    logError('uploadMomentVideo failed:', error);
    throw error;
  }
}

/**
 * Deletes a video file from Supabase Storage
 *
 * @param storagePath - Path to the file in storage
 * @throws Error if deletion fails
 */
export async function deleteMomentVideo(storagePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('moments')
      .remove([storagePath]);

    if (error) {
      logError('Supabase storage delete error:', error);
      throw new Error(`Failed to delete video: ${error.message}`);
    }
  } catch (error) {
    logError('deleteMomentVideo failed:', error);
    throw error;
  }
}

/**
 * Creates a moment record in the database
 *
 * RLS POLICY: INSERT policy on 'moments' table ensures user_id matches auth.uid().
 * The server will reject inserts if the user_id in the payload does not match the authenticated user's ID.
 *
 * @param payload - Moment data to insert
 * @returns Promise resolving to the created moment record
 * @throws Error if creation fails
 */
export async function createMomentRecord(
  payload: CreateMomentPayload
): Promise<MomentRecord> {
  try {
    // Validate incoming payload before inserting
    const { isValid, errors, sanitized } = validateMomentRecord(payload);
    if (!isValid) {
      logError('Invalid moment record payload:', errors);
      throw new Error(`Invalid moment data: ${errors.join(', ')}`);
    }

    const { data, error } = await supabase
      .from('moments')
      .insert({
        user_id: sanitized.userId,
        storage_path: sanitized.storagePath,
        description: sanitized.description ?? null,
        // Round duration to 3 decimal places for database compatibility
        duration_seconds: sanitized.durationSeconds 
          ? Math.round(sanitized.durationSeconds * 1000) / 1000 
          : null,
        status: sanitized.status ?? 'pending_review',
        visibility: sanitized.visibility ?? 'public',
      })
      .select()
      .single();

    if (error) {
      logError('Supabase createMomentRecord error:', error);
      throw new Error(`Failed to create moment record: ${error.message}`);
    }

    if (!data) {
      throw new Error('Create succeeded but no data returned');
    }

    return data as MomentRecord;
  } catch (error) {
    logError('createMomentRecord failed:', error);
    throw error;
  }
}

/**
 * Gets the public URL for a storage path
 *
 * @param storagePath - Path to the file in storage
 * @returns Public URL for the file
 */
export function getMomentPublicUrl(storagePath: string): string {
  const { data } = supabase.storage.from('moments').getPublicUrl(storagePath);
  return data.publicUrl;
}

/**
 * Feed Moment with profile data and reaction data
 * Used for displaying moments in the feed
 */
export interface FeedMoment {
  id: string;
  storage_path: string;
  video_url: string; // Public URL from storage
  description: string | null;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string | null;
  like_count: number;
  has_liked: boolean;
}

/**
 * Feed Moments View Row
 * Represents a row from the feed_moments database view
 */
export interface FeedMomentsViewRow {
  id: string;
  storage_path: string;
  description: string | null;
  created_at: string;
  user_id: string;
  username: string;
  display_name: string | null;
  video_url: string; // Public URL for the video
  like_count: number | null; // Can be null if no likes
  has_liked: boolean | null; // May be null if user is not authenticated
}

/**
 * Fetches feed moments from the feed_moments view
 *
 * This is the primary data source for the feed. The view combines:
 * - moments table (with visibility='public' and status='published'/'approved')
 * - profiles table (username, display_name)
 * - moment_reactions table (like_count, has_liked for current user)
 *
 * RLS POLICY: The view respects RLS policies on underlying tables:
 * - Only public moments are included (visibility='public')
 * - Only published/approved moments are included
 * - Profile data is publicly readable
 * - Reaction data respects RLS on moment_reactions
 *
 * @param limit - Maximum number of moments to fetch (default: 50)
 * @param blockedUserIds - Array of user IDs to exclude from results (default: [])
 * @returns Promise resolving to array of feed moments ready for display
 * @throws Error if fetch fails
 */
export async function fetchFeedMoments(
  limit: number = 50,
  blockedUserIds: string[] = []
): Promise<FeedMoment[]> {
  try {
    // Query the feed_moments view directly
    // RLS policies on underlying tables ensure only authorized data is returned
    let query = supabase
      .from('feed_moments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data, error } = await query;

    if (error) {
      logError('Supabase fetchFeedMoments error:', error);
      // If view doesn't exist, fall back to fetching from tables
      if (error.code === '42P01') { // 'undefined_table'
        if (__DEV__) {
          console.warn('feed_moments view not found, falling back to fetchPublishedMoments.');
        }
        return fetchPublishedMoments(limit, supabase.auth.user()?.id || null, blockedUserIds);
      }
      throw new Error(`Failed to fetch feed moments: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Filter out blocked users
    const blockedUserIdsSet = new Set(blockedUserIds);
    const feedMoments: FeedMoment[] = [];

    for (const row of data) {
      if (blockedUserIdsSet.has(row.user_id)) {
        continue;
      }
      try {
        const { isValid, errors, sanitized } = validateFeedMomentRow(row);
        if (!isValid) {
          logValidationErrors('fetchFeedMoments', errors, row);
          continue; // Skip invalid rows
        }

        feedMoments.push({
          id: sanitized.id,
          storage_path: sanitized.storage_path,
          video_url: sanitized.video_url, // Use video_url directly from the view
          description: sanitized.description ?? null,
          created_at: sanitized.created_at,
          user_id: sanitized.user_id,
          username: sanitized.username || 'unknown',
          display_name: sanitized.display_name ?? null,
          like_count: sanitized.like_count || 0,
          has_liked: sanitized.has_liked ?? false,
        });
      } catch (error) {
        // Skip rows that fail to process (e.g., invalid storage_path)
        logError('Failed to process feed moment row:', error, row);
        continue;
      }
    }

    return feedMoments;
  } catch (error) {
    logError('fetchFeedMoments failed:', error);
    throw error;
  }
}

/**
 * Fetches a user's own moments, including private ones.
 *
 * RLS POLICY: SELECT policy on 'moments' table allows reading moments where user_id = auth.uid().
 * This query explicitly filters by auth.uid() to retrieve all moments (public or private) belonging to the current user.
 *
 * @param userId - The ID of the user whose moments to fetch (must match auth.uid() due to RLS).
 * @param limit - Maximum number of moments to fetch (default: 50).
 * @returns Promise resolving to an array of MomentRecord.
 * @throws Error if fetch fails or userId does not match authenticated user.
 */
export async function fetchUserMoments(
  userId: string,
  limit: number = 50
): Promise<MomentRecord[]> {
  try {
    // RLS: SELECT policy ensures only moments belonging to auth.uid() are returned.
    const { data, error } = await supabase
      .from('moments')
      .select('*')
      .eq('user_id', userId) // This filter is enforced by RLS
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      logError('Supabase fetchUserMoments error:', error);
      throw new Error(`Failed to fetch user moments: ${error.message}`);
    }

    // Validate and sanitize fetched data
    const validatedMoments: MomentRecord[] = [];
    for (const row of data || []) {
      try {
        const { isValid, errors, sanitized } = validateMomentRecord(row);
        if (!isValid) {
          logError('Invalid moment record from fetchUserMoments:', errors, row);
          continue;
        }
        validatedMoments.push(sanitized as MomentRecord);
      } catch (error) {
        logError('Failed to process user moment row:', error, row);
        continue;
      }
    }

    return validatedMoments;
  } catch (error) {
    logError('fetchUserMoments failed:', error);
    throw error;
  }
}

/**
 * @deprecated Use `fetchFeedMoments` for the main feed.
 * This function is kept for reference but is less efficient than the `feed_moments` view.
 *
 * Fetches published moments from Supabase with profile data and reaction data
 */
export async function fetchPublishedMoments(
  limit: number = 50,
  currentUserId: string | null = null,
  blockedUserIds: string[] = []
): Promise<FeedMoment[]> {
  try {
    // RLS: SELECT policy allows reading public moments from any user
    const { data: momentsData, error: momentsError } = await supabase
      .from('moments')
      .select('id, user_id, storage_path, description, created_at')
      .eq('visibility', 'public')
      .in('status', ['published', 'pending_review', 'approved'])
      .order('created_at', { ascending: false })
      .limit(limit);

    if (momentsError) {
      logError('Supabase fetchPublishedMoments error:', momentsError);
      throw new Error(`Failed to fetch moments: ${momentsError.message}`);
    }

    if (!momentsData || momentsData.length === 0) {
      return [];
    }

    // Validate and sanitize fetched moment data
    const validatedMomentsData: MomentRecord[] = [];
    for (const row of momentsData) {
      try {
        const { isValid, errors, sanitized } = validateMomentRecord(row);
        if (!isValid) {
          logError('Invalid moment record from fetchPublishedMoments:', errors, row);
          continue;
        }
        validatedMomentsData.push(sanitized as MomentRecord);
      } catch (error) {
        logError('Failed to process moment row for validation:', error, row);
        continue;
      }
    }

    // Extract unique user IDs
    const userIds = [...new Set(validatedMomentsData.map((m) => m.user_id))];

    // Fetch profiles
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', userIds);

    if (profilesError) {
      logError('Supabase fetchPublishedMoments profiles error:', profilesError);
    }

    // Create profile map
    const profileMap = new Map<string, { username: string; display_name: string | null }>();
    if (profilesData) {
      profilesData.forEach((profile) => {
        profileMap.set(profile.id, {
          username: profile.username,
          display_name: profile.display_name,
        });
      });
    }

    // Fetch reaction data
    const momentIds = validatedMomentsData.map((m) => m.id);
    const reactionsMap = await getReactionsForMoments(momentIds, currentUserId);

    // Filter out blocked users
    const blockedUserIdsSet = new Set(blockedUserIds);
    const feedMoments: FeedMoment[] = [];

    for (const moment of validatedMomentsData) {
      if (blockedUserIdsSet.has(moment.user_id)) {
        continue;
      }

      const profile = profileMap.get(moment.user_id) || {
        username: 'unknown',
        display_name: null,
      };

      const reactionData = reactionsMap.get(moment.id) || {
        likeCount: 0,
        hasLiked: false,
      };

      const videoUrl = moment.storage_path
        ? getMomentPublicUrl(moment.storage_path)
        : null;

      if (!videoUrl) {
        logError('Moment has no valid video URL (storage_path missing):', moment);
        continue;
      }

      feedMoments.push({
        id: moment.id,
        storage_path: moment.storage_path,
        video_url: videoUrl,
        description: moment.description,
        created_at: moment.created_at,
        user_id: moment.user_id,
        username: profile.username,
        display_name: profile.display_name,
        like_count: reactionData.likeCount,
        has_liked: reactionData.hasLiked,
      });
    }

    return feedMoments;
  } catch (error) {
    logError('fetchPublishedMoments failed:', error);
    throw error;
  }
}
