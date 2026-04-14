-- Superadmin-only stats for notifications; desktop version distribution for analytics.

CREATE OR REPLACE FUNCTION public.get_notification_engagement_stats()
RETURNS TABLE (
  notification_id uuid,
  read_count bigint,
  dismiss_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    n.id,
    (SELECT count(*)::bigint FROM public.notification_reads nr WHERE nr.notification_id = n.id),
    (SELECT count(*)::bigint FROM public.notification_dismissals nd WHERE nd.notification_id = n.id)
  FROM public.notifications n;
END;
$$;

REVOKE ALL ON FUNCTION public.get_notification_engagement_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_notification_engagement_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_desktop_version_distribution()
RETURNS TABLE (
  app_version text,
  device_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'superadmin'
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    t.app_version,
    count(*)::bigint AS device_count
  FROM public.push_tokens t
  WHERE t.platform = 'desktop'
    AND t.is_active = true
  GROUP BY t.app_version
  ORDER BY count(*) DESC, t.app_version ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_desktop_version_distribution() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_desktop_version_distribution() TO authenticated;
