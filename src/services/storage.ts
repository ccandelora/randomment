/**
 * Local storage service for persisting moments
 * Uses AsyncStorage for simple key-value persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Moment } from '../types';

const MOMENTS_STORAGE_KEY = 'moments';

/**
 * Save a moment to local storage
 */
export async function saveMoment(moment: Moment): Promise<void> {
  try {
    const moments = await getMoments();
    const updatedMoments = [moment, ...moments];
    await AsyncStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(updatedMoments));
  } catch (error) {
    console.error('Failed to save moment:', error);
    throw error;
  }
}

/**
 * Retrieve all moments from local storage
 * Returns empty array on error to prevent app crashes
 */
export async function getMoments(): Promise<Moment[]> {
  try {
    const data = await AsyncStorage.getItem(MOMENTS_STORAGE_KEY);
    if (!data) {
      return [];
    }
    const parsed = JSON.parse(data);
    
    // Validate that we got an array
    if (!Array.isArray(parsed)) {
      console.warn('Invalid moments data format in storage, returning empty array');
      return [];
    }
    
    // Validate each moment has required fields
    const validMoments = parsed.filter((m: unknown): m is Moment => {
      return (
        typeof m === 'object' &&
        m !== null &&
        'id' in m &&
        'uri' in m &&
        'createdAt' in m &&
        typeof (m as Moment).id === 'string' &&
        typeof (m as Moment).uri === 'string' &&
        typeof (m as Moment).createdAt === 'string'
      );
    });
    
    if (validMoments.length !== parsed.length) {
      console.warn('Some moments had invalid format and were filtered out');
    }
    
    return validMoments;
  } catch (error) {
    // If loading fails, return empty array instead of crashing
    console.error('Failed to get moments from storage:', error);
    return [];
  }
}

/**
 * Delete a moment by ID
 */
export async function deleteMoment(momentId: string): Promise<void> {
  try {
    const moments = await getMoments();
    const filteredMoments = moments.filter((m) => m.id !== momentId);
    await AsyncStorage.setItem(MOMENTS_STORAGE_KEY, JSON.stringify(filteredMoments));
  } catch (error) {
    console.error('Failed to delete moment:', error);
    throw error;
  }
}

/**
 * Clear all moments (useful for testing or reset)
 */
export async function clearAllMoments(): Promise<void> {
  try {
    await AsyncStorage.removeItem(MOMENTS_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear moments:', error);
    throw error;
  }
}

/**
 * Clear all local data stored in AsyncStorage
 * This includes moments and any other app-specific data
 * Note: Supabase auth session is managed separately by Supabase client
 */
export async function clearAllLocalData(): Promise<void> {
  try {
    // Clear moments
    await AsyncStorage.removeItem(MOMENTS_STORAGE_KEY);
    
    // Add any other AsyncStorage keys here as needed
    // Example: await AsyncStorage.removeItem('OTHER_KEY');
    
    // Note: Supabase auth uses AsyncStorage with keys like:
    // - `sb-${projectRef}-auth-token`
    // We could clear those too, but it's better to use signOut() for auth
    // If you want to clear Supabase auth data, use supabase.auth.signOut() instead
    
    console.log('All local data cleared successfully');
  } catch (error) {
    console.error('Failed to clear all local data:', error);
    throw error;
  }
}

