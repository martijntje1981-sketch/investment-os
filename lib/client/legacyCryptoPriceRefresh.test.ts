import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildCryptoQuoteApplicationDiagnostic } from "@/lib/client/cryptoQuoteDiagnostics";
import {
  readLastLivePriceRefreshAt,
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import {
  applyPricesToHoldings,
  buildPriceLookup,
  buildPriceRequestPayload,
  countAppliedPriceUpdates,
  isQuoteCompatibleWithHolding,
  prepareHoldingsForPricing,
} from "@/lib/client/portfolioPricing";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import { buildCryptoHoldingMetadata } from "@/lib/services/portfolio/cryptoDbMetadata";
import { mapDbHoldingToStored } from "@/lib/services/portfolio/mappers";
import { migrateLegacyCryptoHolding } from "@/lib/services/portfolio/legacyCryptoHoldingMigration";
import { lastLivePriceRefreshKey } from "@/lib/client/portfolioStorageKeys";

const USER = "user-legacy-crypto-refresh";

function legacyBtcUsd(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "legacy-btc",
    assetType: "crypto",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.42,
    purchasePrice: 30_000,
    currentPrice: 0,
    currentPairPrice: null,
    pairCurrency: "USD",
    tradingPair: "BTC-USD",
    providerName: "EODHD",
    priceUpdatedAt: "2026-07-25T15:16:00.000Z",
    pricingStatus: "needs_review",
    ...overrides,
  };
}

function legacySolUsd(
  overrides: Partial<StoredPortfolioHolding> = {},
): StoredPortfolioHolding {
  return {
    id: "legacy-sol",
    assetType: "crypto",
    symbol: "SOL",
    name: "Solana",
    quantity: 150,
    purchasePrice: 80,
    currentPrice: 0,
    currentPairPrice: null,
    pairCurrency: "USD",
    tradingPair: "SOL_USD",
    providerName: "EODHD",
    pricingStatus: "needs_review",
    ...overrides,
  };
}

function modernBtcUsd(): StoredPortfolioHolding {
  return {
    id: "modern-btc",
    assetType: "crypto",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.25,
    purchasePrice: 30_000,
    currentPrice: 0,
    currentPairPrice: null,
    pairCurrency: "USD",
    tradingPair: "BTC/USD",
    portfolioCurrency: "EUR",
    currency: "EUR",
    pricingStatus: "price_unavailable",
    providerSymbol: "BTC-USD.CC",
    providerId: "eodhd-quotes",
    providerName: "EODHD",
  };
}

const btcUsdQuote = {
  symbol: "BTC",
  assetType: "crypto" as const,
  normalizedPair: "BTC/USD",
  pairPrice: 95_000,
  priceEur: 87_500,
  currentPrice: 87_500,
  change24hPercent: 1.2,
  currency: "USD",
  providerSymbol: "BTC-USD.CC",
  provider: "eodhd-quotes",
  providerDisplayName: "EODHD",
  updatedAt: "2026-07-25T18:00:00.000Z",
};

const solUsdQuote = {
  symbol: "SOL",
  assetType: "crypto" as const,
  normalizedPair: "SOL/USD",
  pairPrice: 150,
  priceEur: 138,
  currentPrice: 138,
  change24hPercent: -0.8,
  currency: "USD",
  providerSymbol: "SOL-USD.CC",
  provider: "eodhd-quotes",
  providerDisplayName: "EODHD",
  updatedAt: "2026-07-25T18:00:00.000Z",
};

function testAccountHoldings(): StoredPortfolioHolding[] {
  return [legacyBtcUsd(), legacySolUsd()];
}

function estimateSuccessPayload() {
  return {
    success: true,
    canAffordRefresh: true,
    refreshSummary: {
      providerCallsRequired: 2,
      fxCallsRequired: 0,
      totalCallsRequired: 2,
    },
    eodhdBudget: {
      spendableRemaining: 10,
    },
  };
}

function mockEstimateThenRefresh(refreshPayload: Record<string, unknown>): void {
  vi.mocked(fetch)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => estimateSuccessPayload(),
    } as Response)
    .mockResolvedValueOnce({
      ok: true,
      json: async () => refreshPayload,
    } as Response);
}

describe("legacy crypto price refresh pipeline", () => {
  beforeEach(() => {
    localStorage.clear();
    resetLivePriceRefreshStateForTests();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => estimateSuccessPayload(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requests BTC-USD.CC and SOL-USD.CC for legacy migrated holdings", () => {
    const prepared = prepareHoldingsForPricing(testAccountHoldings());
    const payload = buildPriceRequestPayload(prepared);

    expect(payload).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          symbol: "BTC",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "BTC-USD.CC",
        }),
        expect.objectContaining({
          symbol: "SOL",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "SOL-USD.CC",
        }),
      ]),
    );

    const { targets } = resolveQuotePriceTargets(payload);
    expect(targets.map((target) => target.providerSymbol)).toEqual(
      expect.arrayContaining(["BTC-USD.CC", "SOL-USD.CC"]),
    );
  });

  it("uses canonical USD pair in refresh requests when tradingPair and pairCurrency disagree", () => {
    const payload = buildPriceRequestPayload([
      {
        ...legacyBtcUsd(),
        tradingPair: "BTC/USD",
        pairCurrency: "EUR",
      },
    ]);

    expect(payload[0]?.pairCurrency).toBe("USD");
    const { targets } = resolveQuotePriceTargets(payload);
    expect(targets[0]?.providerSymbol).toBe("BTC-USD.CC");
  });

  it("applies BTC/USD and SOL/USD quotes to the test-account fixture", () => {
    const prepared = prepareHoldingsForPricing(testAccountHoldings());
    const updated = applyPricesToHoldings(prepared, [btcUsdQuote, solUsdQuote]);

    expect(updated[0]?.currentPairPrice).toBe(95_000);
    expect(updated[0]?.currentPrice).toBe(87_500);
    expect(updated[1]?.currentPairPrice).toBe(150);
    expect(updated[1]?.currentPrice).toBe(138);
    expect(updated[0]?.quantity).toBe(0.42);
    expect(updated[1]?.quantity).toBe(150);
  });

  it("keeps modern BTC/USD on the same refresh path", () => {
    const payload = buildPriceRequestPayload([modernBtcUsd()]);
    expect(payload[0]?.pairCurrency).toBe("USD");
    const [updated] = applyPricesToHoldings([modernBtcUsd()], [btcUsdQuote]);
    expect(updated?.currentPairPrice).toBe(95_000);
  });

  it("rejects BTC/EUR, BTC/USDC, and BTC/USDT quotes for BTC/USD", () => {
    const holding = prepareHoldingsForPricing([legacyBtcUsd()])[0]!;
    expect(
      isQuoteCompatibleWithHolding(holding, {
        ...btcUsdQuote,
        normalizedPair: "BTC/EUR",
        pairPrice: 90_000,
        priceEur: 90_000,
        currentPrice: 90_000,
      }),
    ).toBe(false);
    expect(
      isQuoteCompatibleWithHolding(holding, {
        ...btcUsdQuote,
        normalizedPair: "BTC/USDC",
      }),
    ).toBe(false);
    expect(
      isQuoteCompatibleWithHolding(holding, {
        ...btcUsdQuote,
        normalizedPair: "BTC/USDT",
      }),
    ).toBe(false);
  });

  it("preserves pair price and 24h change through lookup normalization", () => {
    const lookup = buildPriceLookup([btcUsdQuote]);
    const quote = lookup.get("BTC/USD");
    expect(quote?.pairPrice).toBe(95_000);
    expect(quote?.change24hPercent).toBe(1.2);
  });

  it("does not fabricate EUR when conversion is missing", () => {
    const holding = prepareHoldingsForPricing([legacyBtcUsd()])[0]!;
    const diagnostic = buildCryptoQuoteApplicationDiagnostic(holding, {
      ...btcUsdQuote,
      priceEur: 0,
      currentPrice: 0,
    });
    expect(diagnostic.result).toBe("rejected");
    expect(diagnostic.hasPairPrice).toBe(true);
    expect(diagnostic.hasConversion).toBe(false);

    const [updated] = applyPricesToHoldings([holding], [
      { ...btcUsdQuote, priceEur: 0, currentPrice: 0 },
    ]);
    expect(updated?.currentPrice).toBe(0);
    expect(updated?.currentPairPrice).toBeNull();
  });

  it("does not erase an existing valid price on failed refresh", () => {
    const holding = {
      ...modernBtcUsd(),
      currentPairPrice: 94_000,
      currentPrice: 86_000,
      priceDataStatus: "live" as const,
    };
    const [updated] = applyPricesToHoldings(
      [holding],
      [{ ...btcUsdQuote, normalizedPair: "BTC/EUR", pairPrice: 90_000, priceEur: 90_000 }],
    );
    expect(updated?.currentPairPrice).toBe(94_000);
    expect(updated?.currentPrice).toBe(86_000);
  });

  it("does not record a successful refresh timestamp when zero quotes apply", async () => {
    localStorage.setItem(
      lastLivePriceRefreshKey(USER),
      "2026-07-25T10:00:00.000Z",
    );

    mockEstimateThenRefresh({
      success: true,
      prices: [
        {
          ...btcUsdQuote,
          normalizedPair: "BTC/EUR",
          pairPrice: 90_000,
          priceEur: 90_000,
          currentPrice: 90_000,
          currency: "EUR",
        },
      ],
      requested: 2,
      received: 1,
      refreshSummary: { providerCallsMade: 1 },
    });

    const result = await refreshLivePortfolioPrices(
      USER,
      testAccountHoldings(),
    );

    expect(result.updated).toBe(false);
    expect(result.updatedCount).toBe(0);
    expect(result.message).toBe("No live prices were updated.");
    expect(readLastLivePriceRefreshAt(USER)).toBe("2026-07-25T10:00:00.000Z");
  });

  it("records a successful refresh timestamp when at least one quote applies", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-25T20:41:00.000Z"));

    mockEstimateThenRefresh({
      success: true,
      prices: [btcUsdQuote, solUsdQuote],
      requested: 2,
      received: 2,
      refreshSummary: { providerCallsMade: 2 },
    });

    const result = await refreshLivePortfolioPrices(
      USER,
      testAccountHoldings(),
    );

    expect(result.updated).toBe(true);
    expect(result.updatedCount).toBe(2);
    expect(readLastLivePriceRefreshAt(USER)).toBe("2026-07-25T20:41:00.000Z");

    vi.useRealTimers();
  });

  it("reports partial refresh coverage honestly", async () => {
    mockEstimateThenRefresh({
      success: true,
      prices: [btcUsdQuote],
      requested: 2,
      received: 1,
      refreshSummary: { providerCallsMade: 1 },
    });

    const result = await refreshLivePortfolioPrices(
      USER,
      testAccountHoldings(),
    );

    expect(result.updated).toBe(true);
    expect(result.updatedCount).toBe(1);
    expect(result.message).toBe(
      "Updated 1 of 2 holdings. Last known prices are shown for the remainder.",
    );
    expect(result.holdings[0]?.currentPairPrice).toBe(95_000);
    expect(result.holdings[1]?.currentPairPrice).toBeNull();
  });

  it("keeps successful local prices when stale cloud hydration follows refresh", () => {
    const prepared = prepareHoldingsForPricing(testAccountHoldings());
    const priced = applyPricesToHoldings(prepared, [btcUsdQuote, solUsdQuote]);

    const cloudHydrated = mapDbHoldingToStored({
      id: "legacy-btc",
      user_id: "user-1",
      portfolio_id: "portfolio-1",
      asset_type: "crypto",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.42,
      average_cost: 30_000,
      currency: "EUR",
      metadata: buildCryptoHoldingMetadata(
        legacyBtcUsd({ tradingPair: "BTC/USD", pairCurrency: "USD" }),
      ),
      sort_order: 0,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-25T15:16:00.000Z",
      deleted_at: null,
      last_market_price: null,
      previous_close: null,
    });

    const merged = applyPricesToHoldings(
      [
        {
          ...cloudHydrated,
          currentPrice: 0,
          currentPairPrice: null,
        },
        priced[1]!,
      ],
      [btcUsdQuote, solUsdQuote],
    );

    expect(merged[0]?.currentPairPrice).toBe(95_000);
    expect(merged[1]?.currentPairPrice).toBe(150);
  });

  it("remains idempotent and preserves investment metadata separately", () => {
    const once = migrateLegacyCryptoHolding(legacyBtcUsd()).holding;
    const twice = migrateLegacyCryptoHolding(once).holding;
    expect(twice).toEqual(once);

    const investment = {
      distributionPolicyUserOverride: "accumulating" as const,
    };
    expect(investment.distributionPolicyUserOverride).toBe("accumulating");
  });

  it("counts applied updates only when a usable quote lands on the holding", () => {
    const prepared = prepareHoldingsForPricing(testAccountHoldings());
    const updated = applyPricesToHoldings(prepared, [btcUsdQuote]);
    expect(countAppliedPriceUpdates(prepared, updated)).toBe(1);
  });
});
