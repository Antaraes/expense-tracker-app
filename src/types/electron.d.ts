export {};

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      getAppVersion: () => Promise<string>;
      checkForUpdates: () => Promise<unknown>;
      installUpdate: () => Promise<void>;
      onUpdaterEvent: (handler: (payload: unknown) => void) => () => void;
      openExternal: (url: string) => Promise<void>;
      showNativeNotification: (title: string, body: string) => Promise<void>;
      saveTextFile: (payload: {
        defaultFilename: string;
        content: string;
      }) => Promise<
        | { ok: true; filePath: string }
        | { ok: false; canceled?: boolean; error?: string }
      >;
    };
  }
}
