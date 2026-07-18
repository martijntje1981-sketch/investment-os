/**
 * Default portfolio seed for server routes that need backward-compatible
 * demo data (GET /api/prices, GET /api/briefing) without hardcoded provider symbols.
 */

import type { InstrumentMatchInput } from "@/lib/types/instrument";
import { holdings } from "@/lib/services/portfolio/holdings";

/** Builds match inputs from the static demo portfolio seed in holdings.ts. */
export function getDefaultPortfolioPriceSeed(): InstrumentMatchInput[] {
  return holdings.map((holding) => ({
    ticker: holding.symbol,
    instrumentName: holding.name,
    assetType: "investment" as const,
  }));
}
