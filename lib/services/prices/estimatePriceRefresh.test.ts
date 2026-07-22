import { beforeEach, describe, expect, it } from "vitest";

import { buildQuoteCacheKey, resetMarketPriceCacheForTests, writeCachedQuote } from "@/lib/services/prices/cache/marketPriceCache";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import { estimatePriceRefreshForTargets } from "@/lib/services/prices/estimatePriceRefresh";
import { resetPriceServiceStateForTests } from "@/lib/services/prices/priceService";
import type { ResolvedPriceTarget } from "@/lib/services/prices/types";

const VWCE: ResolvedPriceTarget = {
  symbol: "VWCE",
  providerSymbol: "VWCE.XETRA",
  isin: "IE00BK5BQT80",
  name: "Vanguard FTSE All-World",
  currency: "EUR",
};

describe("estimatePriceRefreshForTargets", () => {
  beforeEach(() => {
    resetPriceServiceStateForTests();
    resetMarketPriceCacheForTests();
  });

  it("requires zero provider calls when all unique symbols are fresh in cache", async () => {
    const cacheKey = buildQuoteCacheKey(EODHD_QUOTE_PROVIDER_ID, "VWCE.XETRA");
    writeCachedQuote(
      cacheKey,
      {
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        currentPrice: 110,
        previousClose: 100,
        change: 10,
        changePercent: 10,
        currency: "EUR",
        marketStatus: "open",
        updatedAt: new Date().toISOString(),
        provider: "eodhd-quotes",
        isStale: false,
        unavailableReason: null,
        dataStatus: "live",
        cacheStatus: "fresh",
      },
      "VWCE.XETRA",
    );

    const estimate = await estimatePriceRefreshForTargets([VWCE, VWCE]);
    expect(estimate.uniqueSymbols).toEqual(["VWCE.XETRA"]);
    expect(estimate.cacheHits).toBe(1);
    expect(estimate.providerCallsRequired).toBe(0);
  });
});
