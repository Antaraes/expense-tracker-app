"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { profilesService } from "@/features/profiles/services/profiles.service";
import { APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  requestNotificationPermission,
  getNotificationPermission,
  showDesktopNotification,
} from "@/lib/browser-notifications";

type Profile = {
  push_notifications_enabled?: boolean;
  budget_alerts_enabled?: boolean;
  recurring_reminders_enabled?: boolean;
  budget_alert_threshold_pct?: number;
};

export function NotificationPreferences({ profile }: { profile: Profile | null }) {
  const router = useRouter();
  const [perm, setPerm] = useState<NotificationPermission>("default");
  const [pushEnabled, setPushEnabled] = useState(
    profile?.push_notifications_enabled ?? false
  );
  const [budgetAlerts, setBudgetAlerts] = useState(
    profile?.budget_alerts_enabled ?? true
  );
  const [recurringReminders, setRecurringReminders] = useState(
    profile?.recurring_reminders_enabled ?? true
  );
  const [threshold, setThreshold] = useState(
    String(profile?.budget_alert_threshold_pct ?? 80)
  );
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [testPending, setTestPending] = useState(false);
  const testTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPerm(getNotificationPermission());
    }
  }, []);

  useEffect(() => {
    return () => {
      if (testTimerRef.current) {
        clearTimeout(testTimerRef.current);
        testTimerRef.current = null;
      }
    };
  }, []);

  async function scheduleTestNotification() {
    setMsg(null);
    if (typeof window === "undefined" || !("Notification" in window)) {
      setMsg("Notifications are not supported in this environment.");
      return;
    }
    let p = Notification.permission;
    if (p !== "granted") {
      p = await requestNotificationPermission();
      setPerm(p);
    }
    if (p !== "granted") {
      setMsg("Allow notifications first (button above), then try the test again.");
      return;
    }
    if (testTimerRef.current) {
      clearTimeout(testTimerRef.current);
      testTimerRef.current = null;
    }
    setTestPending(true);
    setMsg(
      "Test scheduled — a welcome notification will appear in 10 seconds. You can leave this page."
    );
    testTimerRef.current = setTimeout(() => {
      testTimerRef.current = null;
      setTestPending(false);
      showDesktopNotification(`Welcome to ${APP_NAME}`, {
        body: "Your desktop notifications are working. This was a test from Settings.",
      });
      setMsg(
        "Test sent. Check the system notification area (tray / Notification Center)."
      );
    }, 10_000);
  }

  async function requestDesktopPermission() {
    setMsg(null);
    const p = await requestNotificationPermission();
    setPerm(p);
    if (p === "granted") {
      setLoading(true);
      const { error } = await profilesService.updateMine({
        push_notifications_enabled: true,
      });
      setLoading(false);
      if (error) {
        setMsg(error.message);
        return;
      }
      setPushEnabled(true);
      router.refresh();
      setMsg("Notifications allowed. You can turn them off below anytime.");
    } else if (p === "denied") {
      setMsg(
        "Notifications were blocked. Enable them in your browser or system settings for this site/app."
      );
    }
  }

  async function savePrefs(partial: Partial<Profile>) {
    setLoading(true);
    setMsg(null);
    const { error } = await profilesService.updateMine(partial);
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.refresh();
    setMsg("Saved.");
  }

  return (
    <Card className="max-w-lg border-border">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Desktop alerts use the system notification area (same permission model as
          other sites and Electron). Optional: enable Supabase Realtime on{" "}
          <code className="text-xs">user_notifications</code> in the dashboard for
          live delivery when the app is open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Browser permission:{" "}
            <span className="font-mono text-foreground">{perm}</span>
          </p>
          {perm !== "granted" ? (
            <Button
              type="button"
              size="sm"
              disabled={loading}
              onClick={() => void requestDesktopPermission()}
            >
              Allow desktop notifications
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Permission granted. Budget and recurring alerts use this channel when
              enabled below.
            </p>
          )}
        </div>

        <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
          <p className="text-sm font-medium">Test desktop notification</p>
          <p className="text-xs text-muted-foreground">
            Schedules a sample welcome notification after 10 seconds so you can
            confirm alerts appear outside the browser window.
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={loading || testPending}
            onClick={() => void scheduleTestNotification()}
          >
            {testPending ? "Waiting 10s…" : "Send test in 10 seconds"}
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="push-master"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={pushEnabled}
            disabled={perm !== "granted"}
            onChange={(e) => {
              const next = e.target.checked;
              setPushEnabled(next);
              void savePrefs({ push_notifications_enabled: next });
            }}
          />
          <Label htmlFor="push-master" className="font-normal">
            Use desktop notifications (requires permission above)
          </Label>
        </div>

        <div className="flex items-center gap-3">
          <input
            id="budget-alerts"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={budgetAlerts}
            onChange={(e) => {
              const next = e.target.checked;
              setBudgetAlerts(next);
              void savePrefs({ budget_alerts_enabled: next });
            }}
          />
          <Label htmlFor="budget-alerts" className="font-normal">
            Alert when spending crosses budget threshold
          </Label>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="threshold">Budget alert threshold (%)</Label>
          <Input
            id="threshold"
            type="number"
            min={1}
            max={100}
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            onBlur={() => {
              const n = Math.min(
                100,
                Math.max(1, Number.parseInt(threshold, 10) || 80)
              );
              setThreshold(String(n));
              void savePrefs({ budget_alert_threshold_pct: n });
            }}
            className="max-w-[8rem]"
          />
        </div>

        <div className="flex items-center gap-3">
          <input
            id="recurring-rem"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={recurringReminders}
            onChange={(e) => {
              const next = e.target.checked;
              setRecurringReminders(next);
              void savePrefs({ recurring_reminders_enabled: next });
            }}
          />
          <Label htmlFor="recurring-rem" className="font-normal">
            Notify when scheduled recurring transactions are created
          </Label>
        </div>

        {msg ? (
          <p className="text-sm text-muted-foreground" role="status">
            {msg}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
