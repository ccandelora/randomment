# Schedule Moment Windows Edge Function

This Edge Function sends push notifications to users who have pending "Moment Window" schedules.

## Setup

### 1. Deploy the Function

```bash
supabase functions deploy schedule-moment-windows
```

### 2. Set Up Cron Job

You have two options for scheduling:

#### Option A: Supabase Cron (Recommended)

Add a cron job in Supabase to call this function every minute:

```sql
-- Run every minute
SELECT cron.schedule(
  'schedule-moment-windows',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url := 'https://<your-project-ref>.supabase.co/functions/v1/schedule-moment-windows',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <your-anon-key>'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
```

#### Option B: External Cron Service

Use a service like GitHub Actions, Vercel Cron, or a traditional cron server to call:

```
POST https://<your-project-ref>.supabase.co/functions/v1/schedule-moment-windows
Headers:
  Authorization: Bearer <your-anon-key>
```

### 3. Environment Variables

Set these in Supabase Dashboard → Edge Functions → schedule-moment-windows → Settings:

- `SUPABASE_URL`: Your Supabase project URL (automatically set)
- `SUPABASE_SERVICE_ROLE_KEY`: Your service role key (automatically set)
- `EXPO_ACCESS_TOKEN`: (Optional) Expo access token for better rate limits

## How It Works

1. **App Activation**: When a user opens the app, `useAppActivation` hook creates a schedule in `moment_window_schedule` table
2. **Scheduler**: This Edge Function runs every minute and queries for pending schedules where `scheduled_at <= NOW()`
3. **Push Notifications**: For each due schedule:
   - Fetches user's active device tokens from `device_tokens` table
   - Sends push notification via Expo Push Notification API
   - Updates schedule status to 'sent'
4. **User Receives Notification**: User taps notification → `NotificationResponseHandler` in App.tsx navigates to Capture tab

## Testing

Test the function locally:

```bash
supabase functions serve schedule-moment-windows
```

Then call it:

```bash
curl -X POST http://localhost:54321/functions/v1/schedule-moment-windows \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json"
```

## Monitoring

Check function logs in Supabase Dashboard → Edge Functions → schedule-moment-windows → Logs

Monitor schedules:

```sql
-- View pending schedules
SELECT * FROM moment_window_schedule WHERE status = 'pending' ORDER BY scheduled_at;

-- View recent sent notifications
SELECT * FROM moment_window_schedule WHERE status = 'sent' ORDER BY notification_sent_at DESC LIMIT 10;
```

