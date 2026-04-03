import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  platform: process.platform,
  openExternal: (url: string) => ipcRenderer.invoke("shell:openExternal", url),
  saveTextFile: (payload: { defaultFilename: string; content: string }) =>
    ipcRenderer.invoke("file:saveText", payload),
});
