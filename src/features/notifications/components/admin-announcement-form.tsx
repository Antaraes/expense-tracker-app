"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { adminAnnouncementsService } from "@/features/notifications/services/admin-announcements.service";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Database } from "@/types/database.types";

const PLATFORMS = ["all", "desktop", "android", "ios"] as const;

type NotifRow = Database["public"]["Tables"]["notifications"]["Row"];

function toLocalDatetimeValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function AdminAnnouncementForm({
  notificationId,
}: {
  notificationId?: string;
}) {
  const router = useRouter();
  const isEdit = !!notificationId;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [initialLoad, setInitialLoad] = useState(!isEdit);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [type, setType] =
    useState<"release" | "maintenance" | "alert" | "feature" | "info">("info");
  const [priority, setPriority] = useState<
    "low" | "normal" | "high" | "critical"
  >("normal");
  const [platforms, setPlatforms] = useState<Set<string>>(
    () => new Set(["all"])
  );
  const [targetMin, setTargetMin] = useState("");
  const [targetMax, setTargetMax] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isDismissible, setIsDismissible] = useState(true);
  const [showAsBanner, setShowAsBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!notificationId) {
      setInitialLoad(true);
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data, error } =
        await adminAnnouncementsService.getById(notificationId);
      if (cancelled) return;
      if (error || !data) {
        setLoadError(error?.message ?? "Not found");
        setInitialLoad(true);
        return;
      }
      const row = data as NotifRow;
      setTitle(row.title);
      setBody(row.body);
      setType(row.type);
      setPriority(row.priority as typeof priority);
      const tp = row.target_platform ?? ["all"];
      setPlatforms(new Set(tp.length ? tp : ["all"]));
      setTargetMin(row.target_min_version ?? "");
      setTargetMax(row.target_max_version ?? "");
      setActionUrl(row.action_url ?? "");
      setActionLabel(row.action_label ?? "");
      setScheduledAt(toLocalDatetimeValue(row.scheduled_at));
      setExpiresAt(toLocalDatetimeValue(row.expires_at));
      setIsDismissible(row.is_dismissible);
      setShowAsBanner(row.show_as_banner);
      setInitialLoad(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [notificationId]);

  function togglePlatform(p: string) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (p === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(p)) next.delete(p);
      else next.add(p);
      if (next.size === 0) return new Set(["all"]);
      return next;
    });
  }

  function toIso(local: string): string | null {
    if (!local.trim()) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!title.trim() || !body.trim()) {
      setMsg("Title and body are required.");
      return;
    }
    const targetPlatform =
      platforms.has("all") || platforms.size === 0
        ? (["all"] as const)
        : Array.from(platforms);
    setLoading(true);

    const payload = {
      title,
      body,
      type,
      priority,
      targetPlatform: [...targetPlatform],
      targetMinVersion: targetMin,
      targetMaxVersion: targetMax,
      actionUrl,
      actionLabel,
      scheduledAt: toIso(scheduledAt),
      expiresAt: toIso(expiresAt),
      isDismissible,
      showAsBanner,
    };

    const { error } = isEdit
      ? await adminAnnouncementsService.update({
          ...payload,
          id: notificationId!,
        })
      : await adminAnnouncementsService.create(payload);

    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.push("/admin/notifications");
    router.refresh();
  }

  if (!initialLoad) {
    return (
      <p className="text-sm text-muted-foreground">Loading…</p>
    );
  }

  if (loadError) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {loadError}
      </p>
    );
  }

  return (
    <form
      className="mx-auto max-w-xl space-y-6"
      onSubmit={(e) => void onSubmit(e)}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {isEdit ? "Edit announcement" : "New announcement"}
          </h1>
          <p className="text-sm text-muted-foreground">
            Leave schedule empty to publish immediately.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/notifications">Back</Link>
        </Button>
      </div>

      {msg ? (
        <p className="text-sm text-destructive" role="alert">
          {msg}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="ann-title">Title</Label>
        <Input
          id="ann-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          maxLength={200}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ann-body">Body</Label>
        <Textarea
          id="ann-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          rows={5}
          className="min-h-[120px]"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type</Label>
          <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="release">Release</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
              <SelectItem value="alert">Alert</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Priority</Label>
          <Select
            value={priority}
            onValueChange={(v) => setPriority(v as typeof priority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Target platforms</legend>
        <div className="flex flex-wrap gap-4">
          {PLATFORMS.map((p) => (
            <label
              key={p}
              className="flex cursor-pointer items-center gap-2 text-sm"
            >
              <Checkbox
                checked={platforms.has(p)}
                onCheckedChange={() => togglePlatform(p)}
              />
              {p}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ann-min">Min app version (semver)</Label>
          <Input
            id="ann-min"
            value={targetMin}
            onChange={(e) => setTargetMin(e.target.value)}
            placeholder="e.g. 1.0.0"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-max">Max app version (semver)</Label>
          <Input
            id="ann-max"
            value={targetMax}
            onChange={(e) => setTargetMax(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ann-url">Action URL</Label>
          <Input
            id="ann-url"
            type="url"
            value={actionUrl}
            onChange={(e) => setActionUrl(e.target.value)}
            placeholder="https://"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-label">Action label</Label>
          <Input
            id="ann-label"
            value={actionLabel}
            onChange={(e) => setActionLabel(e.target.value)}
            placeholder="Read more"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="ann-sched">Schedule (local)</Label>
          <Input
            id="ann-sched"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="ann-exp">Expires (local)</Label>
          <Input
            id="ann-exp"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isDismissible}
            onCheckedChange={(c) => setIsDismissible(c === true)}
          />
          Dismissible banner
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={showAsBanner}
            onCheckedChange={(c) => setShowAsBanner(c === true)}
          />
          Show as top banner
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : isEdit ? "Save changes" : "Create"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/notifications">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
