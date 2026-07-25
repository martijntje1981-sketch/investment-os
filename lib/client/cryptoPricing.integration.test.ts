import { describe, expect, it } from "vitest";

import {
  buildPriceLookup,
  isQuoteCompatibleWithHolding,
  parsePriceApiResponseQuotes,
} from "@/lib/client/portfolioPricing";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { resolveHoldingDisplayPrice } from "@/lib/client/holdingDisplayPrice";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const btcEur: StoredPortfolioHolding = {
  id: "btc-1",
  assetType: "crypto",
  symbol: "BTC",
  name: "Bitcoin",
  quantity: 0.5,
  purchasePrice: 40_000,
  currentPrice: 95_000,
  currentPairPrice: 95_000,
  pairCurrency: "EUR",
  tradingPair: "BTC/EUR",
  currency: "EUR",
  portfolioCurrency: "EUR",
  pricingStatus: "price_unavailable",
  priceDataStatus: "live",
  change24hPercent: 2.1,
  providerSymbol: "BTC-EUR.CC",
};

describe("crypto client pricing integration", () => {
  it("uses pair price for display and EUR price for portfolio valuation", () => {
    const display = resolveHoldingDisplayPrice(btcEur);
    expect(display.price).toBe(95_000);
    expect(display.quoteCurrency).toBe("EUR");
    expect(getHoldingMarketValue(btcEur)).toBe(47_500);
  });

  it("excludes unpriced crypto from market value", () => {
    const unpriced: StoredPortfolioHolding = {
      ...btcEur,
      currentPrice: 0,
      currentPairPrice: null,
      priceDataStatus: "unavailable",
    };
    expect(getHoldingMarketValue(unpriced)).toBeNull();
    expect(resolveHoldingDisplayPrice(unpriced).source).toBe("unavailable");
  });

  it("never uses purchase price as live crypto display price", () => {
    const unpriced: StoredPortfolioHolding = {
      ...btcEur,
      currentPrice: 0,
      currentPairPrice: null,
      purchasePrice: 40_000,
      priceDataStatus: "unavailable",
    };
    expect(resolveHoldingDisplayPrice(unpriced).price).toBeNull();
  });

  it("reuses one normalized pair quote for duplicate holdings", () => {
    const quote = parsePriceApiResponseQuotes([
      {
        symbol: "BTC",
        assetType: "crypto",
        normalizedPair: "BTC/EUR",
        pairPrice: 95_000,
        priceEur: 47_500,
        currentPrice: 47_500,
        change24hPercent: 2.1,
        currency: "EUR",
        provider: "eodhd",
        providerDisplayName: "EODHD",
        updatedAt: new Date().toISOString(),
      },
    ]);

    const lookup = buildPriceLookup(quote);
    const second = { ...btcEur, id: "btc-2" };
    expect(lookup.get("BTC/EUR")).toBeDefined();
    expect(isQuoteCompatibleWithHolding(btcEur, quote[0]!)).toBe(true);
    expect(isQuoteCompatibleWithHolding(second, quote[0]!)).toBe(true);
  });
});
