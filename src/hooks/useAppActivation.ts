/**
 * App Activation Hook
 * 
 * Tracks when the app becomes active and schedules moment window notifications.
 * 
 * WORKFLOW:
 * 1. App becomes active (foreground) → Schedule moment window notification
 * 2. Schedule is stored in moment_window_schedule table
 * 3. Edge Function (cron) queries pending schedules and sends push notifications
 * 4. User receives notification → Taps → Navigates to Capture tab
 * 
 * This replaces the client-side useMomentWindow hook for server-driven scheduling.
 */

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { createMomentWindowSchedule, cancelPendingSchedule } from '../services/momentWindowSchedule';
import { logError } from '../utils/errorHandling';

interface UseAppActivationOptions {
  enabled?: boolean;
  minDelaySeconds?: number;
  maxDelaySeconds?: number;
}

/**
 * Hook for tracking app activation and scheduling moment windows
 * 
 * Automatically schedules a moment window notification when:
 * - User is authenticated
 * - User has a profile
 * - App becomes active (foreground)
 * 
 * Cancels pending schedules when app goes to background.
 * 
 * @param options - Configuration options
 */
export function useAppActivation(options: UseAppActivationOptions = {}) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const {
    enabled = true,
    minDelaySeconds = 30,
    maxDelaySeconds = 120,
  } = options;
  
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isSchedulingRef = useRef(false);

  useEffect(() => {
    if (!enabled || !user || !profile) {
      // Don't schedule if disabled or user not authenticated/onboarded
      return;
    }

    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      const previousAppState = appStateRef.current;
      appStateRef.current = nextAppState;

      // App became active (foreground)
      if (previousAppState.match(/inactive|background/) && nextAppState === 'active') {
        // Prevent duplicate scheduling
        if (isSchedulingRef.current) {
          return;
        }

        isSchedulingRef.current = true;

        try {
          // Schedule a new moment window notification
          await createMomentWindowSchedule({
            userId: user.id,
            minDelaySeconds,
            maxDelaySeconds,
          });

          if (__DEV__) {
            console.log('App activated - Moment window scheduled');
          }
        } catch (error) {
          logError('Failed to schedule moment window on app activation', error);
        } finally {
          isSchedulingRef.current = false;
        }
      }

      // App went to background
      if (previousAppState === 'active' && nextAppState.match(/inactive|background/)) {
        try {
          // Cancel any pending schedules (optional - you might want to keep them)
          // await cancelPendingSchedule(user.id);
          
          if (__DEV__) {
            console.log('App backgrounded');
          }
        } catch (error) {
          // Silently fail - this is best effort
          if (__DEV__) {
            console.warn('Failed to cancel pending schedule:', error);
          }
        }
      }
    });

    // Schedule on initial mount if app is already active
    if (appStateRef.current === 'active') {
      if (!isSchedulingRef.current) {
        isSchedulingRef.current = true;
        createMomentWindowSchedule({
          userId: user.id,
          minDelaySeconds,
          maxDelaySeconds,
        })
          .then(() => {
            if (__DEV__) {
              console.log('Initial app activation - Moment window scheduled');
            }
          })
          .catch((error) => {
            logError('Failed to schedule moment window on initial mount', error);
          })
          .finally(() => {
            isSchedulingRef.current = false;
          });
      }
    }

    return () => {
      subscription.remove();
    };
  }, [enabled, user, profile, minDelaySeconds, maxDelaySeconds]);
}

