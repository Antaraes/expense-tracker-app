-- Phase 2: version registry for update checks (doc 14.3 / 14.5).

CREATE TABLE public.app_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('desktop', 'android', 'ios')),
  release_notes text,
  download_url text,
  asset_url_win text,
  asset_url_mac text,
  asset_url_linux text,
  is_critical boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  rollout_percentage integer NOT NULL DEFAULT 100
    CHECK (rollout_percentage BETWEEN 0 AND 100),
  min_os_version text,
  published_at timestamptz,
  created_by uuid REFERENCES public.profiles (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (version, platform)
);

CREATE INDEX idx_app_versions_platform_published
  ON public.app_versions (platform, is_published, published_at DESC);

CREATE OR REPLACE FUNCTION public.touch_app_versions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER app_versions_set_updated_at
  BEFORE UPDATE ON public.app_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_app_versions_updated_at();

ALTER TABLE public.app_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app_versions_select"
  ON public.app_versions FOR SELECT TO authenticated
  USING (
    is_published = true
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

CREATE POLICY "app_versions_superadmin_insert"
  ON public.app_versions FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
    AND created_by = auth.uid()
  );

CREATE POLICY "app_versions_superadmin_update"
  ON public.app_versions FOR UPDATE TO authenticated
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

CREATE POLICY "app_versions_superadmin_delete"
  ON public.app_versions FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'superadmin'
    )
  );

COMMENT ON TABLE public.app_versions IS
  'Released app builds; Edge Function check-update uses service role.';
