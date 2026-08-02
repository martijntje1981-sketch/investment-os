import { buildProviderSymbol } from "@/lib/services/instruments/eodhdClient";
import { matchInstrument } from "@/lib/services/instruments";
import { resolveExchangeForMatching } from "@/lib/services/instruments/exchangeNormalizer";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type ConsensusSymbolInput = Pick<
  StoredPortfolioHolding,
  "symbol" | "name" | "isin" | "exchange" | "providerSymbol"
>;

/** Builds a canonical EODHD provider symbol from ticker + normalized exchange. */
export function buildConsensusProviderSymbolFromParts(
  symbol: string,
  exchange: string | null | undefined,
): string | null {
  const ticker = symbol.trim().toUpperCase();
  if (!ticker) return null;

  const normalizedExchange = resolveExchangeForMatching(exchange);
  if (!normalizedExchange) return null;

  return buildProviderSymbol(ticker, normalizedExchange);
}

/**
 * Synchronous provider-symbol resolution for in-flight consensus requests.
 * Prefers stored providerSymbol, then ticker+exchange, never inventing exchange-less suffixes.
 */
export function resolveConsensusProviderSymbolSync(
  holding: Pick<
    StoredPortfolioHolding,
    "symbol" | "exchange" | "providerSymbol"
  >,
): string {
  if (holding.providerSymbol?.trim()) {
    return holding.providerSymbol.trim().toUpperCase();
  }

  const fromExchange = buildConsensusProviderSymbolFromParts(
    holding.symbol,
    holding.exchange,
  );
  if (fromExchange) {
    return fromExchange;
  }

  return holding.symbol.trim().toUpperCase();
}

/** Async resolution using the central instrument match engine, with exchange fallback. */
export async function resolveConsensusProviderSymbol(
  holding: ConsensusSymbolInput,
): Promise<string | null> {
  if (holding.providerSymbol?.trim()) {
    return holding.providerSymbol.trim().toUpperCase();
  }

  const matched = await matchInstrument({
    ticker: holding.symbol || null,
    isin: holding.isin ?? null,
    exchange: holding.exchange ?? null,
    instrumentName: holding.name ?? null,
    assetType: "investment",
  });

  if (matched?.providerSymbol) {
    return matched.providerSymbol.trim().toUpperCase();
  }

  return buildConsensusProviderSymbolFromParts(
    holding.symbol,
    holding.exchange,
  );
}
