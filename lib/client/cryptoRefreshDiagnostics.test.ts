import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  buildCryptoRefreshDiagnosticCopyText,
  buildCryptoRefreshDiagnostics,
  formatCryptoRefreshDiagnosticSummary,
  isCryptoRefreshDiagnosticCopySafe,
  shouldShowCryptoRefreshDiagnostics,
} from "@/lib/client/cryptoRefreshDiagnostics";
import {
  readLastLivePriceRefreshAt,
  refreshLivePortfolioPrices,
  resetLivePriceRefreshStateForTests,
} from "@/lib/client/livePortfolioPriceRefresh";
import { lastLivePriceRefreshKey } from "@/lib/client/portfolioStorageKeys";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "user-crypto-diagnostics";

function legacyBtcUsd(): StoredPortfolioHolding {
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
    tradingPair: "BTC/USD",
    providerSymbol: "BTC-USD.CC",
    providerName: "EODHD",
    priceUpdatedAt: "2026-07-25T15:16:00.000Z",
    marketPriceUpdatedAt: "2026-07-25T15:16:00.000Z",
    pricingStatus: "price_unavailable",
  };
}

function legacySolUsd(): StoredPortfolioHolding {
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
    tradingPair: "SOL/USD",
    providerSymbol: "SOL-USD.CC",
    providerName: "EODHD",
    pricingStatus: "price_unavailable",
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
  updatedAt: "2026-07-25T18:00:00.000Z",
};

describe("crypto refresh diagnostics", () => {
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

  it("reports pair mismatch when a wrong-pair quote is returned", () => {
    const prepared = [legacyBtcUsd()];
    const diagnostics = buildCryptoRefreshDiagnostics({
      preparedHoldings: prepared,
      requestPayload: [
        {
          symbol: "BTC",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "BTC-USD.CC",
        },
      ],
      apiResponse: {
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
        cryptoRefreshDiagnostics: [
          {
            assetType: "crypto",
            canonicalPair: "BTC/USD",
            pairCurrency: "USD",
            providerSymbol: "BTC-USD.CC",
            requestSymbol: "BTC",
            requestPairCurrency: "USD",
            requestStatus: "request_valid",
            quoteStatus: "quote_received",
            quoteReceived: true,
            quoteSymbol: "BTC",
            quoteAssetType: "crypto",
            quoteNormalizedPair: "BTC/EUR",
            pairPricePresent: true,
            pairPriceValid: true,
            portfolioPricePresent: true,
            portfolioPriceValid: true,
            conversionRequired: true,
            conversionPresent: true,
            change24hPresent: true,
            cacheStatus: "fresh",
          },
        ],
      },
      beforeHoldings: prepared,
      afterHoldings: prepared,
    });

    expect(diagnostics[0]?.compatibilityResult).toBe("pair_mismatch");
    expect(diagnostics[0]?.applicationResult).toBe("rejected");
  });

  it("reports missing conversion when pair price exists without EUR portfolio price", () => {
    const prepared = [legacyBtcUsd()];
    const diagnostics = buildCryptoRefreshDiagnostics({
      preparedHoldings: prepared,
      requestPayload: [
        {
          symbol: "BTC",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "BTC-USD.CC",
        },
      ],
      apiResponse: {
        success: true,
        prices: [{ ...btcUsdQuote, priceEur: 0, currentPrice: 0 }],
        cryptoRefreshDiagnostics: [
          {
            assetType: "crypto",
            canonicalPair: "BTC/USD",
            pairCurrency: "USD",
            providerSymbol: "BTC-USD.CC",
            requestSymbol: "BTC",
            requestPairCurrency: "USD",
            requestStatus: "request_valid",
            quoteStatus: "malformed_quote",
            quoteReceived: false,
            quoteSymbol: "BTC",
            quoteAssetType: "crypto",
            quoteNormalizedPair: "BTC/USD",
            pairPricePresent: true,
            pairPriceValid: true,
            portfolioPricePresent: false,
            portfolioPriceValid: false,
            conversionRequired: true,
            conversionPresent: false,
            change24hPresent: true,
            cacheStatus: "fresh",
          },
        ],
      },
      beforeHoldings: prepared,
      afterHoldings: prepared,
    });

    expect(diagnostics[0]?.compatibilityResult).toBe("invalid_price");
    expect(diagnostics[0]?.applicationResult).toBe("missing_conversion");
  });

  it("reports successful application for a valid quote", () => {
    const before = [legacyBtcUsd()];
    const after = [
      {
        ...legacyBtcUsd(),
        currentPairPrice: 95_000,
        currentPrice: 87_500,
        marketPriceUpdatedAt: "2026-07-25T18:00:00.000Z",
        priceDataStatus: "live" as const,
      },
    ];
    const diagnostics = buildCryptoRefreshDiagnostics({
      preparedHoldings: before,
      requestPayload: [
        {
          symbol: "BTC",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "BTC-USD.CC",
        },
      ],
      apiResponse: {
        success: true,
        prices: [btcUsdQuote],
      },
      beforeHoldings: before,
      afterHoldings: after,
    });

    expect(diagnostics[0]?.compatibilityResult).toBe("compatible");
    expect(diagnostics[0]?.applicationResult).toBe("applied");
  });

  it("shows diagnostics only after zero applied quotes with the expected message", () => {
    const diagnostics = buildCryptoRefreshDiagnostics({
      preparedHoldings: [legacyBtcUsd()],
      requestPayload: [
        {
          symbol: "BTC",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "BTC-USD.CC",
        },
      ],
      apiResponse: { success: true, prices: [] },
      beforeHoldings: [legacyBtcUsd()],
      afterHoldings: [legacyBtcUsd()],
    });

    expect(
      shouldShowCryptoRefreshDiagnostics({
        updatedCount: 0,
        diagnostics,
        message: "No prices were updated.",
      }),
    ).toBe(true);
    expect(
      shouldShowCryptoRefreshDiagnostics({
        updatedCount: 1,
        diagnostics,
        message: "Live prices updated for 1 holdings.",
      }),
    ).toBe(false);
    expect(
      shouldShowCryptoRefreshDiagnostics({
        updatedCount: 1,
        diagnostics,
        message: "Updated 1 of 2 holdings. Last known prices are shown for the remainder.",
      }),
    ).toBe(false);
  });

  it("copy summary contains only allowlisted fields and no personal data", () => {
    const diagnostics = buildCryptoRefreshDiagnostics({
      preparedHoldings: [legacyBtcUsd(), legacySolUsd()],
      requestPayload: [
        {
          symbol: "BTC",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "BTC-USD.CC",
        },
        {
          symbol: "SOL",
          assetType: "crypto",
          pairCurrency: "USD",
          providerSymbol: "SOL-USD.CC",
        },
      ],
      apiResponse: { success: true, prices: [] },
      beforeHoldings: [legacyBtcUsd(), legacySolUsd()],
      afterHoldings: [legacyBtcUsd(), legacySolUsd()],
    });

    const copyText = buildCryptoRefreshDiagnosticCopyText(diagnostics);
    expect(isCryptoRefreshDiagnosticCopySafe(copyText)).toBe(true);
    expect(copyText).not.toMatch(/legacy-btc|legacy-sol|0\.42|150|30_000/i);
    expect(copyText).toContain("requestStatus");
    expect(copyText).toContain("quoteStatus");
    expect(formatCryptoRefreshDiagnosticSummary(diagnostics)).toContain("BTC/USD");
  });

  it("uses wrapping-friendly line output without fixed-width columns", () => {
    const line = formatCryptoRefreshDiagnosticSummary([
      buildCryptoRefreshDiagnostics({
        preparedHoldings: [legacyBtcUsd()],
        requestPayload: [
          {
            symbol: "BTC",
            assetType: "crypto",
            pairCurrency: "USD",
            providerSymbol: "BTC-USD.CC",
          },
        ],
        apiResponse: { success: true, prices: [] },
        beforeHoldings: [legacyBtcUsd()],
        afterHoldings: [legacyBtcUsd()],
      })[0]!,
    ]);

    expect(line).not.toMatch(/\t/);
    expect(line.split("\n").every((row) => row.length < 120)).toBe(true);
  });

  it("preserves global and holding timestamps after zero-update refresh", async () => {
    localStorage.setItem(
      lastLivePriceRefreshKey(USER),
      "2026-07-25T21:06:00.000Z",
    );

    const holdings = [legacyBtcUsd(), legacySolUsd()];

    vi.mocked(fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          canAffordRefresh: true,
          refreshSummary: { totalCallsRequired: 2, providerCallsRequired: 2 },
          eodhdBudget: { spendableRemaining: 10 },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          prices: [],
          requested: 2,
          received: 0,
          cryptoRefreshDiagnostics: [
            {
              assetType: "crypto",
              canonicalPair: "BTC/USD",
              pairCurrency: "USD",
              providerSymbol: "BTC-USD.CC",
              requestSymbol: "BTC",
              requestPairCurrency: "USD",
              requestStatus: "request_valid",
              quoteStatus: "quote_missing",
              quoteReceived: false,
              quoteSymbol: null,
              quoteAssetType: null,
              quoteNormalizedPair: null,
              pairPricePresent: false,
              pairPriceValid: false,
              portfolioPricePresent: false,
              portfolioPriceValid: false,
              conversionRequired: true,
              conversionPresent: false,
              change24hPresent: false,
              cacheStatus: "unknown",
            },
          ],
        }),
      } as Response);

    const result = await refreshLivePortfolioPrices(USER, holdings);

    expect(result.message).toBe("No prices were updated.");
    expect(result.showCryptoRefreshDiagnostics).toBe(true);
    expect(readLastLivePriceRefreshAt(USER)).toBe("2026-07-25T21:06:00.000Z");
    expect(result.holdings[0]?.priceUpdatedAt).toBe("2026-07-25T15:16:00.000Z");
    expect(result.holdings[0]?.marketPriceUpdatedAt).toBe(
      "2026-07-25T15:16:00.000Z",
    );
  });
});
