/** Web Notification API — works in Chromium/Electron; requires user gesture or prior permission. */

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "denied";
  }
  if (Notification.permission === "granted") {
    return "granted";
  }
  return Notification.requestPermission();
}

export function showDesktopNotification(title: string, options?: NotificationOptions) {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return;
  }
  if (Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, {
      icon: "/favicon.ico",
      silent: false,
      ...options,
    });
  } catch {
    /* ignore */
  }
}
