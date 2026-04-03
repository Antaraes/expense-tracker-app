"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const KEY = "ultrafinance.notifications.reminders";

export function NotificationPreferences() {
  const [enabled, setEnabled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setEnabled(localStorage.getItem(KEY) === "1");
    } catch {
      setEnabled(false);
    }
  }, []);

  function toggle(next: boolean) {
    setEnabled(next);
    try {
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {
      /* ignore */
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <Card className="max-w-lg border-border">
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Local preference only — bill reminders and push are not wired yet.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <input
            id="notif-reminders"
            type="checkbox"
            className="size-4 rounded border-input"
            checked={enabled}
            onChange={(e) => toggle(e.target.checked)}
          />
          <Label htmlFor="notif-reminders" className="font-normal">
            I want in-app reminders when they are available
          </Label>
        </div>
      </CardContent>
    </Card>
  );
}
