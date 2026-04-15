# 14.5 Electron Auto-Update & Version Control

## Why Version Control Matters

For a long-term Electron desktop application, you need a robust update system that:

- Automatically checks for new versions
- Downloads and installs updates seamlessly
- Supports **critical forced updates** (security patches)
- Supports **gradual rollout** (10% → 50% → 100% of users)
- Allows **rollback** if a release has issues
- Tracks which versions users are running (for targeted notifications)
- Works cross-platform (Windows, macOS, Linux)

---

## Architecture Overview

```
┌──────────────────┐     ┌────────────────────────┐     ┌────────────────┐
│  Electron App    │     │  Supabase Edge Fn      │     │  Asset Storage  │
│  (Main Process)  │     │  /check-update         │     │  (S3/R2/GH)     │
│                  │     │                        │     │                │
│  1. On app start │───▶│  2. Query app_versions │     │                │
│     check update │     │     table for latest   │     │                │
│                  │     │                        │     │                │
│  3. Compare      │◀───│  Return version info   │     │                │
│     semver       │     │  + download URL        │     │                │
│                  │     └────────────────────────┘     │                │
│  4. If newer:    │                                 │                │
│     download     │───────────────────────────────▶│  5. Download   │
│     installer   │                                 │     .exe/.dmg   │
│                  │◀───────────────────────────────│                │
│  6. Install &    │                                 └────────────────┘
│     restart      │
└──────────────────┘
```

---

## Two Update Strategies

### Strategy A: GitHub Releases + electron-updater (Simple)

Best for open-source or small teams. Uses GitHub Releases as the asset host.

- `electron-builder` builds and publishes to GitHub Releases
- `electron-updater` checks GitHub Releases API for new versions
- Version control is limited to GitHub (publish/unpublish releases)
- No gradual rollout or admin panel control

### Strategy B: Custom Update Server + Supabase (Recommended)

Best for production apps that need full control. Uses Supabase as the version registry and S3/R2/GitHub as the asset host.

- `app_versions` table in Supabase stores version metadata
- Supabase Edge Function serves as the update check endpoint
- Admin panel controls publishing, rollout percentage, and critical flags
- Assets hosted on S3, Cloudflare R2, or GitHub Releases
- Full analytics on which versions are deployed

**We recommend Strategy B for UltraFinance** because it gives you full control over the rollout lifecycle.

---

## Supabase Edge Function: `/check-update`

```tsx
// supabase/functions/check-update/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const { current_version, platform, os_version } = await req.json();
  // platform: 'win32' | 'darwin' | 'linux'
  
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Get latest published version for this platform
  const { data: latest } = await supabase
    .from('app_versions')
    .select('*')
    .eq('platform', 'desktop')
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!latest) {
    return new Response(JSON.stringify({ update_available: false }));
  }

  // Compare semver
  const hasUpdate = semverGt(latest.version, current_version);
  
  if (!hasUpdate) {
    return new Response(JSON.stringify({ update_available: false }));
  }

  // Check rollout percentage (deterministic per user)
  // Hash the current_version + some client ID to get stable rollout bucket
  if (latest.rollout_percentage < 100) {
    const bucket = hashToBucket(req.headers.get('x-client-id') || '');
    if (bucket > latest.rollout_percentage) {
      return new Response(JSON.stringify({ update_available: false }));
    }
  }

  // Determine correct asset URL for the platform
  let download_url = latest.download_url;
  if (platform === 'win32') download_url = latest.asset_url_win || download_url;
  if (platform === 'darwin') download_url = latest.asset_url_mac || download_url;
  if (platform === 'linux') download_url = latest.asset_url_linux || download_url;

  return new Response(JSON.stringify({
    update_available: true,
    version: latest.version,
    release_notes: latest.release_notes,
    download_url,
    is_critical: latest.is_critical,
    published_at: latest.published_at,
  }));
});

function semverGt(a: string, b: string): boolean {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return true;
    if (pa[i] < pb[i]) return false;
  }
  return false;
}

function hashToBucket(clientId: string): number {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash) + clientId.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 100;
}
```

---

## Electron Main Process: Auto-Updater

```tsx
// electron/updater.ts
import { app, dialog, BrowserWindow } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';

const SUPABASE_URL = process.env.SUPABASE_URL;
const CHECK_INTERVAL = 4 * 60 * 60 * 1000; // Check every 4 hours

interface UpdateInfo {
  update_available: boolean;
  version?: string;
  release_notes?: string;
  download_url?: string;
  is_critical?: boolean;
}

export class AppUpdater {
  private mainWindow: BrowserWindow | null = null;

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow;
    this.setupAutoUpdater();
    this.checkForUpdatesOnStart();
    this.schedulePeriodicChecks();
  }

  private setupAutoUpdater() {
    autoUpdater.logger = log;
    autoUpdater.autoDownload = false;    // We control when to download
    autoUpdater.autoInstallOnAppQuit = true;
    
    autoUpdater.on('update-downloaded', () => {
      // Notify renderer that update is ready
      this.mainWindow?.webContents.send('update-downloaded');
    });

    autoUpdater.on('error', (err) => {
      log.error('Auto-updater error:', err);
    });
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/check-update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-client-id': this.getClientId(),
        },
        body: JSON.stringify({
          current_version: app.getVersion(),
          platform: process.platform,
          os_version: process.getSystemVersion(),
        }),
      });

      const data: UpdateInfo = await response.json();

      if (data.update_available) {
        // Send update info to renderer process
        this.mainWindow?.webContents.send('update-available', data);

        if (data.is_critical) {
          // Critical update: force download immediately
          this.downloadUpdate(data.download_url!);
        }
      }

      return data;
    } catch (err) {
      log.error('Update check failed:', err);
      return { update_available: false };
    }
  }

  private async downloadUpdate(downloadUrl: string) {
    // For custom server: set the feed URL dynamically
    autoUpdater.setFeedURL({ provider: 'generic', url: downloadUrl });
    autoUpdater.downloadUpdate();
  }

  private checkForUpdatesOnStart() {
    // Wait 10 seconds after app start to avoid slowing startup
    setTimeout(() => this.checkForUpdates(), 10_000);
  }

  private schedulePeriodicChecks() {
    setInterval(() => this.checkForUpdates(), CHECK_INTERVAL);
  }

  private getClientId(): string {
    // Deterministic client ID for rollout bucketing
    // Use machine-id or a stored UUID
    return app.getPath('userData');
  }

  installAndRestart() {
    autoUpdater.quitAndInstall(false, true);
  }
}
```

---

## Renderer: Update UI

```tsx
// hooks/useAppUpdate.ts
import { useEffect, useState } from 'react';

interface UpdateState {
  available: boolean;
  version: string | null;
  releaseNotes: string | null;
  isCritical: boolean;
  isDownloaded: boolean;
  isDownloading: boolean;
}

export function useAppUpdate() {
  const [update, setUpdate] = useState<UpdateState>({
    available: false, version: null, releaseNotes: null,
    isCritical: false, isDownloaded: false, isDownloading: false,
  });

  useEffect(() => {
    // Listen for update events from main process
    window.electronAPI?.onUpdateAvailable((data) => {
      setUpdate(prev => ({
        ...prev,
        available: true,
        version: data.version,
        releaseNotes: data.release_notes,
        isCritical: data.is_critical,
      }));
    });

    window.electronAPI?.onUpdateDownloaded(() => {
      setUpdate(prev => ({ ...prev, isDownloaded: true, isDownloading: false }));
    });
  }, []);

  const downloadUpdate = () => {
    setUpdate(prev => ({ ...prev, isDownloading: true }));
    window.electronAPI?.downloadUpdate();
  };

  const installUpdate = () => {
    window.electronAPI?.installAndRestart();
  };

  return { update, downloadUpdate, installUpdate };
}
```

### Update Banner Component

```tsx
// components/layout/update-banner.tsx
'use client';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';

export function UpdateBanner() {
  const { update, downloadUpdate, installUpdate } = useAppUpdate();

  if (!update.available) return null;

  // Critical update: force modal, no dismiss
  if (update.isCritical && !update.isDownloaded) {
    return (
      <div className="bg-destructive/10 border-b border-destructive px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium">
            Critical update v{update.version} is required.
          </span>
        </div>
        <Button size="sm" variant="destructive" onClick={downloadUpdate}
          disabled={update.isDownloading}>
          {update.isDownloading ? 'Downloading...' : 'Update Now'}
        </Button>
      </div>
    );
  }

  // Normal update: dismissible banner
  if (update.isDownloaded) {
    return (
      <div className="bg-success/10 border-b border-success px-4 py-3 flex items-center justify-between">
        <span className="text-sm">v{update.version} downloaded and ready to install.</span>
        <Button size="sm" onClick={installUpdate}>
          <RefreshCw className="h-3 w-3 mr-1" /> Restart & Update
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-info/10 border-b border-info px-4 py-3 flex items-center justify-between">
      <span className="text-sm">v{update.version} is available.</span>
      <Button size="sm" variant="outline" onClick={downloadUpdate}
        disabled={update.isDownloading}>
        <Download className="h-3 w-3 mr-1" />
        {update.isDownloading ? 'Downloading...' : 'Download'}
      </Button>
    </div>
  );
}
```

---

## Update Flow by Scenario

| Scenario | User Experience |
| --- | --- |
| Normal update | Blue banner: "v0.1.0 available" + Download button. After download: "Ready to install" + Restart button. |
| Critical update | Red banner: "Critical update required". Auto-downloads. Shows modal blocking app use until restart. |
| Gradual rollout (50%) | Only 50% of users see the update. Others see nothing. Percentage increases over days. |
| User skips update | Banner reappears on next app start. Periodic check every 4 hours. |
| Rollback | Admin unpublishes the version in admin panel. Users who haven't updated yet won't see it. Already-updated users would need a new patch version. |