# 14.4 Notification UI Components & Client Logic

## Dashboard Notification UI

The notification system has three UI surfaces on the user's dashboard:

---

### 1. Notification Bell (Header)

A bell icon in the app header with an unread count badge. Clicking opens a dropdown panel.

```
┌────────────────────────────────────────────────┐
│  UltraFinance          [Search]    🔔³  👤  │
└─────────────────────────────────┴──────────────┘
                                      │
                               ┌──────┴─────────────┐
                               │  Notifications       │
                               ├────────────────────┤
                               │ 🚀 v0.1.0 Released   │
                               │    New features...   │
                               │    2 hours ago       │
                               ├────────────────────┤
                               │ 🛠️ Maintenance Sat   │
                               │    Downtime 2-4AM    │
                               │    1 day ago         │
                               ├────────────────────┤
                               │  Mark all as read    │
                               └────────────────────┘
```

**Component:** Built with shadcn/ui `Popover` + custom `NotificationList`.

---

### 2. Dashboard Banner Bar

For high-priority notifications (`show_as_banner = true`), a persistent banner appears at the top of the dashboard:

```
┌─────────────────────────────────────────────────────────┐
│ ⚠️  Scheduled maintenance: Saturday 2-4AM UTC.     × │
│    Services may be temporarily unavailable.          │
└─────────────────────────────────────────────────────────┘
```

**Color-coded by type:**

- `alert` / `critical` → Red background (`bg-destructive/10 border-destructive`)
- `maintenance` → Yellow background (`bg-warning/10 border-warning`)
- `release` / `feature` → Blue background (`bg-info/10 border-info`)

---

### 3. Toast Notification (Real-time)

When a new notification arrives via Supabase Realtime, a toast pops up in the bottom-right corner using **sonner**:

```tsx
// hooks/useNotificationSubscription.ts
import { useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

export function useNotificationSubscription() {
  useEffect(() => {
    const supabase = createClient();
    
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'notifications',
          filter: 'status=eq.published' },
        (payload) => {
          const notif = payload.new;
          
          // Check targeting (version, platform)
          if (!matchesTarget(notif)) return;
          
          // Show toast
          toast(notif.title, {
            description: notif.body.substring(0, 100),
            action: notif.action_url ? {
              label: notif.action_label || 'View',
              onClick: () => window.open(notif.action_url)
            } : undefined,
          });
          
          // Refresh notification list
          invalidateNotifications();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);
}
```

---

## Electron Native Notifications

When the app is minimized to tray, notifications are shown as OS-level notifications via Electron:

```tsx
// electron/ipc/notifications.ts
import { Notification, BrowserWindow } from 'electron';

export function showNativeNotification(title: string, body: string, onClick?: () => void) {
  const notification = new Notification({
    title,
    body,
    icon: path.join(__dirname, '../assets/icon.png'),
    silent: false,
  });

  notification.on('click', () => {
    // Bring window to front
    const win = BrowserWindow.getAllWindows()[0];
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
    }
    onClick?.();
  });

  notification.show();
}
```

**IPC Bridge:** The renderer process sends a message to the main process when a notification arrives while the window is not focused:

```tsx
// In renderer (React)
if (!document.hasFocus()) {
  window.electronAPI.showNativeNotification(notif.title, notif.body);
}
```

---

## Notification Service (Client-Side)

```tsx
// features/notifications/services/notifications.service.ts
export const notificationService = {
  async getUnread() {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    return supabase
      .from('notifications')
      .select('*')
      .eq('status', 'published')
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .not('id', 'in', 
        supabase.from('notification_reads').select('notification_id').eq('user_id', user!.id)
      )
      .not('id', 'in',
        supabase.from('notification_dismissals').select('notification_id').eq('user_id', user!.id)
      )
      .order('published_at', { ascending: false });
  },

  async markAsRead(notificationId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from('notification_reads').upsert({
      notification_id: notificationId,
      user_id: user!.id,
    });
  },

  async dismiss(notificationId: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    return supabase.from('notification_dismissals').upsert({
      notification_id: notificationId,
      user_id: user!.id,
    });
  },

  async getAll(includeRead = false) {
    const supabase = createClient();
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(50);
    return query;
  }
};
```