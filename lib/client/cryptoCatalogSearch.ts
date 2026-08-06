import type { CryptoSearchResult } from "@/lib/services/portfolio/cryptoCatalog";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CryptoCatalogSearchResponse = {
  success: boolean;
  query: string;
  pairCurrency: string;
  results: CryptoSearchResult[];
  source?: "cache" | "provider" | "stale_cache";
  totalCatalogEntries?: number;
  error?: string;
};

export async function searchCryptoCatalogForPair(input: {
  query: string;
  pairCurrency: string;
}): Promise<CryptoCatalogSearchResponse> {
  const params = new URLSearchParams({
    q: input.query.trim(),
    pairCurrency: input.pairCurrency.trim().toUpperCase(),
  });
  const response = await fetch(`/api/crypto/search?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return (await response.json()) as CryptoCatalogSearchResponse;
}

export function resolveCryptoDraftSearchQuery(
  draft: Pick<StoredPortfolioHolding, "providerSymbol" | "tradingPair" | "symbol" | "name">,
): string {
  return (
    draft.providerSymbol?.trim() ||
    draft.tradingPair?.trim() ||
    draft.symbol?.trim() ||
    draft.name?.trim() ||
    ""
  );
}
