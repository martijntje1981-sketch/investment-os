import { buildQuoteCacheKey, readCachedQuote } from "@/lib/services/prices/cache/marketPriceCache";
import { EODHD_API_PROVIDER_ID } from "@/lib/services/marketData/eodhdDailyQuota";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import { isProviderCircuitOpen } from "@/lib/services/marketData/providerCircuitBreaker";
import {
  dedupeResolvedTargets,
  resolveQuotePriceTargets,
} from "@/lib/services/prices/resolvePriceTargets";
import type {
  PriceHoldingInput,
  PriceRefreshSummary,
  ResolvedPriceTarget,
} from "@/lib/services/prices/types";

async function readQuoteFreshness(
  target: ResolvedPriceTarget,
): Promise<boolean> {
  const cacheKey = buildQuoteCacheKey(
    EODHD_QUOTE_PROVIDER_ID,
    target.providerSymbol,
  );
  const memory = readCachedQuote(cacheKey);
  if (memory?.fresh) {
    return true;
  }

  const { readPersistedQuote } = await import(
    "@/lib/services/marketData/persistentQuoteCache"
  );
  const persisted = await readPersistedQuote(cacheKey);
  return persisted?.fresh ?? false;
}

export async function estimatePriceRefreshForTargets(
  targets: ResolvedPriceTarget[],
): Promise<PriceRefreshSummary> {
  const uniqueTargets = dedupeResolvedTargets(targets);
  const uniqueSymbols = uniqueTargets.map((target) => target.providerSymbol);
  const skippedSymbols: string[] = [];
  let cacheHits = 0;
  let providerCallsRequired = 0;
  const circuitOpen =
    isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID) ||
    isProviderCircuitOpen(EODHD_API_PROVIDER_ID);

  for (const target of uniqueTargets) {
    if (circuitOpen) {
      const fresh = await readQuoteFreshness(target);
      if (fresh) {
        cacheHits += 1;
      } else {
        skippedSymbols.push(target.providerSymbol);
      }
      continue;
    }

    const fresh = await readQuoteFreshness(target);
    if (fresh) {
      cacheHits += 1;
    } else {
      providerCallsRequired += 1;
    }
  }

  if (providerCallsRequired > 0 && circuitOpen) {
    providerCallsRequired = 0;
  }

  return {
    uniqueSymbols,
    cacheHits,
    providerCallsRequired,
    providerCallsMade: 0,
    skippedSymbols,
    circuitOpen,
    estimateOnly: true,
  };
}

export async function estimatePriceRefreshForHoldings(
  holdings: PriceHoldingInput[],
  options?: { onlyProviderSymbols?: string[] },
): Promise<PriceRefreshSummary> {
  const { targets } = resolveQuotePriceTargets(holdings, options);
  return estimatePriceRefreshForTargets(targets);
}
