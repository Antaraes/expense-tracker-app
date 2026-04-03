import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Supabase nested FK selects may be typed as object or single-element array.
 */
export function embedSingle<T>(embed: unknown): T | null {
  const row = Array.isArray(embed) ? embed[0] : embed;
  if (row == null || typeof row !== "object") return null;
  return row as T;
}
