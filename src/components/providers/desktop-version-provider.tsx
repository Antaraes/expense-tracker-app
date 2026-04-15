"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDesktopInstallId } from "@/lib/install-id";

/** Reports desktop app version to push_tokens for admin analytics (doc 14.6). */
export function DesktopVersionProvider({
  userId,
  children,
}: {
  userId: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI?.getAppVersion) {
      return;
    }

    let cancelled = false;

    async function report() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id !== userId) return;

      let appVersion =
        process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.1.0";
      if (
        typeof window !== "undefined" &&
        window.electronAPI?.getAppVersion
      ) {
        try {
          appVersion = await window.electronAPI.getAppVersion();
        } catch {
          /* keep env */
        }
      }

      if (cancelled) return;

      const token = `desktop-${getDesktopInstallId()}`;

      await supabase.from("push_tokens").upsert(
        {
          user_id: user.id,
          token,
          platform: "desktop",
          app_version: appVersion,
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        { onConflict: "user_id,token" }
      );
    }

    void report();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <>{children}</>;
}
