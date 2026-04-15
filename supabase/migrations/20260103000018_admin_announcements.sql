-- Phase 1: Admin broadcast notifications (doc 14), profiles.role, push_tokens for devices.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'superadmin'));

COMMENT ON COLUMN public.profiles.role IS 'Access control; superadmin manages global notifications.';

-- ---------------------------------------------------------------------------
-- Admin-created notifications (broadcast)
-- ---------------------------------------------------------------------------

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL CHECK (type IN ('release', 'maintenance', 'alert', 'feature', 'info')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  action_url text,
  action_label text,
  target_platform text[] NOT NULL DEFAULT '{all}',
  target_min_version text,
  target_max_version text,
  show_as_banner boolean NOT NULL DEFAULT false,
  is_dismissible boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'expired')),
  scheduled_at timestamptz,
  expires_at timestamptz,
  published_at timestamptz,
  created_by uuid NOT NULL REFERENCES public.profiles (id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_status ON public.notifications (status);
CREATE INDEX idx_notifications_published ON public.notifications (published_at DESC)
  WHERE status = 'published';

CREATE TABLE public.notification_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notif_reads_user ON public.notification_reads (user_id);
CREATE INDEX idx_notif_reads_notification ON public.notification_reads (notification_id);

CREATE TABLE public.notification_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id uuid NOT NULL REFERENCES public.notifications (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_id, user_id)
);

CREATE INDEX idx_notif_dismiss_user ON public.notification_dismissals (user_id);

CREATE TABLE public.push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  token text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('desktop', 'android', 'ios')),
  app_version text NOT NULL,
  device_info jsonb,
  is_active boolean NOT NULL DEFAULT true,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

CREATE INDEX idx_push_tokens_user ON public.push_tokens (user_id);
CREATE INDEX idx_push_tokens_active ON public.push_tokens (is_active) WHERE is_active = true;

-- updated_at touch
CREATE OR REPLACE FUNCTION public.touch_notifications_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER notifications_set_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_notifications_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Published notifications readable by any authenticated user (filtering in app for targeting)
CREATE POLICY "notifications_select_published"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    status = 'published'
    AND (expires_at IS NULL OR expires_at > now())
  );

CREATE POLICY "notifications_superadmin_select"
  ON public.notifications FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "notifications_superadmin_insert"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "notifications_superadmin_update"
  ON public.notifications FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "notifications_superadmin_delete"
  ON public.notifications FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "notification_reads_own"
  ON public.notification_reads FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notification_dismissals_own"
  ON public.notification_dismissals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_tokens_own"
  ON public.push_tokens FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow reading own role on profiles (already select own) — superadmin insert notifications needs no extra profile select for others

COMMENT ON TABLE public.notifications IS 'Admin broadcast announcements; enable Realtime + replication in Supabase Dashboard for live delivery.';
