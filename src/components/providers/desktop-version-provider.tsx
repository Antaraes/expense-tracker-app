"use client";

import { useEffect } from "react";
import { pushTokensService } from "@/features/settings/services/push-tokens.service";

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
      await pushTokensService.reportDesktopVersion(userId, appVersion);
    }

    void report();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return <>{children}</>;
}
