"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { profilesService } from "@/features/profiles/services/profiles.service";
import { showDesktopNotification } from "@/lib/browser-notifications";
import { recurringService } from "@/features/recurring/services/recurring.service";

function monthRange(yearMonth: string) {
  const [y, m] = yearMonth.split("-").map(Number);
  if (!y || !m) return { from: "", to: "" };
  const last = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(last).padStart(2, "0")}`;
  return { from: `${yearMonth}-01`, to: end };
}

async function fetchSpendByCategory(
  from: string,
  to: string
): Promise<Map<string, number>> {
  const supabase = createClient();
  const { data: txs } = await supabase
    .from("transactions")
    .select("category_id, transaction_lines (base_amount)")
    .eq("type", "expense")
    .gte("date", from)
    .lte("date", to);

  const map = new Map<string, number>();
  for (const t of txs ?? []) {
    const cid = t.category_id ?? "__none__";
    const lines = t.transaction_lines as { base_amount: string }[] | null;
    const sum = Math.abs(
      (lines ?? []).reduce((s, l) => s + Number(l.base_amount), 0)
    );
    map.set(cid, (map.get(cid) ?? 0) + sum);
  }
  return map;
}

type ProfileRow = {
  push_notifications_enabled?: boolean;
  budget_alerts_enabled?: boolean;
  recurring_reminders_enabled?: boolean;
  budget_alert_threshold_pct?: number;
};

export function PushNotificationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: prof } = await profilesService.getMine();
      if (!prof || cancelled) return;
      const p = prof as ProfileRow;

      const { data: n, error } = await recurringService.processDue();
      const recurringOn = p.recurring_reminders_enabled ?? true;
      if (
        !error &&
        typeof n === "number" &&
        n > 0 &&
        (p.push_notifications_enabled ?? false) &&
        recurringOn &&
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted"
      ) {
        showDesktopNotification("Recurring transactions", {
          body: `${n} scheduled transaction(s) were created.`,
        });
      }

      if (
        !p.push_notifications_enabled ||
        !p.budget_alerts_enabled ||
        typeof window === "undefined" ||
        !("Notification" in window) ||
        Notification.permission !== "granted"
      ) {
        return;
      }

      const now = new Date();
      const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const { from, to } = monthRange(ym);
      if (!from) return;

      const { data: budgets } = await supabase
        .from("budgets")
        .select("id, category_id, amount")
        .eq("year_month", ym);

      if (!budgets?.length) return;

      const spendMap = await fetchSpendByCategory(from, to);
      const threshold = (p.budget_alert_threshold_pct ?? 80) / 100;

      for (const b of budgets) {
        const cap = Number(b.amount);
        const spent = spendMap.get(b.category_id) ?? 0;
        if (cap <= 0) continue;
        const ratio = spent / cap;
        if (ratio < threshold) continue;
        const key = `budget-alert-${b.category_id}-${ym}`;
        try {
          if (sessionStorage.getItem(key)) continue;
          sessionStorage.setItem(key, "1");
        } catch {
          /* ignore */
        }
        showDesktopNotification("Budget alert", {
          body: `Spending reached ${Math.round(ratio * 100)}% of budget (${spent.toFixed(0)} / ${cap.toFixed(0)} in base currency).`,
        });
      }
    }

    void run();

    const interval = window.setInterval(() => {
      void run();
    }, 3 * 60 * 1000);

    const onVis = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return <>{children}</>;
}
