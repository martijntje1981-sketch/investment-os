import { describe, expect, it } from "vitest";

import { buildCryptoPriceMetadataLine } from "@/lib/client/cryptoPriceDisplay";
import {
  applyPricesToHoldings,
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

const ethUsd: StoredPortfolioHolding = {
  id: "eth-usd",
  assetType: "crypto",
  symbol: "ETH",
  name: "Ethereum",
  quantity: 2,
  purchasePrice: 0,
  currentPrice: 0,
  currentPairPrice: null,
  pairCurrency: "USD",
  tradingPair: "ETH/USD",
  currency: "EUR",
  portfolioCurrency: "EUR",
  pricingStatus: "price_unavailable",
  priceDataStatus: "unavailable",
  providerSymbol: "ETH-USD.CC",
};

const ethEur: StoredPortfolioHolding = {
  id: "eth-eur",
  assetType: "crypto",
  symbol: "ETH",
  name: "Ethereum",
  quantity: 1,
  purchasePrice: 0,
  currentPrice: 0,
  currentPairPrice: null,
  pairCurrency: "EUR",
  tradingPair: "ETH/EUR",
  currency: "EUR",
  portfolioCurrency: "EUR",
  pricingStatus: "price_unavailable",
  priceDataStatus: "unavailable",
  providerSymbol: "ETH-EUR.CC",
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

  it("keeps ETH/USD and ETH/EUR quotes separate by normalized pair", () => {
    const quotes = parsePriceApiResponseQuotes([
      {
        symbol: "ETH",
        assetType: "crypto",
        normalizedPair: "ETH/USD",
        pairPrice: 1_854.32,
        priceEur: 1_706.97,
        currentPrice: 1_706.97,
        change24hPercent: -0.48,
        currency: "USD",
        provider: "eodhd",
        providerDisplayName: "EODHD",
        updatedAt: "2026-07-25T09:00:00.000Z",
      },
      {
        symbol: "ETH",
        assetType: "crypto",
        normalizedPair: "ETH/EUR",
        pairPrice: 1_630.5,
        priceEur: 1_630.5,
        currentPrice: 1_630.5,
        change24hPercent: -0.48,
        currency: "EUR",
        provider: "eodhd",
        providerDisplayName: "EODHD",
        sourcePair: "ETH/USD",
        conversionApplied: true,
        conversionPath: "USD/EUR",
        updatedAt: "2026-07-25T09:00:00.000Z",
      },
    ]);

    expect(isQuoteCompatibleWithHolding(ethUsd, quotes[0]!)).toBe(true);
    expect(isQuoteCompatibleWithHolding(ethEur, quotes[1]!)).toBe(true);
    expect(isQuoteCompatibleWithHolding(ethEur, quotes[0]!)).toBe(false);
    expect(isQuoteCompatibleWithHolding(ethUsd, quotes[1]!)).toBe(false);

    const lookup = buildPriceLookup(quotes);
    expect(lookup.get("ETH/USD")?.pairPrice).toBe(1_854.32);
    expect(lookup.get("ETH/EUR")?.pairPrice).toBe(1_630.5);
  });

  it("applies converted ETH/EUR quote to the uploaded holding without using purchase price", () => {
    const quotes = parsePriceApiResponseQuotes([
      {
        symbol: "ETH",
        assetType: "crypto",
        normalizedPair: "ETH/EUR",
        pairPrice: 1_630.5,
        priceEur: 1_630.5,
        currentPrice: 1_630.5,
        change24hPercent: -0.48,
        currency: "EUR",
        provider: "eodhd",
        providerDisplayName: "EODHD",
        sourcePair: "ETH/USD",
        conversionApplied: true,
        conversionPath: "USD/EUR",
        updatedAt: "2026-07-25T09:05:00.000Z",
      },
    ]);

    const [updated] = applyPricesToHoldings([ethEur], quotes);
    expect(updated?.currentPairPrice).toBe(1_630.5);
    expect(updated?.currentPrice).toBe(1_630.5);
    expect(updated?.pairCurrency).toBe("EUR");
    expect(updated?.quoteSourcePair).toBe("ETH/USD");
    expect(updated?.quoteConversionPath).toBe("USD/EUR");
    expect(resolveHoldingDisplayPrice(updated!).price).toBe(1_630.5);
    expect(getHoldingMarketValue(updated!)).toBe(1_630.5);
  });

  it("shows the same ETH/EUR quote on portfolio and dashboard surfaces", () => {
    const quotes = parsePriceApiResponseQuotes([
      {
        symbol: "ETH",
        assetType: "crypto",
        normalizedPair: "ETH/EUR",
        pairPrice: 1_630.5,
        priceEur: 1_630.5,
        currentPrice: 1_630.5,
        change24hPercent: -0.48,
        currency: "EUR",
        provider: "eodhd",
        providerDisplayName: "EODHD",
        sourcePair: "ETH/USD",
        conversionApplied: true,
        conversionPath: "USD/EUR",
        updatedAt: "2026-07-25T09:05:00.000Z",
      },
    ]);

    const [updated] = applyPricesToHoldings([ethEur], quotes);
    const portfolioDisplay = resolveHoldingDisplayPrice(updated!);
    const dashboardDisplay = resolveHoldingDisplayPrice(updated!);

    expect(portfolioDisplay.price).toBe(1_630.5);
    expect(dashboardDisplay.price).toBe(1_630.5);
    expect(buildCryptoPriceMetadataLine(updated!)).toContain(
      "Price via EODHD · ETH/USD converted to ETH/EUR",
    );
  });

  it("applies converted XRP/EUR quote to the XRP holding with pair-first matching", () => {
    const xrpEur: StoredPortfolioHolding = {
      id: "xrp-eur",
      assetType: "crypto",
      symbol: "XRP",
      name: "XRP",
      quantity: 12_000,
      purchasePrice: 0,
      currentPrice: 0,
      currentPairPrice: null,
      pairCurrency: "EUR",
      tradingPair: "XRP/EUR",
      currency: "EUR",
      portfolioCurrency: "EUR",
      pricingStatus: "price_unavailable",
      priceDataStatus: "unavailable",
      providerSymbol: "XRP-EUR.CC",
    };

    const quotes = parsePriceApiResponseQuotes([
      {
        symbol: "XRP",
        assetType: "crypto",
        normalizedPair: "XRP/EUR",
        pairPrice: 0.9561,
        priceEur: 0.9561,
        currentPrice: 0.9561,
        change24hPercent: 0.12,
        currency: "EUR",
        provider: "eodhd",
        providerDisplayName: "EODHD",
        sourcePair: "XRP/USD",
        conversionApplied: true,
        conversionPath: "USD/EUR",
        updatedAt: "2026-07-25T09:05:00.000Z",
      },
    ]);

    const [updated] = applyPricesToHoldings([xrpEur], quotes);
    expect(updated?.tradingPair).toBe("XRP/EUR");
    expect(updated?.currentPairPrice).toBe(0.9561);
    expect(updated?.quoteSourcePair).toBe("XRP/USD");
    expect(getHoldingMarketValue(updated!)).toBeCloseTo(12_000 * 0.9561, 2);
    expect(buildCryptoPriceMetadataLine(updated!)).toContain(
      "Price via EODHD · XRP/USD converted to XRP/EUR",
    );
  });

  it("keeps BTC/EUR, ETH/EUR and SOL/USDC quotes working alongside XRP/EUR", () => {
    const quotes = parsePriceApiResponseQuotes([
      {
        symbol: "BTC",
        assetType: "crypto",
        normalizedPair: "BTC/EUR",
        pairPrice: 56_000,
        priceEur: 56_000,
        currentPrice: 56_000,
        currency: "EUR",
        provider: "eodhd",
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "ETH",
        assetType: "crypto",
        normalizedPair: "ETH/EUR",
        pairPrice: 1_630,
        priceEur: 1_630,
        currentPrice: 1_630,
        currency: "EUR",
        provider: "eodhd",
        sourcePair: "ETH/USD",
        conversionApplied: true,
        conversionPath: "USD/EUR",
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "SOL",
        assetType: "crypto",
        normalizedPair: "SOL/USDC",
        pairPrice: 73.9,
        priceEur: 65.0,
        currentPrice: 65.0,
        currency: "USDC",
        provider: "eodhd",
        sourcePair: "SOL/USD",
        conversionApplied: true,
        conversionPath: "USD/USDC",
        updatedAt: new Date().toISOString(),
      },
      {
        symbol: "XRP",
        assetType: "crypto",
        normalizedPair: "XRP/EUR",
        pairPrice: 0.9561,
        priceEur: 0.9561,
        currentPrice: 0.9561,
        currency: "EUR",
        provider: "eodhd",
        sourcePair: "XRP/USD",
        conversionApplied: true,
        conversionPath: "USD/EUR",
        updatedAt: new Date().toISOString(),
      },
    ]);

    expect(quotes).toHaveLength(4);
    expect(buildPriceLookup(quotes).get("XRP/EUR")?.pairPrice).toBe(0.9561);
    expect(buildPriceLookup(quotes).get("SOL/USDC")?.pairPrice).toBe(73.9);
  });
});
