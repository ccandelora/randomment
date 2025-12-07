/**
 * Schedule Moment Windows Edge Function
 * 
 * This function runs on a schedule (via Supabase cron or external scheduler)
 * and sends push notifications to users who have pending moment window schedules.
 * 
 * SETUP:
 * 1. Deploy this function: supabase functions deploy schedule-moment-windows
 * 2. Set up a cron job (e.g., every minute) to call this function
 * 3. Or use Supabase cron: https://supabase.com/docs/guides/database/extensions/pg_cron
 * 
 * WORKFLOW:
 * 1. Query moment_window_schedule for pending schedules where next_due_at <= NOW()
 * 2. For each schedule:
 *    - Get user's device tokens from device_tokens table
 *    - Send push notification via Expo Push Notification API
 *    - Update schedule status to 'sent' and set notification_sent_at
 * 
 * ENVIRONMENT VARIABLES REQUIRED:
 * - EXPO_ACCESS_TOKEN: Expo access token for push notifications (optional, for better rate limits)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_API_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoPushMessage {
  to: string;
  sound: 'default';
  title: string;
  body: string;
  data?: Record<string, any>;
  badge?: number;
}

interface MomentWindowSchedule {
  id: string;
  user_id: string;
  next_due_at: string;
  scheduled_at?: string; // Legacy field
  status: string;
}

interface DeviceToken {
  token: string;
  platform: 'ios' | 'android';
  is_active: boolean;
}

serve(async (req) => {
  try {
    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    
    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Query pending schedules that are due
    const now = new Date().toISOString();
    const { data: schedules, error: scheduleError } = await supabase
      .from('moment_window_schedule')
      .select('*')
      .eq('status', 'pending')
      .lte('next_due_at', now) // Use next_due_at (primary field)
      .order('next_due_at', { ascending: true })
      .limit(100); // Process up to 100 schedules per run

    if (scheduleError) {
      console.error('Error querying schedules:', scheduleError);
      return new Response(
        JSON.stringify({ error: 'Failed to query schedules', details: scheduleError.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!schedules || schedules.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending schedules found', processed: 0 }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing ${schedules.length} pending schedules`);

    const results = {
      processed: 0,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each schedule
    for (const schedule of schedules) {
      try {
        // Get user's active device tokens
        const { data: deviceTokens, error: tokenError } = await supabase
          .from('device_tokens')
          .select('token, platform, is_active')
          .eq('user_id', schedule.user_id)
          .eq('is_active', true);

        if (tokenError) {
          console.error(`Error fetching tokens for user ${schedule.user_id}:`, tokenError);
          results.failed++;
          results.errors.push(`User ${schedule.user_id}: ${tokenError.message}`);
          continue;
        }

        if (!deviceTokens || deviceTokens.length === 0) {
          console.log(`No active device tokens for user ${schedule.user_id}`);
          // Mark as sent anyway (user has no devices registered)
          await supabase
            .from('moment_window_schedule')
            .update({
              status: 'sent',
              notification_sent_at: new Date().toISOString(),
            })
            .eq('id', schedule.id);
          results.processed++;
          continue;
        }

        // Prepare push notification messages
        const messages: ExpoPushMessage[] = deviceTokens.map((deviceToken: DeviceToken) => ({
          to: deviceToken.token,
          sound: 'default',
          title: 'Your Moment Window is open! 🎬',
          body: 'Capture a moment now',
          data: {
            type: 'moment_window',
            scheduleId: schedule.id,
          },
          badge: 1,
        }));

        // Send push notifications via Expo API
        const expoAccessToken = Deno.env.get('EXPO_ACCESS_TOKEN');
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        };

        if (expoAccessToken) {
          headers['Authorization'] = `Bearer ${expoAccessToken}`;
        }

        const pushResponse = await fetch(EXPO_PUSH_API_URL, {
          method: 'POST',
          headers,
          body: JSON.stringify(messages),
        });

        if (!pushResponse.ok) {
          const errorText = await pushResponse.text();
          throw new Error(`Expo API error: ${pushResponse.status} - ${errorText}`);
        }

        const pushResult = await pushResponse.json();
        
        // Check for errors in Expo response
        if (pushResult.data && Array.isArray(pushResult.data)) {
          const hasErrors = pushResult.data.some((item: any) => item.status === 'error');
          if (hasErrors) {
            console.warn('Some push notifications failed:', pushResult.data);
          }
        }

        // Update schedule status to 'sent'
        const { error: updateError } = await supabase
          .from('moment_window_schedule')
          .update({
            status: 'sent',
            notification_sent_at: new Date().toISOString(),
          })
          .eq('id', schedule.id);

        if (updateError) {
          console.error(`Error updating schedule ${schedule.id}:`, updateError);
          results.failed++;
          results.errors.push(`Schedule ${schedule.id}: ${updateError.message}`);
        } else {
          results.sent++;
          console.log(`Sent notifications for schedule ${schedule.id} to ${deviceTokens.length} device(s)`);
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing schedule ${schedule.id}:`, error);
        results.failed++;
        results.errors.push(`Schedule ${schedule.id}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Processing complete',
        ...results,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Function execution failed',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

