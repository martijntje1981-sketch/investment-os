/**
 * Maps broker-specific exchange labels to EODHD exchange codes.
 *
 * This is exchange normalization — not ticker hardcoding. Brokers use
 * inconsistent labels (XETR, XETRA, DE) for the same venue.
 */

const EXCHANGE_ALIASES: Record<string, string> = {
  XETRA: "XETRA",
  XETR: "XETRA",
  XFRA: "XETRA",
  FRANKFURT: "XETRA",
  DE: "XETRA",
  GERMANY: "XETRA",

  AS: "AS",
  AMS: "AS",
  AMSTERDAM: "AS",
  EURONEXTAMSTERDAM: "AS",

  LSE: "LSE",
  LON: "LSE",
  LONDON: "LSE",

  US: "US",
  NASDAQ: "US",
  NYSE: "US",
  ARCA: "US",

  SW: "SW",
  SIX: "SW",
  SWISS: "SW",

  PA: "PA",
  PARIS: "PA",

  MI: "MI",
  MILAN: "MI",

  MC: "MC",
  MADRID: "MC",

  ST: "ST",
  STOCKHOLM: "ST",

  HE: "HE",
  HELSINKI: "HE",

  IR: "IR",
  DUBLIN: "IR",

  BR: "BR",
  BRUSSELS: "BR",

  VI: "VI",
  VIENNA: "VI",
};

/**
 * Normalizes a raw exchange string to an EODHD exchange code.
 * Returns null when the input is empty or cannot be mapped.
 */
export function normalizeExchange(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;

  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return null;

  return EXCHANGE_ALIASES[cleaned] ?? cleaned;
}

/** Returns true when two exchange codes refer to the same normalized venue. */
export function exchangesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left = normalizeExchange(a);
  const right = normalizeExchange(b);
  if (!left || !right) return false;
  return left === right;
}
