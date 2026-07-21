import type { ImportRow, ImportSource } from "@/lib/services/import/types";
import { pendingImportSessionKey } from "@/lib/client/portfolioStorageKeys";

export type PendingImportSession = {
  version: 1;
  rows: ImportRow[];
  broker: string | null;
  source: ImportSource | null;
  mode: "replace" | "merge";
  idempotencyKey: string;
  syncError?: string | null;
  syncErrorCode?: string | null;
  updatedAt: string;
};

export function createImportIdempotencyKey(userSub: string): string {
  return `import:${userSub}:${crypto.randomUUID()}`;
}

export function readPendingImportSession(
  userSub: string | null | undefined,
): PendingImportSession | null {
  if (!userSub || typeof window === "undefined") return null;

  try {
    const raw = localStorage.getItem(pendingImportSessionKey(userSub));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PendingImportSession;
    if (parsed.version !== 1 || !Array.isArray(parsed.rows)) return null;

    return parsed;
  } catch {
    return null;
  }
}

export function writePendingImportSession(
  userSub: string,
  session: PendingImportSession,
): void {
  if (typeof window === "undefined") return;

  localStorage.setItem(
    pendingImportSessionKey(userSub),
    JSON.stringify({
      ...session,
      version: 1,
      updatedAt: new Date().toISOString(),
    }),
  );
}

export function clearPendingImportSession(userSub: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(pendingImportSessionKey(userSub));
}
