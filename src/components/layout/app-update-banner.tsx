"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getDesktopInstallId } from "@/lib/install-id";
import { cn } from "@/lib/utils";

type EdgePayload = {
  update_available: boolean;
  version?: string;
  release_notes?: string | null;
  download_url?: string | null;
  is_critical?: boolean;
};

type UpdaterPayload =
  | { type: "available"; version?: string; releaseNotes?: string | null }
  | { type: "downloaded"; version?: string }
  | { type: "error"; message?: string };

export function AppUpdateBanner() {
  const [edge, setEdge] = useState<EdgePayload | null>(null);
  const [ghDownloaded, setGhDownloaded] = useState<{
    version?: string;
  } | null>(null);

  useEffect(() => {
    const unsub = window.electronAPI?.onUpdaterEvent?.((raw) => {
      const p = raw as UpdaterPayload;
      if (p.type === "downloaded") {
        setGhDownloaded({ version: p.version });
      }
    });
    return () => {
      unsub?.();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!base || !anon) return;

      let current =
        process.env.NEXT_PUBLIC_APP_VERSION?.trim() || "0.1.0";
      if (window.electronAPI?.getAppVersion) {
        try {
          current = await window.electronAPI.getAppVersion();
        } catch {
          /* keep env */
        }
      }

      const platform = window.electronAPI?.platform
        ? window.electronAPI.platform === "win32"
          ? "win32"
          : window.electronAPI.platform === "darwin"
            ? "darwin"
            : "linux"
        : navigator.userAgent.includes("Win")
          ? "win32"
          : "darwin";

      try {
        const res = await fetch(`${base}/functions/v1/check-update`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${anon}`,
            apikey: anon,
            "x-client-id": getDesktopInstallId(),
          },
          body: JSON.stringify({
            current_version: current,
            platform,
          }),
        });

        if (!res.ok) return;

        const json = (await res.json()) as EdgePayload;
        if (!cancelled && json?.update_available) {
          setEdge(json);
        }
      } catch {
        /* Function not deployed, offline, or CORS — ignore (see .env.example). */
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (ghDownloaded) {
    return (
      <div
        className={cn(
          "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/40 bg-primary/10 px-4 py-3 text-sm shadow-sm"
        )}
      >
        <p className="min-w-0">
          <span className="font-medium">Update ready</span>{" "}
          {ghDownloaded.version ? (
            <span className="font-mono">v{ghDownloaded.version}</span>
          ) : null}
          <span className="text-muted-foreground">
            {" "}
            — Restart to finish installing (GitHub release).
          </span>
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => void window.electronAPI?.installUpdate?.()}
        >
          Restart &amp; update
        </Button>
      </div>
    );
  }

  if (!edge?.update_available || !edge.version) return null;

  return (
    <div
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm shadow-sm",
        edge.is_critical
          ? "border-destructive/50 bg-destructive/10"
          : "border-border bg-muted/50"
      )}
    >
      <p className="min-w-0">
        <span className="font-medium">Update available</span>{" "}
        <span className="font-mono">v{edge.version}</span>
        {edge.release_notes ? (
          <span className="text-muted-foreground">
            {" "}
            — {edge.release_notes.slice(0, 160)}
            {edge.release_notes.length > 160 ? "…" : ""}
          </span>
        ) : null}
      </p>
      {edge.download_url ? (
        <Button
          size="sm"
          variant={edge.is_critical ? "destructive" : "default"}
          asChild
        >
          <a
            href={edge.download_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            Download
          </a>
        </Button>
      ) : null}
    </div>
  );
}
