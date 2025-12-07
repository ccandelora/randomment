/**
 * Reactions Service
 * 
 * Handles moment reactions (likes) using Supabase moment_reactions table.
 * Encapsulates like/unlike operations with optimistic update support.
 */

import { supabase } from './supabaseClient';

export interface MomentReaction {
  id: string;
  moment_id: string;
  user_id: string;
  reaction: 'like' | 'love' | 'laugh' | 'wow' | 'sad' | 'angry';
  created_at: string;
}

/**
 * Toggles a like reaction for a moment
 * If user hasn't liked, creates a like reaction
 * If user has already liked, removes the reaction
 * 
 * @param momentId - ID of the moment
 * @param userId - ID of the user performing the action
 * @returns Promise resolving to true if liked, false if unliked
 * @throws Error if operation fails
 */
export async function toggleLike(
  momentId: string,
  userId: string
): Promise<boolean> {
  try {
    // Check if user has already liked this moment
    const { data: existingReaction, error: checkError } = await supabase
      .from('moment_reactions')
      .select('id')
      .eq('moment_id', momentId)
      .eq('user_id', userId)
      .eq('reaction', 'like')
      .maybeSingle();

    if (checkError && checkError.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Supabase toggleLike check error:', checkError);
      throw new Error(`Failed to check existing reaction: ${checkError.message}`);
    }

    if (existingReaction) {
      // User has liked, so unlike (delete the reaction)
      const { error: deleteError } = await supabase
        .from('moment_reactions')
        .delete()
        .eq('id', existingReaction.id);

      if (deleteError) {
        console.error('Supabase toggleLike delete error:', deleteError);
        throw new Error(`Failed to unlike moment: ${deleteError.message}`);
      }

      return false; // Now unliked
    } else {
      // User hasn't liked, so like (insert reaction)
      const { error: insertError } = await supabase
        .from('moment_reactions')
        .insert({
          moment_id: momentId,
          user_id: userId,
          reaction: 'like',
        });

      if (insertError) {
        console.error('Supabase toggleLike insert error:', insertError);
        throw new Error(`Failed to like moment: ${insertError.message}`);
      }

      return true; // Now liked
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('toggleLike failed:', error.message);
      throw error;
    }
    console.error('toggleLike failed with unknown error:', error);
    throw new Error('Failed to toggle like: Unknown error');
  }
}

/**
 * Gets like count for a moment
 * 
 * @param momentId - ID of the moment
 * @returns Promise resolving to the like count
 */
export async function getLikeCount(momentId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('moment_reactions')
      .select('*', { count: 'exact', head: true })
      .eq('moment_id', momentId)
      .eq('reaction', 'like');

    if (error) {
      console.error('Supabase getLikeCount error:', error);
      return 0; // Return 0 on error rather than throwing
    }

    return count || 0;
  } catch (error) {
    console.error('getLikeCount failed:', error);
    return 0;
  }
}

/**
 * Checks if a user has liked a moment
 * 
 * @param momentId - ID of the moment
 * @param userId - ID of the user
 * @returns Promise resolving to true if user has liked, false otherwise
 */
export async function hasUserLiked(
  momentId: string,
  userId: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('moment_reactions')
      .select('id')
      .eq('moment_id', momentId)
      .eq('user_id', userId)
      .eq('reaction', 'like')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 means no rows found, which is fine
      console.error('Supabase hasUserLiked error:', error);
      return false; // Return false on error rather than throwing
    }

    return !!data;
  } catch (error) {
    console.error('hasUserLiked failed:', error);
    return false;
  }
}

/**
 * Gets like counts and user like status for multiple moments
 * 
 * @param momentIds - Array of moment IDs
 * @param userId - ID of the current user
 * @returns Promise resolving to a map of moment_id -> { likeCount, hasLiked }
 */
export async function getReactionsForMoments(
  momentIds: string[],
  userId: string | null
): Promise<Map<string, { likeCount: number; hasLiked: boolean }>> {
  try {
    if (momentIds.length === 0) {
      return new Map();
    }

    // Fetch all like reactions for these moments
    const { data: reactions, error: reactionsError } = await supabase
      .from('moment_reactions')
      .select('moment_id, user_id')
      .eq('reaction', 'like')
      .in('moment_id', momentIds);

    if (reactionsError) {
      console.error('Supabase getReactionsForMoments error:', reactionsError);
      // Return empty map on error
      return new Map();
    }

    // Build map of moment_id -> { likeCount, hasLiked }
    const reactionsMap = new Map<string, { likeCount: number; hasLiked: boolean }>();

    // Initialize all moments with 0 likes and false hasLiked
    momentIds.forEach((momentId) => {
      reactionsMap.set(momentId, { likeCount: 0, hasLiked: false });
    });

    // Count likes and check if user has liked
    if (reactions) {
      reactions.forEach((reaction) => {
        const current = reactionsMap.get(reaction.moment_id) || {
          likeCount: 0,
          hasLiked: false,
        };
        current.likeCount += 1;
        if (userId && reaction.user_id === userId) {
          current.hasLiked = true;
        }
        reactionsMap.set(reaction.moment_id, current);
      });
    }

    return reactionsMap;
  } catch (error) {
    console.error('getReactionsForMoments failed:', error);
    return new Map();
  }
}

