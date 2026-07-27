/**
 * Exchange normalization facade over the central exchange registry.
 *
 * Distinguishes:
 * - purchase venue codes (normalizeExchange / isRecognizedExchange)
 * - provider pricing codes (resolveExchangeForMatching / isKnownProviderExchange)
 */

import {
  cleanExchangeToken,
  getExchangeRegistryEntry,
  isProviderPricingExchange,
  isValidPurchaseVenue,
  listUserSelectableExchanges,
  normalizePurchaseExchangeCode,
  resolveProviderPricingExchange,
} from "@/lib/services/instruments/exchangeRegistry";

/** Canonical EODHD exchange codes supported for provider matching. */
export const KNOWN_PROVIDER_EXCHANGES = new Set(
  listUserSelectableExchanges()
    .map((entry) => entry.providerPricingCode)
    .filter((code): code is string => Boolean(code)),
);

/** Recognized purchase-venue codes including purchase-only venues (e.g. TDG). */
export const KNOWN_EXCHANGES = new Set(
  listUserSelectableExchanges()
    .filter((entry) => entry.validPurchaseVenue)
    .map((entry) => entry.purchaseCode),
);

/**
 * Normalizes a raw exchange string to a canonical purchase-exchange code.
 * Returns null when the input is empty or cannot be mapped.
 */
export function normalizeExchange(
  raw: string | null | undefined,
): string | null {
  return normalizePurchaseExchangeCode(raw);
}

/** True when the value maps to a supported provider pricing exchange code. */
export function isKnownProviderExchange(
  raw: string | null | undefined,
): boolean {
  return isProviderPricingExchange(raw);
}

/** True when the value is a recognized purchase venue (including purchase-only). */
export function isRecognizedExchange(
  raw: string | null | undefined,
): boolean {
  return isValidPurchaseVenue(raw);
}

/**
 * Resolves user/broker exchange input to a provider pricing exchange code.
 * Purchase-only venues (e.g. TDG) and unknown codes return null — they must
 * not be sent to the provider API.
 */
export function resolveExchangeForMatching(
  raw: string | null | undefined,
): string | null {
  return resolveProviderPricingExchange(raw);
}

/**
 * Returns true when two exchange codes refer to the same purchase venue.
 * Does not equate distinct purchase venues that share a pricing path
 * (e.g. NASDAQ vs NYSE both price via US).
 */
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
 * True when two values resolve to the same provider pricing exchange.
 * Used when comparing purchase venues against EODHD row exchanges.
 */
export function providerExchangesMatch(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  const left =
    resolveExchangeForMatching(a) ??
    (isKnownProviderExchange(a) ? cleanExchangeToken(a!) : null);
  const right =
    resolveExchangeForMatching(b) ??
    (isKnownProviderExchange(b) ? cleanExchangeToken(b!) : null);
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
  if (!raw) return null;

  const fromRegistry = resolveProviderPricingExchange(raw);
  if (fromRegistry) return fromRegistry;

  const cleaned = cleanExchangeToken(raw);
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
  if (getExchangeRegistryEntry(trimmed)) return null;
  return `"${trimmed}" is not a recognized exchange. Select a listing below or try the exchange name (for example Paris or Xetra).`;
}
