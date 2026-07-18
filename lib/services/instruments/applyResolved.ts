/**
 * Client-safe helper for merging Match Engine output into a holding row.
 * Kept separate from the engine so UI code does not import EODHD clients.
 */

import type { ResolvedInstrument } from "@/lib/types/instrument";

/**
 * Applies provider-resolved fields without inventing a ticker.
 * When the user ticker is empty and EODHD returns a Code, that Code is used
 * as the display symbol — sourced from the provider, not inferred.
 */
export function applyResolvedToHolding<
  T extends {
    symbol: string;
    isin?: string | null;
    exchange?: string | null;
    name: string;
    providerSymbol?: string | null;
    instrumentName?: string | null;
    matchMethod?: ResolvedInstrument["matchMethod"];
    matchConfidence?: number;
    requiresConfirmation?: boolean;
    matchWarnings?: string[];
  },
>(holding: T, resolved: ResolvedInstrument): T {
  const providerCode = resolved.providerSymbol?.split(".")[0] ?? "";

  return {
    ...holding,
    symbol: holding.symbol.trim() || providerCode || holding.symbol,
    isin: resolved.isin ?? holding.isin ?? null,
    exchange: resolved.exchange ?? holding.exchange ?? null,
    providerSymbol: resolved.providerSymbol,
    instrumentName: resolved.instrumentName ?? holding.instrumentName ?? null,
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
