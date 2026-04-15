import fs from "fs/promises";
import { Notification, app, dialog, ipcMain, shell } from "electron";

export function registerIpcHandlers(): void {
  ipcMain.handle("app:getVersion", () => app.getVersion());

  ipcMain.handle(
    "notification:showNative",
    async (_event, title: string, body: string) => {
      if (typeof title !== "string" || typeof body !== "string") {
        return;
      }
      if (!Notification.isSupported()) {
        return;
      }
      const n = new Notification({
        title: title.slice(0, 256),
        body: body.slice(0, 500),
      });
      n.show();
    }
  );

  ipcMain.handle("shell:openExternal", async (_event, url: string) => {
    if (typeof url !== "string" || !/^https?:\/\//i.test(url)) {
      return;
    }
    await shell.openExternal(url);
  });

  ipcMain.handle(
    "file:saveText",
    async (
      _event,
      payload: { defaultFilename: string; content: string }
    ) => {
      if (
        typeof payload?.content !== "string" ||
        typeof payload?.defaultFilename !== "string"
      ) {
        return { ok: false as const, error: "Invalid payload" };
      }
      const { canceled, filePath } = await dialog.showSaveDialog({
        defaultPath: payload.defaultFilename,
        filters: [
          { name: "CSV", extensions: ["csv"] },
          { name: "JSON", extensions: ["json"] },
          { name: "All files", extensions: ["*"] },
        ],
      });
      if (canceled || !filePath) {
        return { ok: false as const, canceled: true };
      }
      await fs.writeFile(filePath, payload.content, "utf8");
      return { ok: true as const, filePath };
    }
  );
}
