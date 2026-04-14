import { inSemverRange } from "@/lib/semver";

export function defaultAppVersion(): string {
  return (
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_APP_VERSION) ||
    "0.1.0"
  );
}

export function platformsMatch(target: string[] | null | undefined): boolean {
  const p = target?.length ? target : ["all"];
  return p.includes("all") || p.includes("desktop");
}

export function notificationVisibleForClient(
  row: {
    target_platform: string[] | null;
    target_min_version: string | null;
    target_max_version: string | null;
  },
  appVersion: string = defaultAppVersion()
): boolean {
  if (!platformsMatch(row.target_platform ?? undefined)) return false;
  return inSemverRange(
    appVersion,
    row.target_min_version,
    row.target_max_version
  );
}
