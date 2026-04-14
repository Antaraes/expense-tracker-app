/** Stable per-browser install id for rollout bucketing + desktop push token key. */
export function getDesktopInstallId(): string {
  if (typeof window === "undefined") return "ssr";
  const k = "ultrafinance:install-id";
  try {
    let id = window.localStorage.getItem(k);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(k, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}
