import { describe, expect, it } from "vitest";

import {
  backfillListingQuoteCurrency,
  resolveListingQuoteCurrency,
} from "@/lib/services/instruments/quoteCurrency";
import {
  lookupVerifiedByIsin,
  lookupVerifiedByProviderSymbol,
  lookupVerifiedByTickerExchange,
} from "@/lib/services/instruments/verifiedInstrumentRegistry";
import { enrichHoldingWithVerifiedMapping } from "@/lib/services/portfolio/enrichHoldingsWithVerifiedMappings";
import { applyPricesToHoldings } from "@/lib/client/portfolioPricing";
import { createEodhdMarketDataProvider } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import {
  resolveQuotePriceTarget,
  resolveQuotePriceTargets,
} from "@/lib/services/prices/resolvePriceTargets";
import type { PriceApiQuote } from "@/lib/types/portfolioStorage";
import type { ResolvedPriceTarget } from "@/lib/services/prices/types";

const VUSA_TARGET: ResolvedPriceTarget = {
  symbol: "VUSA",
  providerSymbol: "VUSA.AS",
  isin: "IE00B3XXRP09",
  name: "Vanguard S&P 500 UCITS ETF",
  currency: "EUR",
};

function manualVusaHolding() {
  return {
    id: "vusa-manual",
    symbol: "VUSA",
    name: "Vanguard S&P 500 UCITS ETF",
    quantity: 10,
    purchasePrice: 120,
    currentPrice: 124.425,
    currency: "EUR" as const,
    assetType: "investment" as const,
    exchange: "AS",
    isin: "IE00B3XXRP09",
    providerSymbol: "VUSA.AS",
    confirmationSource: "manual_exact_listing" as const,
    matchMethod: "ticker_exchange" as const,
    requiresConfirmation: true,
    priceDataStatus: "stale" as const,
  };
}

describe("VUSA.AS Euronext Amsterdam quote currency", () => {
  it("maps manual Amsterdam listings to VUSA.AS in the verified registry", () => {
    expect(lookupVerifiedByTickerExchange("VUSA", "Euronext Amsterdam")?.providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(lookupVerifiedByTickerExchange("VUSA", "Amsterdam")?.providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(lookupVerifiedByIsin("IE00B3XXRP09", "Amsterdam")?.providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(lookupVerifiedByProviderSymbol("VUSA.AS")?.quoteCurrency).toBe("EUR");
  });

  it("resolves quote targets for manually added VUSA without persisted quoteCurrency", () => {
    const { targets, errors, skipped } = resolveQuotePriceTargets([
      {
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        isin: "IE00B3XXRP09",
        exchange: "AS",
        name: "Vanguard S&P 500 UCITS ETF",
      },
    ]);

    expect(errors).toEqual([]);
    expect(skipped).toBe(0);
    expect(targets).toHaveLength(1);
    expect(targets[0]?.providerSymbol).toBe("VUSA.AS");
    expect(targets[0]?.currency).toBe("EUR");
    expect(resolveQuotePriceTarget({
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      isin: "IE00B3XXRP09",
    })?.currency).toBe("EUR");
  });

  it("backfills EUR quote currency for stored manual VUSA holdings", () => {
    const backfilled = backfillListingQuoteCurrency(manualVusaHolding());
    expect(backfilled.quoteCurrency).toBe("EUR");
    expect(backfilled.currency).toBe("EUR");
    expect(backfilled.providerSymbol).toBe("VUSA.AS");
  });

  it("normalizes EODHD VUSA.AS realtime payloads without wire currency", () => {
    const provider = createEodhdMarketDataProvider("test-key");
    const normalized = provider.normalizeQuote(
      VUSA_TARGET,
      {
        providerSymbol: "VUSA.AS",
        wireCurrency: null,
        originalCurrency: "EUR",
        originalPrice: 124.425,
        previousCloseOriginal: 123.96,
        changeOriginal: 0.465,
        changePercentOriginal: 0.3751,
        open: 124.301,
        high: 124.448,
        low: 124.213,
        volume: 12773,
        timestamp: Math.floor(Date.now() / 1000),
        updatedAt: new Date().toISOString(),
        marketStatus: null,
      },
      {
        EUR: 1,
        USD: 0.9,
        GBP: null,
        CHF: null,
      },
    );

    expect(normalized.currency).toBe("EUR");
    expect(normalized.currentPrice).toBe(124.425);
    expect(normalized.previousClose).toBe(123.96);
    expect(normalized.change).toBeCloseTo(0.465, 3);
    expect(normalized.changePercent).toBeCloseTo(0.3751, 3);
    expect(normalized.dataStatus).not.toBe("stale");
    expect(normalized.dataStatus).not.toBe("unavailable");
  });

  it("applies live VUSA quotes instead of leaving a stale manual holding", () => {
    const enriched = enrichHoldingWithVerifiedMapping(manualVusaHolding());
    const now = new Date().toISOString();
    const quote: PriceApiQuote = {
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      isin: "IE00B3XXRP09",
      priceEur: 124.425,
      currentPrice: 124.425,
      previousClose: 123.96,
      change: 0.465,
      changePercent: 0.3751,
      currency: "EUR",
      updatedAt: now,
      fetchedAt: now,
      dataStatus: "live",
      cacheStatus: "fresh",
    };

    const [updated] = applyPricesToHoldings([enriched], [quote]);
    expect(updated?.currentPrice).toBe(124.425);
    expect(updated?.previousClose).toBe(123.96);
    expect(updated?.changePercent).toBeCloseTo(0.3751, 3);
    expect(updated?.priceDataStatus).toBe("live");
    expect(resolveListingQuoteCurrency({
      persistedQuoteCurrency: updated?.quoteCurrency ?? null,
      providerSymbol: "VUSA.AS",
    }).currency).toBe("EUR");
  });
});
