/**
 * Pending Navigation Intent Storage
 * 
 * Stores navigation intents that should be executed after user authentication.
 * Used when push notifications arrive before the user is logged in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const PENDING_NAVIGATION_KEY = 'pending_navigation_intent';

export interface PendingNavigationIntent {
  type: 'moment_window';
  timestamp: number;
}

/**
 * Stores a pending navigation intent
 */
export async function storePendingNavigation(intent: PendingNavigationIntent): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_NAVIGATION_KEY, JSON.stringify(intent));
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to store pending navigation:', error);
    }
  }
}

/**
 * Retrieves and clears the pending navigation intent
 */
export async function getAndClearPendingNavigation(): Promise<PendingNavigationIntent | null> {
  try {
    const stored = await AsyncStorage.getItem(PENDING_NAVIGATION_KEY);
    if (!stored) {
      return null;
    }

    const intent = JSON.parse(stored) as PendingNavigationIntent;
    
    // Clear the stored intent
    await AsyncStorage.removeItem(PENDING_NAVIGATION_KEY);
    
    // Only return intents that are less than 1 hour old
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    if (intent.timestamp < oneHourAgo) {
      return null; // Intent is too old, ignore it
    }

    return intent;
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to get pending navigation:', error);
    }
    return null;
  }
}

/**
 * Clears any pending navigation intent
 */
export async function clearPendingNavigation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_NAVIGATION_KEY);
  } catch (error) {
    if (__DEV__) {
      console.error('Failed to clear pending navigation:', error);
    }
  }
}

