/**
 * Stats Service
 * 
 * Calculates user statistics and streaks from moments data.
 * 
 * Stats include:
 * - Total moments captured
 * - Moments captured this week
 * - Current capture streak (consecutive days)
 * - Longest streak
 * - Moments captured this month
 */

import { supabase } from './supabaseClient';
import { logError } from '../utils/errorHandling';

export interface UserStats {
  totalMoments: number;
  momentsThisWeek: number;
  momentsThisMonth: number;
  currentStreak: number;
  longestStreak: number;
  streakStartDate: string | null; // ISO date string of when current streak started
}

export interface MomentDate {
  date: string; // YYYY-MM-DD format
  count: number;
}

/**
 * Gets all moment dates for a user (grouped by date)
 * 
 * @param userId - User ID
 * @returns Promise resolving to array of dates with moment counts
 */
async function getUserMomentDates(userId: string): Promise<MomentDate[]> {
  try {
    // Query moments, grouping by date (ignoring time)
    const { data, error } = await supabase
      .from('moments')
      .select('created_at')
      .eq('user_id', userId)
      .in('status', ['pending_review', 'approved', 'published']) // Only count approved/published moments
      .order('created_at', { ascending: true });

    if (error) {
      if (__DEV__) {
        console.error('Supabase getUserMomentDates error:', error);
      }
      throw new Error(`Failed to fetch moment dates: ${error.message}`);
    }

    if (!data || data.length === 0) {
      return [];
    }

    // Group by date (YYYY-MM-DD)
    const dateMap = new Map<string, number>();
    
    data.forEach((moment) => {
      const date = new Date(moment.created_at);
      const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
      dateMap.set(dateKey, (dateMap.get(dateKey) || 0) + 1);
    });

    // Convert to array and sort by date
    const momentDates: MomentDate[] = Array.from(dateMap.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return momentDates;
  } catch (error) {
    logError('getUserMomentDates failed', error);
    return [];
  }
}

/**
 * Calculates the current streak (consecutive days with at least one moment)
 * 
 * @param momentDates - Array of dates with moment counts, sorted chronologically
 * @returns Object with current streak count and start date
 */
function calculateCurrentStreak(momentDates: MomentDate[]): {
  streak: number;
  startDate: string | null;
} {
  if (momentDates.length === 0) {
    return { streak: 0, startDate: null };
  }

  // Work backwards from today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dateSet = new Set(momentDates.map((md) => md.date));
  
  let streak = 0;
  let currentDate = new Date(today);
  let streakStartDate: string | null = null;

  // Check today first
  const todayKey = currentDate.toISOString().split('T')[0];
  if (dateSet.has(todayKey)) {
    streak = 1;
    streakStartDate = todayKey;
    currentDate.setDate(currentDate.getDate() - 1);
  } else {
    // If no moment today, check yesterday
    currentDate.setDate(currentDate.getDate() - 1);
  }

  // Count backwards consecutive days
  while (true) {
    const dateKey = currentDate.toISOString().split('T')[0];
    
    if (dateSet.has(dateKey)) {
      streak++;
      if (!streakStartDate) {
        streakStartDate = dateKey;
      }
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      // Streak broken
      break;
    }
  }

  return { streak, startDate: streakStartDate };
}

/**
 * Calculates the longest streak from moment dates
 * 
 * @param momentDates - Array of dates with moment counts, sorted chronologically
 * @returns Longest streak count
 */
function calculateLongestStreak(momentDates: MomentDate[]): number {
  if (momentDates.length === 0) {
    return 0;
  }

  if (momentDates.length === 1) {
    return 1;
  }

  let longestStreak = 1;
  let currentStreak = 1;

  for (let i = 1; i < momentDates.length; i++) {
    const prevDate = new Date(momentDates[i - 1].date);
    const currDate = new Date(momentDates[i].date);
    
    // Calculate days difference
    const daysDiff = Math.floor(
      (currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff === 1) {
      // Consecutive day
      currentStreak++;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      // Streak broken
      currentStreak = 1;
    }
  }

  return longestStreak;
}

/**
 * Counts moments in a date range
 * 
 * @param momentDates - Array of dates with moment counts
 * @param startDate - Start date (inclusive)
 * @param endDate - End date (inclusive)
 * @returns Count of moments in range
 */
function countMomentsInRange(
  momentDates: MomentDate[],
  startDate: Date,
  endDate: Date
): number {
  const startKey = startDate.toISOString().split('T')[0];
  const endKey = endDate.toISOString().split('T')[0];

  return momentDates
    .filter((md) => md.date >= startKey && md.date <= endKey)
    .reduce((sum, md) => sum + md.count, 0);
}

/**
 * Gets comprehensive stats for a user
 * 
 * @param userId - User ID
 * @returns Promise resolving to user stats
 */
export async function getUserStats(userId: string): Promise<UserStats> {
  try {
    const momentDates = await getUserMomentDates(userId);

    if (momentDates.length === 0) {
      return {
        totalMoments: 0,
        momentsThisWeek: 0,
        momentsThisMonth: 0,
        currentStreak: 0,
        longestStreak: 0,
        streakStartDate: null,
      };
    }

    // Calculate streaks
    const { streak: currentStreak, startDate: streakStartDate } =
      calculateCurrentStreak(momentDates);
    const longestStreak = calculateLongestStreak(momentDates);

    // Calculate date ranges
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Count moments in ranges
    const momentsThisWeek = countMomentsInRange(momentDates, startOfWeek, now);
    const momentsThisMonth = countMomentsInRange(momentDates, startOfMonth, now);

    // Total moments
    const totalMoments = momentDates.reduce((sum, md) => sum + md.count, 0);

    return {
      totalMoments,
      momentsThisWeek,
      momentsThisMonth,
      currentStreak,
      longestStreak,
      streakStartDate,
    };
  } catch (error) {
    logError('getUserStats failed', error);
    // Return empty stats on error
    return {
      totalMoments: 0,
      momentsThisWeek: 0,
      momentsThisMonth: 0,
      currentStreak: 0,
      longestStreak: 0,
      streakStartDate: null,
    };
  }
}

