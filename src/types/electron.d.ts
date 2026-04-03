export {};

declare global {
  interface Window {
    electronAPI?: {
      platform: string;
      openExternal: (url: string) => Promise<void>;
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
