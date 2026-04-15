/** Fired when reads/dismissals change so NotificationBanner can refetch (router.refresh() does not reset client state). */

export const ANNOUNCEMENTS_CHANGED = "ultrafinance:announcements-changed";

export function dispatchAnnouncementsChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(ANNOUNCEMENTS_CHANGED));
}
