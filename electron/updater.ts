import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater } from "electron-updater";

/**
 * GitHub Releases feed (see package.json build.publish).
 * Requires electron-builder publish; dev / unpackaged skips.
 */
export function setupAutoUpdater(mainWindow: BrowserWindow): void {
  if (!app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    let notes: string | null = null;
    const rn = info.releaseNotes;
    if (typeof rn === "string") notes = rn;
    else if (Array.isArray(rn)) {
      notes = rn.map((n) => String(n.note ?? "")).join("\n");
    }
    mainWindow.webContents.send("updater:event", {
      type: "available" as const,
      version: info.version,
      releaseNotes: notes,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    mainWindow.webContents.send("updater:event", {
      type: "downloaded" as const,
      version: info.version,
    });
  });

  autoUpdater.on("error", (err) => {
    mainWindow.webContents.send("updater:event", {
      type: "error" as const,
      message: err.message,
    });
  });

  ipcMain.removeHandler("updater:check");
  ipcMain.handle("updater:check", async () => {
    try {
      const r = await autoUpdater.checkForUpdates();
      return { ok: true as const, updateInfo: r?.updateInfo };
    } catch (e) {
      return { ok: false as const, error: String(e) };
    }
  });

  ipcMain.removeHandler("updater:install");
  ipcMain.handle("updater:install", () => {
    autoUpdater.quitAndInstall(false, true);
  });

  setTimeout(() => {
    void autoUpdater.checkForUpdates();
  }, 15_000);
}
