/**
 * useMomentWindow Hook
 * Simulates random "Moment Windows" that prompt users to capture moments
 * 
 * This hook manages in-app state for Moment Windows. In the future, this could be
 * replaced or augmented with:
 * - Push notifications (using expo-notifications) to trigger windows even when app is closed
 * - Background task scheduling (using expo-task-manager) for more reliable timing
 * - Server-side scheduling for cross-device synchronization
 * - User preferences for window frequency and timing
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';

interface UseMomentWindowOptions {
  minDelayMs?: number;
  maxDelayMs?: number;
  enabled?: boolean;
  onWindowOpen?: () => void;
}

interface UseMomentWindowReturn {
  isWindowOpen: boolean;
  openWindow: () => void;
  closeWindow: () => void;
}

const DEFAULT_MIN_DELAY_MS = 30000; // 30 seconds
const DEFAULT_MAX_DELAY_MS = 120000; // 120 seconds

/**
 * Generates a random delay between min and max milliseconds
 */
function getRandomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

export function useMomentWindow({
  minDelayMs = DEFAULT_MIN_DELAY_MS,
  maxDelayMs = DEFAULT_MAX_DELAY_MS,
  enabled = true,
  onWindowOpen,
}: UseMomentWindowOptions = {}): UseMomentWindowReturn {
  const [isWindowOpen, setIsWindowOpen] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const isMountedRef = useRef(true);

  /**
   * Schedule the next Moment Window
   */
  const scheduleNextWindow = useCallback(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Don't schedule if disabled or window is already open
    if (!enabled || isWindowOpen) {
      return;
    }

    // Calculate random delay
    const delay = getRandomDelay(minDelayMs, maxDelayMs);

    // Schedule the window to open
    timeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !isWindowOpen) {
        setIsWindowOpen(true);
        onWindowOpen?.();
      }
    }, delay);
  }, [enabled, isWindowOpen, minDelayMs, maxDelayMs, onWindowOpen]);

  /**
   * Manually open the window
   */
  const openWindow = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsWindowOpen(true);
    onWindowOpen?.();
  }, [onWindowOpen]);

  /**
   * Close the window and schedule the next one
   */
  const closeWindow = useCallback(() => {
    setIsWindowOpen(false);
    // Schedule next window after closing
    scheduleNextWindow();
  }, [scheduleNextWindow]);

  /**
   * Handle app state changes
   * Only schedule windows when app is active
   */
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const wasActive = appStateRef.current === 'active';
      const isActive = nextAppState === 'active';

      appStateRef.current = nextAppState;

      // If app becomes active and window is not open, schedule next window
      if (isActive && !wasActive && !isWindowOpen && enabled) {
        scheduleNextWindow();
      }

      // If app goes to background, clear any pending timeout
      if (!isActive && wasActive && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [isWindowOpen, enabled, scheduleNextWindow]);

  /**
   * Initial mount: schedule first window if app is active
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Cleanup on unmount
    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, []); // Only run on mount/unmount

  /**
   * Schedule window when enabled and app is active
   * Reschedules when config changes or window closes
   */
  useEffect(() => {
    if (enabled && !isWindowOpen && AppState.currentState === 'active') {
      scheduleNextWindow();
    }
  }, [enabled, isWindowOpen, scheduleNextWindow]); // Reschedule when config or state changes

  return {
    isWindowOpen,
    openWindow,
    closeWindow,
  };
}

