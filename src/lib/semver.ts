/** Minimal semver compare for x.y.z style app versions. */

export function compareSemver(a: string, b: string): number {
  const pa = a.split(/[.+]/).map((x) => Number.parseInt(x, 10) || 0);
  const pb = b.split(/[.+]/).map((x) => Number.parseInt(x, 10) || 0);
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da !== db) return da - db;
  }
  return 0;
}

export function inSemverRange(
  current: string,
  min: string | null | undefined,
  max: string | null | undefined
): boolean {
  if (min && compareSemver(current, min) < 0) return false;
  if (max && compareSemver(current, max) > 0) return false;
  return true;
}
