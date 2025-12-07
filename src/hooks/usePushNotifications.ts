/**
 * Push Notifications Hook
 * 
 * Manages push notification registration for authenticated users.
 * 
 * Features:
 * - Requests notification permissions
 * - Retrieves Expo push token
 * - Detects platform (iOS/Android)
 * - Registers device token in Supabase device_tokens table
 * 
 * Only runs for authenticated users. Automatically registers device
 * when user is authenticated and has a profile.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { upsertDeviceToken, Platform as DevicePlatform } from '../services/deviceTokens';
import { logError } from '../utils/errorHandling';

/**
 * Configure notification handler behavior
 * This determines how notifications are handled when app is in foreground
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
  error: Error | null;
  requestPermissions: () => Promise<boolean>;
}

/**
 * Hook for managing push notifications
 * 
 * Automatically registers device token when:
 * - User is authenticated
 * - User has a profile (onboarding complete)
 * - Notification permissions are granted
 * 
 * @returns Object with pushToken, isLoading, error, and requestPermissions function
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isRegisteringRef = useRef(false); // Prevent duplicate registrations

  /**
   * Detects platform and returns 'ios' or 'android'
   */
  const getPlatform = useCallback((): DevicePlatform => {
    return Platform.OS === 'ios' ? 'ios' : 'android';
  }, []);

  /**
   * Requests notification permissions from the user
   * @returns true if permissions granted, false otherwise
   */
  const requestPermissions = useCallback(async (): Promise<boolean> => {
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      // Only ask if permissions haven't already been determined
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      return finalStatus === 'granted';
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to request notification permissions');
      setError(error);
      logError('Failed to request notification permissions', err);
      return false;
    }
  }, []);

  /**
   * Registers device token with Supabase
   */
  const registerDeviceToken = useCallback(async () => {
    if (!user || !profile) {
      // Only register for authenticated users with profiles
      return;
    }

    // Prevent duplicate registrations
    if (isRegisteringRef.current) {
      return;
    }

    isRegisteringRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      // Step 1: Request permissions
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        setError(new Error('Notification permissions not granted'));
        setIsLoading(false);
        return;
      }

      // Step 2: Get Expo push token
      // Note: In Expo Go, projectId is automatically detected from app.json/app.config.js
      // For development builds, we need to get it from Constants
      let projectId: string | undefined;
      
      try {
        // Try to get projectId from Constants (works in Expo Go and development builds)
        const Constants = require('expo-constants').default;
        projectId = Constants.expoConfig?.extra?.eas?.projectId || Constants.expoConfig?.extra?.projectId;
      } catch (err) {
        // Constants might not be available, that's okay
        if (__DEV__) {
          console.warn('Could not get projectId from Constants:', err);
        }
      }

      // Only include projectId if we have it, otherwise let Expo auto-detect
      const tokenData = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined
      );
      const token = tokenData.data;

      if (!token) {
        throw new Error('Failed to get Expo push token');
      }

      // Step 3: Detect platform
      const platform = getPlatform();

      // Step 4: Upsert device token in Supabase
      await upsertDeviceToken({
        userId: user.id,
        platform,
        token,
      });

      setPushToken(token);
      setError(null);

      if (__DEV__) {
        console.log(`Push notification token registered: ${token.substring(0, 20)}...`);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to register push notifications');
      
      // Handle projectId error gracefully - this is expected in Expo Go
      if (error.message.includes('projectId') || error.message.includes('No "projectId"')) {
        if (__DEV__) {
          console.warn(
            'Push notifications require a projectId. ' +
            'This is expected in Expo Go - push notifications work in development builds. ' +
            'To enable in Expo Go, add your Expo projectId to app.config.js extra.eas.projectId'
          );
        }
        // Don't set error state for projectId issues - it's not critical for development
        setError(null);
      } else {
        setError(error);
        logError('Failed to register push notifications', err);
      }
    } finally {
      setIsLoading(false);
      isRegisteringRef.current = false;
    }
  }, [user, profile, requestPermissions, getPlatform]);

  /**
   * Auto-register when user is authenticated and has profile
   */
  useEffect(() => {
    if (user && profile) {
      // User is fully onboarded, register device token
      registerDeviceToken();
    } else {
      // User not authenticated or no profile, clear token
      setPushToken(null);
      setError(null);
    }
  }, [user, profile, registerDeviceToken]);

  return {
    pushToken,
    isLoading,
    error,
    requestPermissions,
  };
}

