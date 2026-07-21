/**
 * Maps broker-specific exchange labels and MIC codes to EODHD exchange codes.
 */

const EXCHANGE_ALIASES: Record<string, string> = {
  XETRA: "XETRA",
  XETR: "XETRA",
  XFRA: "XETRA",
  FRANKFURT: "XETRA",
  DE: "XETRA",
  GERMANY: "XETRA",
  XET: "XETRA",

  AS: "AS",
  AMS: "AS",
  AMSTERDAM: "AS",
  EURONEXTAMSTERDAM: "AS",
  XAMS: "AS",

  PA: "PA",
  PARIS: "PA",
  EPA: "PA",
  XPAR: "PA",
  XEPA: "PA",
  EURONEXTPARIS: "PA",

  LSE: "LSE",
  LON: "LSE",
  LONDON: "LSE",
  XLON: "LSE",

  US: "US",
  NASDAQ: "US",
  NYSE: "US",
  ARCA: "US",
  XNAS: "US",
  XNYS: "US",

  SW: "SW",
  SIX: "SW",
  SWISS: "SW",
  XSWX: "SW",

  MI: "MI",
  MILAN: "MI",
  XMIL: "MI",

  MC: "MC",
  MADRID: "MC",
  XMAD: "MC",

  ST: "ST",
  STOCKHOLM: "ST",
  XSTO: "ST",

  HE: "HE",
  HELSINKI: "HE",
  XHEL: "HE",

  IR: "IR",
  DUBLIN: "IR",
  XDUB: "IR",

  BR: "BR",
  BRUSSELS: "BR",
  XBRU: "BR",

  VI: "VI",
  VIENNA: "VI",
  XVIE: "VI",
};

/** Canonical EODHD exchange codes supported by the match engine. */
export const KNOWN_PROVIDER_EXCHANGES = new Set(
  Object.values(EXCHANGE_ALIASES).map((code) => code.toUpperCase()),
);

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

  return EXCHANGE_ALIASES[cleaned] ?? null;
}

/** True when the value maps to a supported provider exchange code. */
export function isKnownProviderExchange(
  raw: string | null | undefined,
): boolean {
  const normalized = normalizeExchange(raw);
  return normalized !== null && KNOWN_PROVIDER_EXCHANGES.has(normalized);
}

/**
 * Resolves user/broker exchange input to a provider exchange code.
 * Unknown codes return null — they must not be sent to the provider API.
 */
export function resolveExchangeForMatching(
  raw: string | null | undefined,
): string | null {
  return normalizeExchange(raw);
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

/**
 * Normalizes exchange codes returned by the provider API.
 * Falls back to the raw code when it is already a known provider exchange.
 */
export function normalizeProviderExchangeCode(
  raw: string | null | undefined,
): string | null {
  const mapped = normalizeExchange(raw);
  if (mapped) return mapped;

  const cleaned = raw?.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (cleaned && KNOWN_PROVIDER_EXCHANGES.has(cleaned)) {
    return cleaned;
  }

  return null;
}

export function exchangeResolutionMessage(
  raw: string | null | undefined,
): string | null {
  const trimmed = raw?.trim();
  if (!trimmed) return null;
  if (isKnownProviderExchange(trimmed)) return null;
  return `"${trimmed}" is not a recognized exchange. Select a listing below or try the exchange name (for example Paris or Xetra).`;
}
