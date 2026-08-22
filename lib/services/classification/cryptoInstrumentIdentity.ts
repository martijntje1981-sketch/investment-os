/**
 * Deterministic crypto instrument identity helpers.
 * Symbol/name heuristics only — no provider calls.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";

export type CryptoIdentityHolding = Pick<
  StoredPortfolioHolding,
  "symbol" | "name" | "providerSymbol" | "assetType"
>;

/** Direct / reliably named Bitcoin exposure (incl. Bitcoin-named crypto products). */
export function isBitcoinHolding(
  holding: Pick<CryptoIdentityHolding, "symbol" | "name" | "providerSymbol">,
): boolean {
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

/** Direct / reliably named Ethereum exposure (incl. Ethereum-named products). */
export function isEthereumHolding(
  holding: Pick<CryptoIdentityHolding, "symbol" | "name" | "providerSymbol">,
): boolean {
  const symbol = holding.symbol.trim().toUpperCase().replace(/[-_/].*$/, "");
  const provider = (holding.providerSymbol ?? "").toUpperCase();
  const name = holding.name.trim().toUpperCase();
  return (
    symbol === "ETH" ||
    provider.startsWith("ETH-") ||
    provider.startsWith("ETH.") ||
    name === "ETHEREUM" ||
    name.includes("ETHEREUM")
  );
}

/**
 * Native crypto sleeve or reliably identified Bitcoin/Ethereum ETP-style exposure.
 * Does not invent crypto from ambiguous equity names.
 */
export function isCryptoIntelligenceHolding(
  holding: CryptoIdentityHolding,
): boolean {
  if (isCryptoHolding(holding)) return true;
  if (holding.assetType === "cash") return false;
  return isBitcoinHolding(holding) || isEthereumHolding(holding);
}
