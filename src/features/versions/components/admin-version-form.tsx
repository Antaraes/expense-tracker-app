"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { adminVersionsService } from "@/features/versions/services/admin-versions.service";
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

export function AdminVersionForm() {
  const router = useRouter();
  const [version, setVersion] = useState("");
  const [platform, setPlatform] = useState<"desktop" | "android" | "ios">(
    "desktop"
  );
  const [releaseNotes, setReleaseNotes] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [assetUrlWin, setAssetUrlWin] = useState("");
  const [assetUrlMac, setAssetUrlMac] = useState("");
  const [assetUrlLinux, setAssetUrlLinux] = useState("");
  const [isCritical, setIsCritical] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [rolloutPercentage, setRolloutPercentage] = useState(100);
  const [minOsVersion, setMinOsVersion] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!version.trim()) {
      setMsg("Version is required.");
      return;
    }
    setLoading(true);
    const { error } = await adminVersionsService.create({
      version,
      platform,
      releaseNotes,
      downloadUrl,
      assetUrlWin,
      assetUrlMac,
      assetUrlLinux,
      isCritical,
      isPublished,
      rolloutPercentage,
      minOsVersion,
    });
    setLoading(false);
    if (error) {
      setMsg(error.message);
      return;
    }
    router.push("/admin/versions");
    router.refresh();
  }

  return (
    <form
      className="mx-auto max-w-xl space-y-6"
      onSubmit={(e) => void onSubmit(e)}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Publish version
          </h1>
          <p className="text-sm text-muted-foreground">
            Desktop update checks use semver, rollout %, and per-OS asset URLs.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/versions">Back</Link>
        </Button>
      </div>

      {msg ? (
        <p className="text-sm text-destructive" role="alert">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-semver">Version (semver)</Label>
          <Input
            id="v-semver"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="0.1.0"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Platform</Label>
          <Select
            value={platform}
            onValueChange={(v) => setPlatform(v as typeof platform)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">Desktop</SelectItem>
              <SelectItem value="android">Android</SelectItem>
              <SelectItem value="ios">iOS</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="v-notes">Release notes</Label>
        <Textarea
          id="v-notes"
          value={releaseNotes}
          onChange={(e) => setReleaseNotes(e.target.value)}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="v-download">Fallback download URL</Label>
        <Input
          id="v-download"
          type="url"
          value={downloadUrl}
          onChange={(e) => setDownloadUrl(e.target.value)}
          placeholder="https://"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="v-win">Windows asset URL</Label>
          <Input
            id="v-win"
            type="url"
            value={assetUrlWin}
            onChange={(e) => setAssetUrlWin(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-mac">macOS asset URL</Label>
          <Input
            id="v-mac"
            type="url"
            value={assetUrlMac}
            onChange={(e) => setAssetUrlMac(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-lin">Linux asset URL</Label>
          <Input
            id="v-lin"
            type="url"
            value={assetUrlLinux}
            onChange={(e) => setAssetUrlLinux(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="v-roll">Rollout % (0–100)</Label>
          <Input
            id="v-roll"
            type="number"
            min={0}
            max={100}
            value={rolloutPercentage}
            onChange={(e) =>
              setRolloutPercentage(Number.parseInt(e.target.value, 10) || 0)
            }
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="v-minos">Min OS version (optional)</Label>
          <Input
            id="v-minos"
            value={minOsVersion}
            onChange={(e) => setMinOsVersion(e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isPublished}
            onCheckedChange={(c) => setIsPublished(c === true)}
          />
          Published
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox
            checked={isCritical}
            onCheckedChange={(c) => setIsCritical(c === true)}
          />
          Critical (force banner emphasis)
        </label>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Saving…" : "Save"}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/admin/versions">Cancel</Link>
        </Button>
      </div>
    </form>
  );
}
