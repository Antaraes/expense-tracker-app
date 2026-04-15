# 14.1 In-App Notification System

## What This System Does

The in-app notification system enables **superadmins** to broadcast alerts, announcements, and release notes to all users (or targeted segments) directly inside the UltraFinance desktop app. Users see these notifications on their dashboard via a **notification bar** and **notification bell dropdown**.

---

## Notification Types

| Type | Icon | Color | Use Case |
| --- | --- | --- | --- |
| `release` | 🚀 | `info` (blue) | New version released, what's new |
| `maintenance` | 🛠️ | `warning` (yellow) | Scheduled downtime, server maintenance |
| `alert` | ⚠️ | `destructive` (red) | Critical bugs, security issues, urgent notices |
| `feature` | ✨ | `success` (green) | New feature announcement, tips |
| `info` | ℹ️ | `muted` (gray) | General information, tips, promotions |

---

## How It Works (End-to-End Flow)

```
SuperAdmin Dashboard                    Supabase                    User App
┌────────────────────┐          ┌────────────────┐     ┌──────────────────┐
│ 1. Admin creates   │          │                │     │                  │
│    notification    │────────▶│ 2. INSERT into  │     │                  │
│    via form        │          │ notifications  │     │                  │
└────────────────────┘          │    table       │     │                  │
                                │                │     │                  │
                                │ 3. Realtime WS │────▶│ 4. Notification │
                                │    broadcast   │     │    appears in    │
                                │                │     │    bell + bar    │
                                │ 5. Push notif  │────▶│    (if offline, │
                                │    via FCM/APNs│     │    push notif)   │
                                └────────────────┘     └──────────────────┘
```

### Step-by-Step

1. **Superadmin** opens the Admin Panel → Notifications page
2. Fills out the notification form: title, body, type, target audience, scheduled time
3. On submit, a row is inserted into `notifications` table via Supabase
4. **Supabase Realtime** broadcasts the new notification to all connected clients
5. **User's app** receives the event via WebSocket subscription and:
    - Shows a toast notification (transient)
    - Adds the notification to the bell dropdown (persistent)
    - Optionally shows a banner bar on the dashboard (for `alert` and `release` types)
6. If the user is offline, a **push notification** is sent via Supabase Edge Function → FCM/APNs (for future Flutter mobile) or Electron's native notification API
7. User can **mark as read**, **dismiss**, or **click through** to a detail view

---

## Notification Delivery Channels

| Channel | Platform | When Used |
| --- | --- | --- |
| In-app Realtime (WebSocket) | Desktop (Electron) | User has app open |
| In-app Realtime (WebSocket) | Mobile (Flutter, future) | User has app open |
| Push Notification (Electron native) | Desktop | App is in system tray / background |
| Push Notification (FCM) | Android (future) | App is closed or background |
| Push Notification (APNs) | iOS (future) | App is closed or background |

---

## Notification Targeting

Notifications can be targeted to:

- **All users** — Global broadcast (release notes, maintenance)
- **Specific app versions** — e.g., only show "please update" to users on v0.0.1
- **Specific platforms** — Desktop only, mobile only, or all
- **Specific user segments** — Beta testers, premium users (future)

Targeting is controlled by the `target_*` fields in the notifications table.