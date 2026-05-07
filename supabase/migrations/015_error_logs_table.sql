-- Error logs table for client-side error tracking
CREATE TABLE IF NOT EXISTS public.error_logs (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  message TEXT NOT NULL,
  stack TEXT,
  component_stack TEXT,
  url TEXT,
  line INTEGER,
  col INTEGER,
  browser TEXT,
  os TEXT,
  device TEXT,
  environment TEXT DEFAULT 'production',
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  page_path TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only allow inserts from anon/key, no reads from frontend
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow insert from frontend"
  ON public.error_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- No SELECT policy — errors are private, only visible in Supabase dashboard

-- Index for querying recent errors
CREATE INDEX idx_error_logs_created_at ON public.error_logs (created_at DESC);
CREATE INDEX idx_error_logs_environment ON public.error_logs (environment);

-- Auto-cleanup: delete errors older than 30 days
-- (handled by pg_cron, but add as comment for reference)
COMMENT ON TABLE public.error_logs IS 'Client-side error logs. Auto-cleaned after 30 days via pg_cron.';
