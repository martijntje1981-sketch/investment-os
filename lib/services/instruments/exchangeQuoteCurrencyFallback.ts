/**
 * Explicit allowlist for exchange → quote currency when metadata is absent.
 * Excluded when a venue can trade more than one listing currency:
 * - Amsterdam (AS): EUR or USD
 * - London (LSE): GBP, USD, and EUR
 * - Stockholm (ST): SEK (unsupported), not EUR
 */

import type { PriceCurrency } from "@/lib/services/prices/types";

/** EODHD exchange codes with an unambiguous listing currency in our provider model. */
const UNAMBIGUOUS_EXCHANGE_QUOTE_CURRENCY: Partial<Record<string, PriceCurrency>> = {
  XETRA: "EUR",
  PA: "EUR",
  BR: "EUR",
  MC: "EUR",
  MI: "EUR",
  IR: "EUR",
  HE: "EUR",
  VI: "EUR",
  US: "USD",
  SW: "CHF",
};

export function resolveExchangeFallbackQuoteCurrency(
  exchange: string | null | undefined,
): PriceCurrency | null {
  const normalized = exchange?.trim().toUpperCase();
  if (!normalized) {
    return null;
  }
  return UNAMBIGUOUS_EXCHANGE_QUOTE_CURRENCY[normalized] ?? null;
}
