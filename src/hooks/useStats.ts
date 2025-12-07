/**
 * Stats Hook
 * 
 * Provides user statistics and streaks.
 * Automatically refreshes when moments change.
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMoments } from '../context/MomentsContext';
import { getUserStats, UserStats } from '../services/stats';
import { logError } from '../utils/errorHandling';

interface UseStatsReturn {
  stats: UserStats | null;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Hook for accessing user stats
 * 
 * Automatically loads stats when user is authenticated.
 * Refreshes when moments context changes.
 * 
 * @returns Object with stats, loading state, error, and refresh function
 */
export function useStats(): UseStatsReturn {
  const { user } = useAuth();
  const { moments } = useMoments(); // Subscribe to moments changes
  const [stats, setStats] = useState<UserStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadStats = useCallback(async () => {
    if (!user) {
      setStats(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const userStats = await getUserStats(user.id);
      setStats(userStats);
      setError(null);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load stats');
      setError(error);
      logError('Failed to load stats', err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Load stats when user changes or moments change
  useEffect(() => {
    loadStats();
  }, [loadStats, moments.length]); // Refresh when moments count changes

  return {
    stats,
    isLoading,
    error,
    refresh: loadStats,
  };
}

