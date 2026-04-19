import { safeStorage } from "electron";

/**
 * P2 — OS keychain-backed storage for future local secrets (main process only).
 * Do not expose service_role or long-lived refresh tokens to the renderer; if you
 * add IPC later, validate payloads and keep ciphertext in main.
 */
export function isSafeStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export function encryptLocalSecret(plain: string): Buffer | null {
  if (!safeStorage.isEncryptionAvailable()) return null;
  return safeStorage.encryptString(plain);
}

export function decryptLocalSecret(encrypted: Buffer): string | null {
  if (!safeStorage.isEncryptionAvailable()) return null;
  try {
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
}
