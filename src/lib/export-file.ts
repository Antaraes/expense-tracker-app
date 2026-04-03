/** Save UTF-8 text: Electron native dialog when available, else browser download. */
export async function saveTextFile(
  defaultFilename: string,
  content: string
): Promise<{ ok: boolean; canceled?: boolean; filePath?: string; error?: string }> {
  if (typeof window !== "undefined" && window.electronAPI?.saveTextFile) {
    return window.electronAPI.saveTextFile({ defaultFilename, content });
  }
  const blob = new Blob([content], {
    type: "text/plain;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = defaultFilename;
  a.click();
  URL.revokeObjectURL(url);
  return { ok: true };
}

export function csvEscape(cell: string | number): string {
  const s = String(cell);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
