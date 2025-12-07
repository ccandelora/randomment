-- Create moment_window_schedule table
-- This table tracks when users should receive "Moment Window" push notifications
-- The Edge Function scheduler queries this table to determine when to send notifications

CREATE TABLE IF NOT EXISTS moment_window_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  next_due_at TIMESTAMPTZ NOT NULL, -- When the notification should be sent
  scheduled_at TIMESTAMPTZ, -- Legacy field, kept for backward compatibility
  min_delay_seconds INTEGER NOT NULL DEFAULT 30,
  max_delay_seconds INTEGER NOT NULL DEFAULT 120,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'cancelled')),
  notification_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all required columns exist (in case table was created partially)
DO $$
BEGIN
  -- Add next_due_at column if it doesn't exist (primary field)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'next_due_at'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN next_due_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  -- Add scheduled_at column if it doesn't exist (legacy field)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'scheduled_at'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN scheduled_at TIMESTAMPTZ;
  END IF;
  
  -- Add status column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
    
    -- Add check constraint separately (drop first if exists)
    ALTER TABLE moment_window_schedule
    DROP CONSTRAINT IF EXISTS moment_window_schedule_status_check;
    
    ALTER TABLE moment_window_schedule
    ADD CONSTRAINT moment_window_schedule_status_check 
    CHECK (status IN ('pending', 'sent', 'cancelled'));
  END IF;
  
  -- Add other columns if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'min_delay_seconds'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN min_delay_seconds INTEGER NOT NULL DEFAULT 30;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'max_delay_seconds'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN max_delay_seconds INTEGER NOT NULL DEFAULT 120;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'notification_sent_at'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN notification_sent_at TIMESTAMPTZ;
  END IF;
  
  -- Add created_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'created_at'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
  
  -- Add updated_at if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public'
    AND table_name = 'moment_window_schedule' 
    AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE moment_window_schedule 
    ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Ensure one pending schedule per user at a time (partial unique index)
-- Drop index if it exists first to avoid conflicts
DROP INDEX IF EXISTS idx_moment_window_schedule_user_pending;
CREATE UNIQUE INDEX idx_moment_window_schedule_user_pending 
  ON moment_window_schedule(user_id) 
  WHERE status = 'pending';

-- Index for efficient querying of pending schedules
CREATE INDEX IF NOT EXISTS idx_moment_window_schedule_pending 
  ON moment_window_schedule(next_due_at) 
  WHERE status = 'pending';

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_moment_window_schedule_user_id 
  ON moment_window_schedule(user_id);

-- Enable RLS
ALTER TABLE moment_window_schedule ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own schedules
CREATE POLICY "Users can view their own schedules"
  ON moment_window_schedule
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own schedules
CREATE POLICY "Users can create their own schedules"
  ON moment_window_schedule
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own schedules
CREATE POLICY "Users can update their own schedules"
  ON moment_window_schedule
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Service role can manage all schedules (for Edge Function)
-- Note: Edge Functions use service role, so this allows the scheduler to work
-- In production, you may want to use a more restrictive policy with a service role function

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_moment_window_schedule_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_moment_window_schedule_updated_at
  BEFORE UPDATE ON moment_window_schedule
  FOR EACH ROW
  EXECUTE FUNCTION update_moment_window_schedule_updated_at();

