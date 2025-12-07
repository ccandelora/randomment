# Push Notifications & Moment Window Scheduling

Complete guide for setting up push notifications and the moment window scheduler.

## Architecture Overview

```
┌─────────────────┐
│   User Opens    │
│      App        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ useAppActivation │ Creates schedule in moment_window_schedule
│      Hook        │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ moment_window_  │ Stores pending schedules
│   schedule      │
│     table       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Edge Function   │ Runs every minute (cron)
│ schedule-moment │ Queries pending schedules
│   -windows      │ Sends push notifications
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Expo Push API   │ Delivers notifications
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ User's Device   │ Receives notification
│                 │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Notification    │ Navigates to Capture tab
│ ResponseHandler │
└─────────────────┘
```

## Database Setup

### 1. Run Migration

Apply the migration to create the `moment_window_schedule` table:

```bash
# In Supabase Dashboard → SQL Editor, run:
# migrations/create-moment-window-schedule.sql
```

Or via Supabase CLI:

```bash
supabase db push
```

### 2. Verify Tables

Ensure these tables exist:
- `device_tokens` - Stores push notification tokens
- `moment_window_schedule` - Stores scheduled notifications

## Edge Function Setup

### 1. Deploy Function

```bash
supabase functions deploy schedule-moment-windows
```

### 2. Set Up Cron Job

#### Option A: Supabase Cron (Recommended)

Enable pg_cron extension and create cron job:

```sql
-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create cron job (runs every minute)
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

#### Option B: External Cron

Use GitHub Actions, Vercel Cron, or any cron service:

```yaml
# .github/workflows/moment-window-scheduler.yml
name: Schedule Moment Windows
on:
  schedule:
    - cron: '* * * * *' # Every minute
jobs:
  schedule:
    runs-on: ubuntu-latest
    steps:
      - name: Call Edge Function
        run: |
          curl -X POST \
            https://<your-project-ref>.supabase.co/functions/v1/schedule-moment-windows \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

### 3. Environment Variables

In Supabase Dashboard → Edge Functions → Settings:

- `SUPABASE_URL`: Auto-set
- `SUPABASE_SERVICE_ROLE_KEY`: Auto-set
- `EXPO_ACCESS_TOKEN`: (Optional) Get from Expo dashboard

## Client-Side Integration

### 1. Push Notification Registration

Already implemented in `usePushNotifications` hook. Automatically:
- Requests permissions
- Gets Expo push token
- Registers token in `device_tokens` table

### 2. App Activation Tracking

Already implemented in `useAppActivation` hook. Automatically:
- Tracks when app becomes active
- Creates schedule in `moment_window_schedule` table
- Uses random delay (30-120 seconds)

### 3. Notification Response Handling

Already implemented in `NotificationResponseHandler` component. Automatically:
- Listens for notification taps
- Navigates to Capture tab
- Handles unauthenticated users

## Testing

### 1. Test Schedule Creation

```typescript
// In your app, check console logs:
// "App activated - Moment window scheduled"
```

### 2. Test Edge Function

```bash
# Call function directly
curl -X POST \
  https://<your-project-ref>.supabase.co/functions/v1/schedule-moment-windows \
  -H "Authorization: Bearer <your-anon-key>" \
  -H "Content-Type: application/json"
```

### 3. Check Database

```sql
-- View pending schedules
SELECT 
  id,
  user_id,
  scheduled_at,
  status,
  created_at
FROM moment_window_schedule
WHERE status = 'pending'
ORDER BY scheduled_at;

-- View device tokens
SELECT 
  user_id,
  platform,
  is_active,
  created_at
FROM device_tokens
WHERE is_active = true;
```

### 4. Test Push Notification

1. Create a schedule manually:
```sql
INSERT INTO moment_window_schedule (user_id, scheduled_at, status)
VALUES (
  '<your-user-id>',
  NOW() + INTERVAL '10 seconds',
  'pending'
);
```

2. Wait 10 seconds, then call Edge Function
3. Check device for notification

## Monitoring

### Function Logs

Supabase Dashboard → Edge Functions → schedule-moment-windows → Logs

### Database Queries

```sql
-- Recent sent notifications
SELECT 
  id,
  user_id,
  scheduled_at,
  notification_sent_at,
  status
FROM moment_window_schedule
WHERE status = 'sent'
ORDER BY notification_sent_at DESC
LIMIT 20;

-- Failed schedules (if any)
SELECT 
  id,
  user_id,
  scheduled_at,
  status,
  created_at
FROM moment_window_schedule
WHERE status = 'pending'
  AND scheduled_at < NOW() - INTERVAL '5 minutes';
```

## Troubleshooting

### Notifications Not Sending

1. **Check device tokens**: Ensure `device_tokens` table has active tokens
2. **Check schedules**: Ensure `moment_window_schedule` has pending schedules
3. **Check Edge Function logs**: Look for errors in Supabase Dashboard
4. **Check Expo token**: Verify token format is correct

### Cron Not Running

1. **Check pg_cron extension**: `SELECT * FROM pg_extension WHERE extname = 'pg_cron';`
2. **Check cron job**: `SELECT * FROM cron.job;`
3. **Check cron logs**: `SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;`

### Function Errors

Check Edge Function logs in Supabase Dashboard for:
- Database connection errors
- RLS policy violations
- Expo API errors

## Production Checklist

- [ ] Deploy Edge Function
- [ ] Set up cron job (pg_cron or external)
- [ ] Configure environment variables
- [ ] Test end-to-end flow
- [ ] Monitor function logs
- [ ] Set up alerts for failures
- [ ] Document cron schedule
- [ ] Test notification delivery on iOS and Android

