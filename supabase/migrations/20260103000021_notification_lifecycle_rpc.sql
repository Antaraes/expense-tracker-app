-- Publish scheduled notifications and expire past notifications (Phase 1 doc 14.7).
-- Call via pg_cron, Supabase scheduled Edge Function, or GET /api/cron/notification-lifecycle (service role).

CREATE OR REPLACE FUNCTION public.publish_and_expire_notifications()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.notifications
  SET
    status = 'published',
    published_at = COALESCE(published_at, now()),
    updated_at = now()
  WHERE status = 'scheduled'
    AND scheduled_at IS NOT NULL
    AND scheduled_at <= now();

  UPDATE public.notifications
  SET status = 'expired', updated_at = now()
  WHERE status = 'published'
    AND expires_at IS NOT NULL
    AND expires_at < now();
END;
$$;

REVOKE ALL ON FUNCTION public.publish_and_expire_notifications() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_and_expire_notifications() TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_and_expire_notifications() TO postgres;

COMMENT ON FUNCTION public.publish_and_expire_notifications() IS
  'Scheduled job: publish due notifications and mark expired ones. Not exposed to anon/authenticated.';
