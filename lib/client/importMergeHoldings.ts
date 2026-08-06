/**
 * Safe merge of imported holdings into an existing portfolio.
 * Prefer skip over inventing quantity/price merges.
 */

import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function holdingIdentityKey(
  holding: Pick<
    StoredPortfolioHolding,
    "providerSymbol" | "isin" | "symbol" | "exchange" | "assetType"
  >,
): string | null {
  const provider = holding.providerSymbol?.trim();
  if (provider) return `ps:${provider.toUpperCase()}`;

  const isin = holding.isin?.trim();
  if (isin) return `isin:${isin.toUpperCase()}`;

  if (holding.assetType === "cash") {
    const currency = holding.symbol?.trim();
    return currency ? `cash:${currency.toUpperCase()}` : null;
  }

  const symbol = holding.symbol?.trim();
  const exchange = holding.exchange?.trim();
  if (symbol && exchange) {
    return `sym:${symbol.toUpperCase()}|${exchange.toUpperCase()}`;
  }

  return null;
}

export function mergeImportedHoldings(
  existing: StoredPortfolioHolding[],
  incoming: StoredPortfolioHolding[],
): {
  holdings: StoredPortfolioHolding[];
  skippedDuplicates: number;
} {
  const keys = new Set<string>();
  for (const holding of existing) {
    const key = holdingIdentityKey(holding);
    if (key) keys.add(key);
  }

  const holdings = [...existing];
  let skippedDuplicates = 0;

  for (const row of incoming) {
    const key = holdingIdentityKey(row);
    if (key && keys.has(key)) {
      skippedDuplicates += 1;
      continue;
    }
    if (key) keys.add(key);
    holdings.push(row);
  }

  return { holdings, skippedDuplicates };
}
