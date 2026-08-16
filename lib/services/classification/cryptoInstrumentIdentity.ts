/**
 * Deterministic crypto instrument identity helpers.
 * Symbol/name heuristics only — no provider calls.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CryptoIdentityHolding = Pick<
  StoredPortfolioHolding,
  "symbol" | "name" | "providerSymbol"
>;

/** Direct / reliably named Bitcoin exposure (incl. Bitcoin-named crypto products). */
export function isBitcoinHolding(holding: CryptoIdentityHolding): boolean {
  const symbol = holding.symbol.trim().toUpperCase();
  const provider = (holding.providerSymbol ?? "").toUpperCase();
  const name = holding.name.trim().toUpperCase();
  return (
    symbol === "BTC" ||
    symbol.startsWith("BTC") ||
    provider.startsWith("BTC-") ||
    provider.startsWith("BTC.") ||
    name === "BITCOIN" ||
    name.includes("BITCOIN")
  );
}
