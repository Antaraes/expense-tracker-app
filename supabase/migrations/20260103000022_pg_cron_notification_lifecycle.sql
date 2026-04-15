-- Requires pg_cron (Supabase: Database → Extensions). If this migration fails locally,
-- delete it or disable pg_cron — you can still call publish_and_expire_notifications via API route.

CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.unschedule(j.jobid)
FROM cron.job j
WHERE j.jobname = 'ultrafinance-notification-lifecycle';

SELECT cron.schedule(
  'ultrafinance-notification-lifecycle',
  '* * * * *',
  $$SELECT public.publish_and_expire_notifications()$$
);
