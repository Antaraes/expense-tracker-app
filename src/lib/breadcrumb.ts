/** Human labels for known URL segments (App Router paths under (dashboard)). */

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  transactions: "Transactions",
  accounts: "Accounts",
  categories: "Categories",
  reports: "Reports",
  monthly: "Monthly",
  weekly: "Weekly",
  settings: "Settings",
  budgets: "Budgets",
  recurring: "Recurring",
  new: "New",
  edit: "Edit",
  "currency-exposure": "Currency exposure",
};

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

function titleCaseSegment(seg: string): string {
  return seg
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function resolveLabel(seg: string, prev: string | undefined): string {
  if (isUuid(seg)) {
    if (prev === "transactions") return "Transaction";
    if (prev === "accounts") return "Account";
    return "Details";
  }
  if (seg === "categories" && prev === "reports") {
    return "Spending by category";
  }
  return SEGMENT_LABELS[seg] ?? titleCaseSegment(seg);
}

export type BreadcrumbItem = { label: string; href?: string };

/**
 * Builds clickable trail: Dashboard is the app root for every page except /dashboard itself.
 */
export function buildBreadcrumbFromPathname(pathname: string): BreadcrumbItem[] {
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return [{ label: "Dashboard", href: undefined }];
  }

  if (parts[0] === "dashboard" && parts.length === 1) {
    return [{ label: "Dashboard", href: undefined }];
  }

  const items: BreadcrumbItem[] = [];

  if (parts[0] !== "dashboard") {
    items.push({ label: "Dashboard", href: "/dashboard" });
  }

  let start = 0;
  if (parts[0] === "dashboard") {
    start = 1;
    if (start >= parts.length) {
      return [{ label: "Dashboard", href: undefined }];
    }
  }

  for (let i = start; i < parts.length; i++) {
    const path = "/" + parts.slice(0, i + 1).join("/");
    const isLast = i === parts.length - 1;
    const prev = i > 0 ? parts[i - 1] : undefined;
    const label = resolveLabel(parts[i]!, prev);
    if (isLast) {
      items.push({ label, href: undefined });
    } else {
      items.push({ label, href: path });
    }
  }

  return items;
}
