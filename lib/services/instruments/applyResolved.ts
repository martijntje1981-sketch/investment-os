/**
 * Client-safe helper for merging Match Engine output into a holding row.
 * Kept separate from the engine so UI code does not import EODHD clients.
 */

import { exchangesMatch } from "@/lib/services/instruments/exchangeNormalizer";
import type { ResolvedInstrument } from "@/lib/types/instrument";

/**
 * Applies provider-resolved fields without inventing a ticker.
 * When the user ticker is empty and EODHD returns a Code, that Code is used
 * as the display symbol — sourced from the provider, not inferred.
 *
 * Preserves an already-selected purchase venue when the resolved listing is
 * a different pricing exchange (e.g. Tradegate purchase + Xetra live price).
 */
export function applyResolvedToHolding<
  T extends {
    symbol: string;
    isin?: string | null;
    exchange?: string | null;
    pricingExchange?: string | null;
    name: string;
    providerSymbol?: string | null;
    instrumentName?: string | null;
    quoteCurrency?: ResolvedInstrument["quoteCurrency"];
    providerInstrumentType?: string | null;
    matchMethod?: ResolvedInstrument["matchMethod"];
    matchConfidence?: number;
    requiresConfirmation?: boolean;
    matchWarnings?: string[];
  },
>(holding: T, resolved: ResolvedInstrument): T {
  const providerCode = resolved.providerSymbol?.split(".")[0] ?? "";
  const existingPurchase = holding.exchange?.trim() || null;
  const resolvedExchange = resolved.exchange?.trim() || null;
  const resolvedPricing = resolved.pricingExchange?.trim() || null;

  let nextExchange = resolvedExchange ?? existingPurchase;
  let nextPricing = resolvedPricing ?? holding.pricingExchange ?? null;

  if (
    existingPurchase &&
    resolvedExchange &&
    !resolvedPricing &&
    !exchangesMatch(existingPurchase, resolvedExchange)
  ) {
    // User already chose a purchase venue; treat resolved.exchange as pricing.
    nextExchange = existingPurchase;
    nextPricing = resolvedExchange;
  }

  return {
    ...holding,
    symbol: holding.symbol.trim() || providerCode || holding.symbol,
    isin: resolved.isin ?? holding.isin ?? null,
    exchange: nextExchange,
    providerSymbol: resolved.providerSymbol,
    instrumentName: resolved.instrumentName ?? holding.instrumentName ?? null,
    quoteCurrency: resolved.quoteCurrency ?? holding.quoteCurrency ?? null,
    providerInstrumentType:
      resolved.providerInstrumentType ?? holding.providerInstrumentType ?? null,
    pricingExchange: nextPricing,
    matchMethod: resolved.matchMethod,
    matchConfidence: resolved.confidence,
    requiresConfirmation: resolved.requiresConfirmation,
    matchWarnings: resolved.warnings,
    name:
      holding.name.trim() ||
      resolved.instrumentName ||
      holding.name,
  };
}
