/**
 * Push Notifications Hook
 * 
 * Minimal development-stage push notification setup using expo-notifications.
 * 
 * Features:
 * - Requests notification permissions
 * - Gets Expo push token
 * - Handles permission denial gracefully
 * - Upserts device token to Supabase device_tokens table
 * - Safe for React strict mode (prevents duplicate registrations)
 * 
 * Only runs when user is authenticated and profile onboarding is complete.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { upsertDeviceToken } from '../services/deviceTokens';

/**
 * Configure notification handler behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface UsePushNotificationsReturn {
  pushToken: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing push notifications
 * 
 * Automatically registers device token when:
 * - User is authenticated
 * - User has completed profile onboarding
 * - Notification permissions are granted
 * 
 * Safe for React strict mode - uses ref to prevent duplicate registrations.
 * 
 * @returns Object with pushToken, isLoading, and error
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Prevent duplicate registrations (React strict mode safety)
  const isRegisteringRef = useRef(false);
  const lastUserIdRef = useRef<string | null>(null);
  const lastTokenRef = useRef<string | null>(null);

  /**
   * Requests notification permissions
   * @returns true if granted, false otherwise
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      
      if (existingStatus === 'granted') {
        return true;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      return status === 'granted';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to request permissions';
      if (__DEV__) {
        console.error('Push notification permission error:', errorMessage);
      }
      return false;
    }
  }, []);

  /**
   * Gets Expo push token
   */
  const getExpoPushToken = useCallback(async (): Promise<string | null> => {
    try {
      // Try to get projectId from Constants (for development builds)
      let projectId: string | undefined;
      try {
        const Constants = require('expo-constants').default;
        projectId = 
          Constants.expoConfig?.extra?.eas?.projectId || 
          Constants.expoConfig?.extra?.projectId ||
          Constants.manifest?.extra?.eas?.projectId;
      } catch {
        // Constants not available - Expo will auto-detect projectId in Expo Go
      }

      // In development, projectId is optional (Expo Go auto-detects it)
      // Only pass projectId if we have it, otherwise let Expo auto-detect
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      
      return tokenData.data || null;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get push token';
      
      // In development, projectId errors are expected in some environments
      // Don't treat this as a fatal error - push notifications will work in production builds
      if (__DEV__) {
        if (errorMessage.includes('projectId') || errorMessage.includes('No "projectId"')) {
          console.warn(
            '⚠️ Push notifications require a projectId in some environments.\n' +
            'This is expected in bare workflow or some development setups.\n' +
            'Push notifications will work in Expo Go and production builds.\n' +
            'To fix: Add EXPO_PROJECT_ID to your .env file or set it in app.config.js'
          );
        } else {
          console.error('Expo push token error:', errorMessage);
        }
      }
      
      return null;
    }
  }, []);

  /**
   * Registers device token with Supabase
   */
  const registerDeviceToken = useCallback(async () => {
    // Only register for authenticated users with profiles
    if (!user || !profile) {
      setPushToken(null);
      setError(null);
      return;
    }

    // Prevent duplicate registrations (React strict mode safety)
    if (isRegisteringRef.current) {
      if (__DEV__) {
        console.log('Registration already in progress, skipping...');
      }
      return;
    }

    // Skip if we already registered this token for this user
    if (lastUserIdRef.current === user.id && lastTokenRef.current) {
      if (__DEV__) {
        console.log('Token already registered for this user, skipping...');
      }
      return;
    }

    isRegisteringRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Request permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError('Notification permissions not granted');
        setIsLoading(false);
        isRegisteringRef.current = false;
        return;
      }

      // Step 2: Get Expo push token
      const token = await getExpoPushToken();
      if (!token) {
        setError('Failed to get push token');
        setIsLoading(false);
        isRegisteringRef.current = false;
        return;
      }

      // Step 3: Detect platform
      const platform = Platform.OS === 'ios' ? 'ios' : 'android';

      // Step 4: Upsert device token in Supabase
      // Upsert on (user_id, token) prevents duplicates
      await upsertDeviceToken({
        userId: user.id,
        platform,
        token,
      });

      // Success - store token and clear error
      setPushToken(token);
      setError(null);
      lastUserIdRef.current = user.id;
      lastTokenRef.current = token;

      if (__DEV__) {
        console.log(`✅ Push token registered: ${token.substring(0, 20)}...`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to register push notifications';
      setError(errorMessage);
      
      if (__DEV__) {
        console.error('Push notification registration error:', errorMessage);
      }
    } finally {
      setIsLoading(false);
      isRegisteringRef.current = false;
    }
  }, [user, profile, requestPermissions, getExpoPushToken]);

  /**
   * Auto-register when user is authenticated and has profile
   * Only runs when both conditions are met and not loading
   */
  useEffect(() => {
    // Wait for auth/profile to finish loading
    if (user && profile) {
      registerDeviceToken();
    } else {
      // Clear state when user logs out or profile is missing
      setPushToken(null);
      setError(null);
      lastUserIdRef.current = null;
      lastTokenRef.current = null;
    }
  }, [user?.id, profile?.id, registerDeviceToken]); // Use IDs to avoid unnecessary re-runs

  return {
    pushToken,
    isLoading,
    error,
  };
}
