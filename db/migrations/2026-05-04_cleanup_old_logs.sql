-- Auto-delete log records older than 30 days.
-- Applied to project ybnpqdpsdcwecyuubwkk on 2026-05-04 via Supabase MCP.
-- Daily cron job runs at 03:15 UTC.

-- 1) Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2) Helper function: delete logs older than 30 days
CREATE OR REPLACE FUNCTION public.cleanup_old_logs()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.logs
  WHERE created_at < NOW() - INTERVAL '30 days';
$$;

-- 3) Unschedule any previous job with the same name (idempotent re-runs)
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-old-logs');
EXCEPTION WHEN OTHERS THEN
  NULL;
END$$;

-- 4) Schedule daily at 03:15 UTC
SELECT cron.schedule(
  'cleanup-old-logs',
  '15 3 * * *',
  $$SELECT public.cleanup_old_logs();$$
);

-- Useful queries:
--   SELECT * FROM cron.job WHERE jobname = 'cleanup-old-logs';
--   SELECT * FROM cron.job_run_details WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'cleanup-old-logs') ORDER BY start_time DESC LIMIT 10;
--   SELECT cron.unschedule('cleanup-old-logs');                    -- to disable
--   SELECT public.cleanup_old_logs();                              -- to run manually
