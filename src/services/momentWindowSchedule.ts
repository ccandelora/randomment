/**
 * Moment Window Schedule Service
 * 
 * Manages scheduling of "Moment Window" push notifications.
 * Tracks app activation and schedules notifications via Supabase.
 * 
 * WORKFLOW:
 * 1. User opens app → App activation tracked → Schedule created in moment_window_schedule
 * 2. Edge Function (cron job) queries pending schedules → Sends push notifications
 * 3. User receives notification → Taps → Navigates to Capture tab
 */

import { supabase } from './supabaseClient';

export interface MomentWindowSchedule {
  id: string;
  user_id: string;
  scheduled_at?: string; // Legacy field name
  next_due_at: string; // Current field name
  min_delay_seconds: number;
  max_delay_seconds: number;
  status: 'pending' | 'sent' | 'cancelled';
  notification_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateSchedulePayload {
  userId: string;
  minDelaySeconds?: number;
  maxDelaySeconds?: number;
}

/**
 * Creates a new moment window schedule for a user
 * 
 * Calculates a random delay between minDelaySeconds and maxDelaySeconds,
 * then schedules the notification for that time in the future.
 * 
 * RLS POLICY: INSERT policy requires user_id = auth.uid()
 * 
 * @param payload - Schedule parameters
 * @returns Promise resolving to the created schedule
 * @throws Error if creation fails
 */
export async function createMomentWindowSchedule(
  payload: CreateSchedulePayload
): Promise<MomentWindowSchedule> {
  try {
    const minDelay = payload.minDelaySeconds ?? 30;
    const maxDelay = payload.maxDelaySeconds ?? 120;
    
    // Calculate random delay in seconds
    const delaySeconds = Math.floor(
      Math.random() * (maxDelay - minDelay + 1) + minDelay
    );
    
    // Calculate scheduled time
    const scheduledAt = new Date();
    scheduledAt.setSeconds(scheduledAt.getSeconds() + delaySeconds);
    
    // Check if a pending schedule already exists for this user
    const { data: existingSchedule, error: checkError } = await supabase
      .from('moment_window_schedule')
      .select('id')
      .eq('user_id', payload.userId)
      .eq('status', 'pending')
      .maybeSingle();
    
    if (checkError && __DEV__) {
      console.warn('Error checking for existing schedule:', checkError.message);
    }
    
    let data: MomentWindowSchedule | null = null;
    let error: any = null;
    
    if (existingSchedule?.id) {
      // Update existing schedule using its ID
      if (__DEV__) {
        console.log('Updating existing pending schedule');
      }
      
      const result = await supabase
        .from('moment_window_schedule')
        .update({
          next_due_at: scheduledAt.toISOString(),
          min_delay_seconds: minDelay,
          max_delay_seconds: maxDelay,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSchedule.id)
        .select()
        .single();
      
      data = result.data as MomentWindowSchedule | null;
      error = result.error;
    } else {
      // Insert new schedule
      if (__DEV__) {
        console.log('Creating new pending schedule');
      }
      
      const result = await supabase
        .from('moment_window_schedule')
        .insert({
          user_id: payload.userId,
          next_due_at: scheduledAt.toISOString(),
          min_delay_seconds: minDelay,
          max_delay_seconds: maxDelay,
          status: 'pending',
        })
        .select()
        .single();
      
      data = result.data as MomentWindowSchedule | null;
      error = result.error;
      
      // If insert fails with duplicate key error (race condition), try update instead
      if (error && (error.code === '23505' || error.message.includes('duplicate key'))) {
        if (__DEV__) {
          console.log('Insert failed with duplicate key, trying update instead');
        }
        
        const updateResult = await supabase
          .from('moment_window_schedule')
          .update({
            next_due_at: scheduledAt.toISOString(),
            min_delay_seconds: minDelay,
            max_delay_seconds: maxDelay,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', payload.userId)
          .eq('status', 'pending')
          .select()
          .single();
        
        data = updateResult.data as MomentWindowSchedule | null;
        error = updateResult.error;
      }
    }
    
    if (error) {
      if (__DEV__) {
        console.error('Supabase createMomentWindowSchedule error:', error);
      }
      throw new Error(`Failed to ${existingSchedule ? 'update' : 'create'} schedule: ${error.message}`);
    }
    
    if (!data) {
      throw new Error('Schedule creation succeeded but no data returned');
    }
    
    if (__DEV__) {
      console.log(`Moment window scheduled for ${new Date(scheduledAt).toLocaleTimeString()}`);
    }
    
    return data as MomentWindowSchedule;
  } catch (error) {
    if (error instanceof Error) {
      if (__DEV__) {
        console.error('createMomentWindowSchedule failed:', error.message);
      }
      throw error;
    }
    if (__DEV__) {
      console.error('createMomentWindowSchedule failed with unknown error:', error);
    }
    throw new Error('Failed to create schedule: Unknown error');
  }
}

/**
 * Cancels any pending schedule for a user
 * 
 * RLS POLICY: UPDATE policy requires user_id = auth.uid()
 * 
 * @param userId - ID of the user
 * @throws Error if cancellation fails
 */
export async function cancelPendingSchedule(userId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('moment_window_schedule')
      .update({ status: 'cancelled' })
      .eq('user_id', userId)
      .eq('status', 'pending');
    
    if (error) {
      if (__DEV__) {
        console.error('Supabase cancelPendingSchedule error:', error);
      }
      // Don't throw - this is best effort, user might not have a pending schedule
      if (__DEV__) {
        console.warn('Failed to cancel pending schedule (may not exist):', error.message);
      }
    }
  } catch (error) {
    // Silently fail - this is best effort
    if (__DEV__) {
      console.warn('cancelPendingSchedule failed:', error);
    }
  }
}

/**
 * Gets the next pending schedule for a user
 * 
 * RLS POLICY: SELECT policy requires user_id = auth.uid()
 * 
 * @param userId - ID of the user
 * @returns Promise resolving to the schedule or null
 */
export async function getPendingSchedule(
  userId: string
): Promise<MomentWindowSchedule | null> {
  try {
    const { data, error } = await supabase
      .from('moment_window_schedule')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('next_due_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    
    if (error) {
      if (__DEV__) {
        console.error('Supabase getPendingSchedule error:', error);
      }
      return null;
    }
    
    return data as MomentWindowSchedule | null;
  } catch (error) {
    if (__DEV__) {
      console.error('getPendingSchedule failed:', error);
    }
    return null;
  }
}

