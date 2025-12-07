/**
 * Blocks Service
 * 
 * Handles user blocking using Supabase blocks table.
 * Allows users to block other users to hide their content.
 */

import { supabase } from './supabaseClient';

export interface Block {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

/**
 * Blocks a user
 * 
 * @param blockerId - ID of the user doing the blocking
 * @param blockedId - ID of the user being blocked
 * @returns Promise resolving to the created block record
 * @throws Error if blocking fails
 */
export async function blockUser(
  blockerId: string,
  blockedId: string
): Promise<Block> {
  try {
    // Check if already blocked
    const { data: existingBlock } = await supabase
      .from('blocks')
      .select('id')
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId)
      .maybeSingle();

    if (existingBlock) {
      // Already blocked, return existing block
      return existingBlock as Block;
    }

    const { data, error } = await supabase
      .from('blocks')
      .insert({
        blocker_id: blockerId,
        blocked_id: blockedId,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase blockUser error:', error);
      throw new Error(`Failed to block user: ${error.message}`);
    }

    if (!data) {
      throw new Error('Block creation succeeded but no data returned');
    }

    return data as Block;
  } catch (error) {
    if (error instanceof Error) {
      console.error('blockUser failed:', error.message);
      throw error;
    }
    console.error('blockUser failed with unknown error:', error);
    throw new Error('Failed to block user: Unknown error');
  }
}

/**
 * Gets list of blocked user IDs for a user
 * 
 * @param userId - ID of the user
 * @returns Promise resolving to array of blocked user IDs
 */
export async function getBlockedUserIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('blocks')
      .select('blocked_id')
      .eq('blocker_id', userId);

    if (error) {
      console.error('Supabase getBlockedUserIds error:', error);
      return []; // Return empty array on error
    }

    return data?.map((block) => block.blocked_id) || [];
  } catch (error) {
    console.error('getBlockedUserIds failed:', error);
    return [];
  }
}

/**
 * Unblocks a user
 * 
 * @param blockerId - ID of the user doing the unblocking
 * @param blockedId - ID of the user being unblocked
 * @returns Promise resolving when unblock is complete
 */
export async function unblockUser(
  blockerId: string,
  blockedId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', blockerId)
      .eq('blocked_id', blockedId);

    if (error) {
      console.error('Supabase unblockUser error:', error);
      throw new Error(`Failed to unblock user: ${error.message}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error('unblockUser failed:', error.message);
      throw error;
    }
    console.error('unblockUser failed with unknown error:', error);
    throw new Error('Failed to unblock user: Unknown error');
  }
}

