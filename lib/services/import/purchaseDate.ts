import { parsePurchaseDate } from "@/lib/services/extraction/parseLocaleNumber";

/** Normalizes user/import purchase dates to ISO `YYYY-MM-DD`, or null when empty. */
export function normalizeImportPurchaseDate(raw: unknown): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return parsePurchaseDate(value);
}

/** Returns a user-facing error when a non-empty purchase date is invalid. */
export function getPurchaseDateValidationError(
  raw: string | null | undefined,
): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  return normalizeImportPurchaseDate(value) ? null : "Enter a valid purchase date.";
}

export function isPurchaseDateConfirmReady(raw: string | null | undefined): boolean {
  return getPurchaseDateValidationError(raw) === null;
}
