import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke("app:getVersion") as Promise<string>,
  checkForUpdates: () =>
    ipcRenderer.invoke("updater:check") as Promise<unknown>,
  installUpdate: () => ipcRenderer.invoke("updater:install") as Promise<void>,
  onUpdaterEvent: (handler: (payload: unknown) => void) => {
    const channel = "updater:event";
    const listener = (_event: unknown, payload: unknown) => {
      handler(payload);
    };
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  showNativeNotification: (title: string, body: string) =>
    ipcRenderer.invoke("notification:showNative", title, body),
  saveTextFile: (payload: { defaultFilename: string; content: string }) =>
    ipcRenderer.invoke("file:saveText", payload),
});
