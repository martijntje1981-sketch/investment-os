/**
 * ISIN validation helpers.
 *
 * ISINs must never be stored or used as tickers. These helpers detect
 * valid ISIN-shaped strings so imports can route them correctly.
 */

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/** Returns true for a well-formed 12-character ISIN. */
export function isValidIsin(value: string | null | undefined): boolean {
  if (!value) return false;
  return ISIN_PATTERN.test(value.trim().toUpperCase());
}

/** Normalizes an ISIN to uppercase without whitespace. */
export function normalizeIsin(
  value: string | null | undefined,
): string | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase().replace(/\s/g, "");
  return isValidIsin(cleaned) ? cleaned : null;
}

/**
 * If a value looks like an ISIN, return it as ISIN and clear the ticker.
 * Used during CSV import to prevent ISIN-as-ticker bugs.
 */
export function splitIsinFromTicker(raw: string): {
  ticker: string;
  isin: string | null;
} {
  const cleaned = raw.trim().toUpperCase();
  if (!cleaned) return { ticker: "", isin: null };

  if (isValidIsin(cleaned)) {
    return { ticker: "", isin: cleaned };
  }

  return { ticker: cleaned, isin: null };
}
