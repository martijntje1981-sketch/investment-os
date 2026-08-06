import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  readLastLivePriceRefreshAt,
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  applyCachedPrices,
  applyPricesToHoldings,
  countAppliedPriceUpdates,
  isQuoteCompatibleWithHolding,
  prepareHoldingsForPricing,
  readPriceCacheEntries,
  writePriceCache,
} from "@/lib/client/portfolioPricing";
import { migrateLegacyCryptoHolding } from "@/lib/services/portfolio/legacyCryptoHoldingMigration";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { HoldingPrice } from "@/lib/services/prices/types";

const USER = "user-crypto-quote-application";

function migratedBtcUsd(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return migrateLegacyCryptoHolding({
    id: "legacy-btc",
    assetType: "crypto",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.42,
    purchasePrice: 30_000,
    currentPrice: 0,
    currentPairPrice: null,
    pairCurrency: "USD",
    tradingPair: "BTC/USD",
    providerSymbol: "BTC-USD.CC",
    providerName: "EODHD",
    priceUpdatedAt: "2026-07-25T15:16:00.000Z",
    marketPriceUpdatedAt: "2026-07-25T15:16:00.000Z",
    pricingStatus: "price_unavailable",
    ...overrides,
  }).holding;
}

function migratedSolUsd(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return migrateLegacyCryptoHolding({
    id: "legacy-sol",
    assetType: "crypto",
    symbol: "SOL",
    name: "Solana",
    quantity: 150,
    purchasePrice: 80,
    currentPrice: 0,
    currentPairPrice: null,
    pairCurrency: "USD",
    tradingPair: "SOL/USD",
    providerSymbol: "SOL-USD.CC",
    providerName: "EODHD",
    priceUpdatedAt: "2026-07-25T14:00:00.000Z",
    pricingStatus: "price_unavailable",
    ...overrides,
  }).holding;
}

/** Matches PriceService HoldingPrice JSON: pair identity lives under crypto only. */
function serverBtcUsdPrice(): HoldingPrice {
  return {
    symbol: "BTC",
    eodhdSymbol: "BTC-USD.CC",
    providerSymbol: "BTC-USD.CC",
    isin: null,
    name: "Bitcoin",
    originalCurrency: "USD",
    originalPrice: 95_000,
    baseCurrency: "EUR",
    exchangeRateToEur: null,
    priceEur: 87_500,
    currentPrice: 87_500,
    pairPrice: 95_000,
    previousCloseOriginal: null,
    previousCloseEur: null,
    previousClose: null,
    change: null,
    changePercent: 1.2,
    change24hPercent: 1.2,
    currency: "USD",
    dataStatus: "live",
    cacheStatus: "fresh",
    provider: "eodhd-quotes",
    providerDisplayName: "EODHD",
    isStale: false,
    unavailableReason: null,
    open: null,
    high: null,
    low: null,
    volume: null,
    timestamp: null,
    updatedAt: "2026-07-25T18:00:00.000Z",
    fetchedAt: "2026-07-25T18:00:00.000Z",
    assetType: "crypto",
    crypto: {
      assetType: "crypto",
      baseAsset: "BTC",
      quoteCurrency: "USD",
      normalizedPair: "BTC/USD",
      pairPrice: 95_000,
      change24hPercent: 1.2,
      sourcePair: "BTC/USD",
      conversionApplied: true,
      conversionPath: "USD->EUR",
      providerId: "eodhd-quotes",
      providerDisplayName: "EODHD",
      fetchedAt: "2026-07-25T18:00:00.000Z",
      unavailableReason: null,
    },
  };
}

function serverSolUsdPrice(): HoldingPrice {
  return {
    ...serverBtcUsdPrice(),
    symbol: "SOL",
    eodhdSymbol: "SOL-USD.CC",
    providerSymbol: "SOL-USD.CC",
    name: "Solana",
    originalPrice: 150,
    priceEur: 138,
    currentPrice: 138,
    pairPrice: 150,
    changePercent: -0.8,
    change24hPercent: -0.8,
    crypto: {
      assetType: "crypto",
      baseAsset: "SOL",
      quoteCurrency: "USD",
      normalizedPair: "SOL/USD",
      pairPrice: 150,
      change24hPercent: -0.8,
      sourcePair: "SOL/USD",
      conversionApplied: true,
      conversionPath: "USD->EUR",
      providerId: "eodhd-quotes",
      providerDisplayName: "EODHD",
      fetchedAt: "2026-07-25T18:00:00.000Z",
      unavailableReason: null,
    },
  };
}

describe("crypto quote application from server-shaped API prices", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLivePriceRefreshStateForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ success: true, canAffordRefresh: true }),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("enriches nested crypto pair identity before compatibility checks during application", () => {
    const prepared = prepareHoldingsForPricing([migratedBtcUsd()]);
    const [updated] = applyPricesToHoldings(prepared, [serverBtcUsdPrice()]);

    expect(updated?.currentPairPrice).toBe(95_000);
    expect(updated?.currentPrice).toBe(87_500);
  });

  it("applies server-shaped BTC/USD and SOL/USD quotes to migrated test-account holdings", () => {
    const prepared = prepareHoldingsForPricing([
      migratedBtcUsd(),
      migratedSolUsd(),
    ]);
    const serverPrices = [serverBtcUsdPrice(), serverSolUsdPrice()];

    const updated = applyPricesToHoldings(prepared, serverPrices);
    expect(countAppliedPriceUpdates(prepared, updated)).toBe(2);

    expect(updated[0]).toMatchObject({
      id: "legacy-btc",
      quantity: 0.42,
      purchasePrice: 30_000,
      currentPairPrice: 95_000,
      currentPrice: 87_500,
      pairCurrency: "USD",
      tradingPair: "BTC/USD",
      providerSymbol: "BTC-USD.CC",
      change24hPercent: 1.2,
      quoteConversionApplied: true,
      quoteConversionPath: "USD->EUR",
      priceDataStatus: "live",
      priceUpdatedAt: "2026-07-25T18:00:00.000Z",
      marketPriceUpdatedAt: "2026-07-25T18:00:00.000Z",
    });
    expect(updated[1]).toMatchObject({
      id: "legacy-sol",
      quantity: 150,
      purchasePrice: 80,
      currentPairPrice: 150,
      currentPrice: 138,
      change24hPercent: -0.8,
    });
  });

  it("refreshes both crypto holdings end-to-end with server-shaped API prices", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T21:30:00.000Z"));

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          canAffordRefresh: true,
          refreshSummary: { providerCallsRequired: 2, totalCallsRequired: 2 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [serverBtcUsdPrice(), serverSolUsdPrice()],
          requested: 2,
          received: 2,
          refreshSummary: { providerCallsMade: 2 },
          lastSuccessfulUpdate: "2026-07-25T18:00:00.000Z",
        }),
      } as Response);

    const holdings = [migratedBtcUsd(), migratedSolUsd()];
    const result = await refreshLivePortfolioPrices(USER, holdings);

    expect(result.updated).toBe(true);
    expect(result.updatedCount).toBe(2);
    expect(result.message).toBe("Live prices updated for 2 holdings.");
    expect(result.showCryptoRefreshDiagnostics).toBeFalsy();
    expect(readLastLivePriceRefreshAt(USER)).toBe("2026-07-25T21:30:00.000Z");
    expect(result.holdings[0]?.currentPairPrice).toBe(95_000);
    expect(result.holdings[1]?.currentPairPrice).toBe(150);

    const cached = readPriceCacheEntries(USER);
    expect(cached.some((entry) => entry.normalizedPair === "BTC/USD")).toBe(true);
    expect(cached.some((entry) => entry.normalizedPair === "SOL/USD")).toBe(true);

    vi.useRealTimers();
  });

  it("still rejects strict pair mismatches after enrichment", () => {
    const [btc] = prepareHoldingsForPricing([migratedBtcUsd()]);
    const wrongPair = {
      ...serverBtcUsdPrice(),
      crypto: {
        ...serverBtcUsdPrice().crypto!,
        normalizedPair: "BTC/EUR",
      },
    };

    expect(isQuoteCompatibleWithHolding(btc!, wrongPair)).toBe(false);
    const [updated] = applyPricesToHoldings([btc!], [wrongPair]);
    expect(updated?.currentPairPrice).toBeNull();
    expect(updated?.currentPrice).toBe(0);
  });

  it("reloads applied crypto prices from cache after refresh", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          canAffordRefresh: true,
          refreshSummary: { providerCallsRequired: 2, totalCallsRequired: 2 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [serverBtcUsdPrice(), serverSolUsdPrice()],
          requested: 2,
          received: 2,
          refreshSummary: { providerCallsMade: 2 },
        }),
      } as Response);

    const holdings = [migratedBtcUsd(), migratedSolUsd()];
    await refreshLivePortfolioPrices(USER, holdings);

    const reloaded = applyCachedPrices(USER, holdings);
    expect(reloaded[0]?.currentPairPrice).toBe(95_000);
    expect(reloaded[1]?.currentPairPrice).toBe(150);
  });

  it("does not erase applied crypto prices on a later failed refresh", async () => {
    writePriceCache(USER, [
      {
        symbol: "BTC",
        assetType: "crypto",
        normalizedPair: "BTC/USD",
        pairPrice: 95_000,
        priceEur: 87_500,
        currentPrice: 87_500,
        change24hPercent: 1.2,
        providerSymbol: "BTC-USD.CC",
        conversionApplied: true,
        conversionPath: "USD->EUR",
        updatedAt: "2026-07-25T18:00:00.000Z",
      },
    ]);

    const priced = applyCachedPrices(USER, [migratedBtcUsd()]);
    expect(priced[0]?.currentPairPrice).toBe(95_000);

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          canAffordRefresh: true,
          refreshSummary: { providerCallsRequired: 1, totalCallsRequired: 1 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [],
          requested: 1,
          received: 0,
        }),
      } as Response);

    const result = await refreshLivePortfolioPrices(USER, priced);
    expect(result.updatedCount).toBe(0);
    expect(result.holdings[0]?.currentPairPrice).toBe(95_000);
    expect(result.holdings[0]?.currentPrice).toBe(87_500);
  });
});
