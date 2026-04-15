# 14.7 Security, Scheduled Tasks & Implementation Checklist

## RLS Policies for Notification Tables

### `notifications` table

```sql
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- All authenticated users can READ published notifications
CREATE POLICY "Anyone can read published notifications" ON notifications
  FOR SELECT
  USING (status = 'published');

-- Only superadmins can INSERT
CREATE POLICY "Superadmins can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Only superadmins can UPDATE
CREATE POLICY "Superadmins can update notifications" ON notifications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );

-- Only superadmins can DELETE
CREATE POLICY "Superadmins can delete notifications" ON notifications
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
```

### `notification_reads` and `notification_dismissals`

```sql
ALTER TABLE notification_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_dismissals ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own read records
CREATE POLICY "Users manage own reads" ON notification_reads
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users manage own dismissals" ON notification_dismissals
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

### `app_versions` table

```sql
ALTER TABLE app_versions ENABLE ROW LEVEL SECURITY;

-- Published versions are readable by all authenticated users
-- (Electron updater uses Edge Function with service role, not direct access)
CREATE POLICY "Anyone can read published versions" ON app_versions
  FOR SELECT
  USING (is_published = true);

-- Only superadmins can manage versions
CREATE POLICY "Superadmins manage versions" ON app_versions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'superadmin'
    )
  );
```

### `push_tokens` table

```sql
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own push tokens
CREATE POLICY "Users manage own tokens" ON push_tokens
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

---

## Scheduled Tasks (Supabase pg_cron)

```sql
-- Auto-expire notifications past their expires_at
SELECT cron.schedule(
  'expire-notifications',
  '*/15 * * * *',  -- Every 15 minutes
  $$
    UPDATE notifications
    SET status = 'expired', updated_at = now()
    WHERE status = 'published'
      AND expires_at IS NOT NULL
      AND expires_at < now();
  $$
);

-- Auto-publish scheduled notifications
SELECT cron.schedule(
  'publish-scheduled-notifications',
  '* * * * *',  -- Every minute
  $$
    UPDATE notifications
    SET status = 'published', published_at = now(), updated_at = now()
    WHERE status = 'scheduled'
      AND scheduled_at IS NOT NULL
      AND scheduled_at <= now();
  $$
);

-- Clean up inactive push tokens (not seen in 90 days)
SELECT cron.schedule(
  'cleanup-push-tokens',
  '0 3 * * 0',  -- Every Sunday at 3 AM
  $$
    UPDATE push_tokens
    SET is_active = false
    WHERE last_used_at < now() - interval '90 days'
      AND is_active = true;
  $$
);
```

---

## Implementation Checklist

### Phase 1: Notification System (v0.0.2)

- [ ]  Add `role` column to `profiles` table
- [ ]  Create `notifications`, `notification_reads`, `notification_dismissals` tables
- [ ]  Create `push_tokens` table
- [ ]  Set up RLS policies for all new tables
- [ ]  Build admin route group `(admin)/` with role-based middleware
- [ ]  Build admin notification creation form
- [ ]  Build admin notification list with stats
- [ ]  Build notification bell component in header
- [ ]  Build dashboard banner bar component
- [ ]  Set up Supabase Realtime subscription for new notifications
- [ ]  Integrate Electron native notifications (via IPC)
- [ ]  Build notification service (getUnread, markAsRead, dismiss)
- [ ]  Set up pg_cron jobs for auto-expire and auto-publish
- [ ]  Test: Create notification as admin → appears in user app in real-time

### Phase 2: Version Control System (v0.0.3)

- [ ]  Create `app_versions` table
- [ ]  Build Supabase Edge Function `/check-update`
- [ ]  Build Electron auto-updater module (`electron/updater.ts`)
- [ ]  Build update banner component in dashboard layout
- [ ]  Build critical update modal (blocking, non-dismissible)
- [ ]  Build admin version management page
- [ ]  Build admin version creation form
- [ ]  Implement rollout percentage with deterministic bucketing
- [ ]  Set up electron-builder configuration
- [ ]  Set up GitHub Actions CI/CD for multi-platform builds
- [ ]  Implement version reporting on app startup
- [ ]  Build version analytics chart in admin panel
- [ ]  Test: Publish version in admin → Electron app detects and offers update

### Phase 3: Push Notifications for Mobile (Future)

- [ ]  Set up Firebase Cloud Messaging (FCM) for Android
- [ ]  Set up Apple Push Notification Service (APNs) for iOS
- [ ]  Build Supabase Edge Function `send-push-notification`
- [ ]  Integrate `supabase_flutter` push token registration
- [ ]  Build Flutter in-app notification UI
- [ ]  Test: Admin sends notification → arrives on both desktop and mobile