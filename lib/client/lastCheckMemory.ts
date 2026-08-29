/**
 * Legacy last-opened timestamp helper.
 * Not a previous portfolio state and not a New & Notable comparison baseline.
 */

const STORAGE_PREFIX = "tobailey:last-check-at";

function storageKey(userSub: string | null | undefined): string {
  const id = userSub?.trim();
  return id ? `${STORAGE_PREFIX}:${id}` : STORAGE_PREFIX;
}

export function readLastCheckAt(
  userSub: string | null | undefined,
): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(storageKey(userSub));
    if (!raw) return null;
    const parsed = new Date(raw);
    return Number.isFinite(parsed.getTime()) ? parsed.toISOString() : null;
  } catch {
    return null;
  }
}

export function markLastCheckAt(
  userSub: string | null | undefined,
  now: Date = new Date(),
): string {
  const iso = now.toISOString();
  if (typeof window === "undefined") return iso;
  try {
    window.localStorage.setItem(storageKey(userSub), iso);
  } catch {
    // Ignore quota / private-mode failures.
  }
  return iso;
}
