# 14.2 Admin Panel — Notification Management

## Role: Superadmin

The admin panel is accessible only to users with the `superadmin` role. This role is stored in the `profiles` table and enforced by both RLS policies and frontend route guards.

```sql
-- Add role to profiles table
ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'user' 
  CHECK (role IN ('user', 'admin', 'superadmin'));
```

---

## Admin Route Structure (Next.js)

```
src/app/(admin)/
├── layout.tsx              # Admin layout with admin sidebar
├── admin/
│   ├── page.tsx            # Admin dashboard (overview stats)
│   ├── notifications/
│   │   ├── page.tsx        # Notification list + management
│   │   └── new/page.tsx    # Create new notification form
│   └── versions/
│       ├── page.tsx        # Version history + management
│       └── new/page.tsx    # Publish new version
```

### Route Protection Middleware

```tsx
// middleware.ts — extend existing auth middleware
if (request.nextUrl.pathname.startsWith('/admin')) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));
  
  // Check superadmin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  
  if (profile?.role !== 'superadmin') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
}
```

---

## Notification Creation Form

The admin notification form includes:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| Title | Text input | Yes | Short title (max 100 chars) |
| Body | Rich text / Markdown | Yes | Notification content (max 2000 chars) |
| Type | Select | Yes | `release`, `maintenance`, `alert`, `feature`, `info` |
| Priority | Select | Yes | `low`, `normal`, `high`, `critical` |
| Target Platform | Multi-select | No | `desktop`, `mobile`, `all` (default: all) |
| Target Min Version | Text | No | e.g., `0.0.1` — only show to users >= this version |
| Target Max Version | Text | No | e.g., `0.0.3` — only show to users <= this version |
| Action URL | URL input | No | Link to changelog, feature page, or external URL |
| Action Label | Text | No | Button text e.g., "View Changelog", "Update Now" |
| Scheduled At | Datetime picker | No | Schedule for future delivery (null = immediate) |
| Expires At | Datetime picker | No | Auto-hide after this time |
| Is Dismissible | Checkbox | Yes | Whether users can dismiss this notification |
| Show as Banner | Checkbox | No | Show as a persistent banner bar on dashboard |

### Form Submission Flow

```tsx
// features/admin/services/admin-notifications.service.ts
export async function createNotification(data: CreateNotificationInput) {
  const supabase = createClient();
  
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      title: data.title,
      body: data.body,
      type: data.type,
      priority: data.priority,
      target_platform: data.targetPlatform,
      target_min_version: data.targetMinVersion,
      target_max_version: data.targetMaxVersion,
      action_url: data.actionUrl,
      action_label: data.actionLabel,
      scheduled_at: data.scheduledAt,
      expires_at: data.expiresAt,
      is_dismissible: data.isDismissible,
      show_as_banner: data.showAsBanner,
      status: data.scheduledAt ? 'scheduled' : 'published',
      created_by: (await supabase.auth.getUser()).data.user?.id,
    })
    .select()
    .single();

  if (error) throw error;

  // If immediate (not scheduled), trigger push notification
  if (!data.scheduledAt) {
    await supabase.functions.invoke('send-push-notification', {
      body: { notification_id: notification.id }
    });
  }

  return notification;
}
```

---

## Admin Notification List

The notifications management page shows all notifications in a table with:

- **Status badges**: Published (green), Scheduled (yellow), Draft (gray), Expired (red)
- **Filters**: By type, status, date range
- **Actions**: Edit, Duplicate, Delete, Expire Now
- **Stats**: Read count, dismiss count, click-through rate

```tsx
// Admin can see read/dismiss stats per notification
const { data } = await supabase
  .from('notifications')
  .select(`
    *,
    read_count:notification_reads(count),
    dismiss_count:notification_dismissals(count)
  `)
  .order('created_at', { ascending: false });
```