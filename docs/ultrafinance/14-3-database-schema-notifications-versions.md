# 14.3 Database Schema (Notifications & Versions)

## Database Tables

### `notifications` — Admin-created alerts

```sql
CREATE TABLE public.notifications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title             TEXT NOT NULL,
  body              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN ('release', 'maintenance', 'alert', 'feature', 'info')),
  priority          TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'critical')),
  
  -- Action
  action_url        TEXT,              -- Link to changelog, feature page, etc.
  action_label      TEXT,              -- Button text: "View Changelog", "Update Now"
  
  -- Targeting
  target_platform   TEXT[] DEFAULT '{all}',   -- ['desktop'], ['mobile'], ['all']
  target_min_version TEXT,              -- Show only to users >= this version
  target_max_version TEXT,              -- Show only to users <= this version
  
  -- Display
  show_as_banner    BOOLEAN NOT NULL DEFAULT false,  -- Persistent banner on dashboard
  is_dismissible    BOOLEAN NOT NULL DEFAULT true,
  
  -- Lifecycle
  status            TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'expired')),
  scheduled_at      TIMESTAMPTZ,       -- NULL = publish immediately
  expires_at        TIMESTAMPTZ,       -- NULL = never expires
  published_at      TIMESTAMPTZ,       -- Set when actually published
  
  -- Metadata
  created_by        UUID NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_status ON notifications(status);
CREATE INDEX idx_notifications_published ON notifications(published_at DESC)
  WHERE status = 'published';
```

---

### `notification_reads` — Tracks which users have read which notifications

```sql
CREATE TABLE public.notification_reads (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notif_reads_user ON notification_reads(user_id);
CREATE INDEX idx_notif_reads_notification ON notification_reads(notification_id);
```

---

### `notification_dismissals` — Tracks which users have dismissed which notifications

```sql
CREATE TABLE public.notification_dismissals (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id   UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dismissed_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(notification_id, user_id)
);

CREATE INDEX idx_notif_dismiss_user ON notification_dismissals(user_id);
```

---

### `push_tokens` — Device tokens for push notifications

```sql
CREATE TABLE public.push_tokens (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token             TEXT NOT NULL,
  platform          TEXT NOT NULL CHECK (platform IN ('desktop', 'android', 'ios')),
  app_version       TEXT NOT NULL,           -- e.g., '0.0.1'
  device_info       JSONB,                   -- OS, model, etc.
  is_active         BOOLEAN NOT NULL DEFAULT true,
  last_used_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(user_id, token)
);

CREATE INDEX idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX idx_push_tokens_active ON push_tokens(is_active) WHERE is_active = true;
```

---

### `app_versions` — Version registry for auto-update control

```sql
CREATE TABLE public.app_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Version info
  version           TEXT NOT NULL UNIQUE,     -- Semver: '0.0.1', '0.1.0', '1.0.0'
  platform          TEXT NOT NULL CHECK (platform IN ('desktop', 'android', 'ios')),
  
  -- Release assets
  release_notes     TEXT,                     -- Markdown changelog
  download_url      TEXT,                     -- Direct download URL (S3, GitHub Releases)
  
  -- Platform-specific asset URLs
  asset_url_win     TEXT,                     -- Windows .exe / .msi installer
  asset_url_mac     TEXT,                     -- macOS .dmg
  asset_url_linux   TEXT,                     -- Linux .AppImage / .deb
  
  -- Update control
  is_critical       BOOLEAN NOT NULL DEFAULT false,  -- Force update (no skip)
  is_published      BOOLEAN NOT NULL DEFAULT false,  -- Visible to users
  rollout_percentage INTEGER NOT NULL DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
  min_os_version    TEXT,                     -- Minimum OS requirement
  
  -- Lifecycle
  published_at      TIMESTAMPTZ,
  created_by        UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_app_versions_platform ON app_versions(platform, is_published);
CREATE INDEX idx_app_versions_version ON app_versions(version);
```

---

## Entity Relationships

```
profiles
  ├── 1:N ── notification_reads
  ├── 1:N ── notification_dismissals
  ├── 1:N ── push_tokens
  └── 1:N ── notifications (as created_by, superadmin only)

notifications
  ├── 1:N ── notification_reads
  └── 1:N ── notification_dismissals

app_versions (standalone, queried by Electron updater)
```

---

## Key Queries

### Get unread notifications for a user

```sql
SELECT n.* FROM notifications n
WHERE n.status = 'published'
  AND (n.expires_at IS NULL OR n.expires_at > now())
  AND ('all' = ANY(n.target_platform) OR 'desktop' = ANY(n.target_platform))
  AND NOT EXISTS (
    SELECT 1 FROM notification_reads nr
    WHERE nr.notification_id = n.id AND nr.user_id = :user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM notification_dismissals nd
    WHERE nd.notification_id = n.id AND nd.user_id = :user_id
  )
ORDER BY n.published_at DESC;
```

### Get latest published version for auto-update check

```sql
SELECT * FROM app_versions
WHERE platform = 'desktop'
  AND is_published = true
ORDER BY created_at DESC
LIMIT 1;
```