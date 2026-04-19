import { BrowserWindow, app, session, shell } from "electron";
import path from "path";
import { registerIpcHandlers } from "./ipc/register";
import { isSafeStorageAvailable } from "./safe-storage";
import { setupAutoUpdater } from "./updater";

const isDev =
  process.env.NODE_ENV === "development" || !app.isPackaged;

/** Injected by `scripts/build-electron.mjs` when `ELECTRON_START_URL` is set at build time. */
declare const __ELECTRON_BAKED_START_URL: string;

const START_URL = (() => {
  const baked = __ELECTRON_BAKED_START_URL.trim();
  if (baked.length > 0) return baked;
  return process.env.ELECTRON_START_URL?.trim() || "http://localhost:3000";
})();

function isSafeHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Chromium net error -3 = ERR_ABORTED (navigation cancelled); ignore. */
const ERR_ABORTED = -3;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function showLoadErrorPage(
  win: BrowserWindow,
  opts: { url: string; code: number; description: string }
): void {
  const body = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>UltraFinance — can’t load app</title>
  <style>
    :root { font-family: system-ui, sans-serif; background: #0f0f12; color: #e8e8ed; }
    body { margin: 0; padding: 2rem; max-width: 42rem; line-height: 1.5; }
    h1 { font-size: 1.125rem; margin: 0 0 0.75rem; }
    code { font-size: 0.85em; background: #1c1c22; padding: 0.15rem 0.4rem; border-radius: 4px; }
    pre { background: #1c1c22; padding: 1rem; border-radius: 8px; overflow: auto; font-size: 0.8rem; }
    ol { padding-left: 1.25rem; }
    a { color: #7cb8ff; }
  </style>
</head>
<body>
  <h1>Could not load the app UI</h1>
  <p>The window loads your Next.js app from a URL. Nothing responded at that address.</p>
  <pre>${escapeHtml(opts.description)} (code ${opts.code})\n${escapeHtml(opts.url)}</pre>
  <p><strong>Local testing (default URL is <code>http://localhost:3000</code>):</strong></p>
  <ol>
    <li>In the project folder, run <code>npm run start</code> (production server on port 3000).</li>
    <li>Then open this app again, or reload (<kbd>Cmd</kbd>+<kbd>R</kbd>).</li>
  </ol>
  <p><strong>Or</strong> point the shell at a deployed site when launching:</p>
  <pre>ELECTRON_START_URL="https://your-app.vercel.app" open -a "UltraFinance"</pre>
  <p>Tip: set <code>ELECTRON_DEBUG=1</code> when launching to open DevTools in packaged builds.</p>
</body>
</html>`;
  void win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(body)}`);
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 640,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.once("ready-to-show", () => win.show());

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (isSafeHttpUrl(url)) {
      void shell.openExternal(url);
    }
    return { action: "deny" };
  });

  win.webContents.on("will-navigate", (event, navigationUrl) => {
    if (navigationUrl.startsWith("data:")) return;
    try {
      const u = new URL(navigationUrl);
      if (u.protocol === "file:" || u.protocol === "javascript:") {
        event.preventDefault();
      }
    } catch {
      event.preventDefault();
    }
  });

  win.webContents.on("render-process-gone", (_e, details) => {
    console.error("[electron] render-process-gone", details.reason, details.exitCode);
  });

  win.webContents.on("did-fail-load", (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === ERR_ABORTED) return;
    showLoadErrorPage(win, { url, code, description: desc });
  });

  void win.loadURL(START_URL);
  if (isDev || process.env.ELECTRON_DEBUG === "1") {
    win.webContents.openDevTools({ mode: "detach" });
  }

  if (app.isPackaged) {
    setupAutoUpdater(win);
  }
}

registerIpcHandlers();

process.on("uncaughtException", (err) => {
  console.error("[electron] uncaughtException", err);
});
process.on("unhandledRejection", (reason) => {
  console.error("[electron] unhandledRejection", reason);
});

function allowNotificationsPermission(): boolean {
  return true;
}

app.whenReady().then(() => {
  const ses = session.defaultSession;

  ses.setPermissionRequestHandler((_wc, permission, callback) => {
    callback(allowNotificationsPermission() && permission === "notifications");
  });

  ses.setPermissionCheckHandler((_wc, permission) => {
    if (permission === "notifications") {
      return allowNotificationsPermission();
    }
    return false;
  });

  if (process.env.ELECTRON_DEBUG === "1") {
    console.debug(
      "[electron] safeStorage (OS keychain) available:",
      isSafeStorageAvailable()
    );
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
