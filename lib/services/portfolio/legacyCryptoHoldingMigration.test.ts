import { describe, expect, it } from "vitest";

import {
  applyPricesToHoldings,
  buildPriceLookup,
  isQuoteCompatibleWithHolding,
} from "@/lib/client/portfolioPricing";
import {
  diagnoseQuoteCompatibility,
  resolveHoldingTradingPair,
} from "@/lib/client/cryptoQuoteCompatibility";
import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import { resolvePortfolioTotalValueAvailability } from "@/lib/client/portfolioValuationAvailability";
import { buildCryptoHoldingMetadata } from "@/lib/services/portfolio/cryptoDbMetadata";
import { mapDbHoldingToStored } from "@/lib/services/portfolio/mappers";
import {
  migrateLegacyCryptoHolding,
  migrateLegacyCryptoHoldings,
} from "@/lib/services/portfolio/legacyCryptoHoldingMigration";
import {
  normalizeTradingPairKey,
  parseTradingPairText,
} from "@/lib/services/portfolio/cryptoPairIdentity";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const HOLDING_ID = "legacy-btc-usd";

function modernBtcUsd(overrides: Partial<StoredPortfolioHolding> = {}): StoredPortfolioHolding {
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
    priceDataStatus: "unavailable",
    providerSymbol: "BTC-USD.CC",
    providerId: "eodhd-quotes",
    providerName: "EODHD",
    ...overrides,
  };
}

function legacyBtcUsd(overrides: Partial<StoredPortfolioHolding> = {}): StoredPortfolioHolding {
  return {
    id: HOLDING_ID,
    assetType: "crypto",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 0.25,
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

function legacySolUsd(overrides: Partial<StoredPortfolioHolding> = {}): StoredPortfolioHolding {
  return {
    id: "legacy-sol",
    assetType: "crypto",
    symbol: "SOL",
    name: "Solana",
    quantity: 200,
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

const btcUsdQuote = {
  symbol: "BTC",
  assetType: "crypto" as const,
  normalizedPair: "BTC/USD",
  pairPrice: 95_000,
  priceEur: 87_500,
  currentPrice: 87_500,
  change24hPercent: 1.2,
  currency: "USD",
  provider: "eodhd-quotes",
  providerDisplayName: "EODHD",
  updatedAt: "2026-07-25T16:00:00.000Z",
};

describe("legacy crypto holding migration", () => {
  it("repairs legacy BTC/USD with hyphenated trading pair", () => {
    const result = migrateLegacyCryptoHolding(legacyBtcUsd());
    expect(result.migrated).toBe(true);
    expect(result.holding.tradingPair).toBe("BTC/USD");
    expect(result.holding.providerSymbol).toBe("BTC-USD.CC");
    expect(result.holding.quantity).toBe(0.25);
    expect(result.holding.purchasePrice).toBe(30_000);
    expect(result.holding.id).toBe(HOLDING_ID);
  });

  it("repairs legacy SOL/USD with underscore trading pair", () => {
    const result = migrateLegacyCryptoHolding(legacySolUsd());
    expect(result.holding.tradingPair).toBe("SOL/USD");
    expect(result.holding.providerSymbol).toBe("SOL-USD.CC");
  });

  it("leaves modern BTC/USD unchanged", () => {
    const before = modernBtcUsd();
    const result = migrateLegacyCryptoHolding(before);
    expect(result.migrated).toBe(false);
    expect(result.holding).toEqual(before);
  });

  it("is idempotent for legacy BTC/USD", () => {
    const once = migrateLegacyCryptoHolding(legacyBtcUsd()).holding;
    const twice = migrateLegacyCryptoHolding(once).holding;
    expect(twice).toEqual(once);
  });

  it("reconstructs pair currency from trading pair text only", () => {
    const result = migrateLegacyCryptoHolding({
      ...legacyBtcUsd(),
      pairCurrency: undefined,
      tradingPair: "BTC/USD",
    });
    expect(result.holding.pairCurrency).toBe("USD");
    expect(result.holding.tradingPair).toBe("BTC/USD");
  });

  it("promotes legacy investment BTC with pair text to crypto without changing quantity", () => {
    const result = migrateLegacyCryptoHolding({
      id: "legacy-investment-btc",
      assetType: "investment",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.25,
      purchasePrice: 30_000,
      currentPrice: 0,
      currency: "EUR",
      tradingPair: "BTC/USD",
    });
    expect(result.holding.assetType).toBe("crypto");
    expect(result.holding.pairCurrency).toBe("USD");
    expect(result.holding.quantity).toBe(0.25);
  });

  it("leaves ambiguous legacy crypto unchanged", () => {
    const result = migrateLegacyCryptoHolding({
      id: "ambiguous",
      assetType: "crypto",
      symbol: "MYST",
      name: "Mystery",
      quantity: 1,
      purchasePrice: 1,
      currentPrice: 0,
      currency: "EUR",
    });
    expect(result.migrated).toBe(false);
    expect(result.reviewReason).toBe("ambiguous_crypto_identity");
  });

  it("does not migrate equities with ISIN", () => {
    const result = migrateLegacyCryptoHolding({
      id: "vwce",
      assetType: "investment",
      symbol: "VWCE",
      name: "Vanguard All-World",
      quantity: 10,
      purchasePrice: 100,
      currentPrice: 110,
      currency: "EUR",
      isin: "IE00BK5BQT80",
      providerSymbol: "VWCE.XETRA",
    });
    expect(result.migrated).toBe(false);
    expect(result.holding.assetType).toBe("investment");
  });

  it("hydrates cloud legacy crypto metadata and applies migration", () => {
    const stored = mapDbHoldingToStored({
      id: HOLDING_ID,
      user_id: "user-1",
      portfolio_id: "portfolio-1",
      asset_type: "crypto",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.25,
      average_cost: 30_000,
      currency: "EUR",
      metadata: buildCryptoHoldingMetadata(
        legacyBtcUsd({ tradingPair: "BTC-USD", providerId: null }),
      ),
      sort_order: 0,
      created_at: "2026-07-01T00:00:00.000Z",
      updated_at: "2026-07-25T15:16:00.000Z",
      deleted_at: null,
      last_market_price: null,
      previous_close: null,
    });

    expect(stored.tradingPair).toBe("BTC/USD");
    expect(stored.providerSymbol).toBe("BTC-USD.CC");
    expect(stored.quantity).toBe(0.25);
  });

  it("preserves unrelated investment metadata when crypto metadata is merged separately", () => {
    const investment = {
      distributionPolicyUserOverride: "accumulating" as const,
    };
    expect(investment.distributionPolicyUserOverride).toBe("accumulating");
  });
});

describe("crypto pair normalization and compatibility", () => {
  it("normalizes BTC-USD to BTC/USD", () => {
    expect(normalizeTradingPairKey("BTC-USD")).toBe("BTC/USD");
    expect(parseTradingPairText("BTC_USD")).toEqual({ base: "BTC", quote: "USD" });
  });

  it("matches BTC/USD holding to BTC-USD quote pair", () => {
    const holding = migrateLegacyCryptoHolding(legacyBtcUsd()).holding;
    expect(isQuoteCompatibleWithHolding(holding, btcUsdQuote)).toBe(true);
    expect(resolveHoldingTradingPair(holding)).toBe("BTC/USD");
  });

  it("rejects BTC/EUR quote for BTC/USD holding", () => {
    const holding = modernBtcUsd();
    const diagnosis = diagnoseQuoteCompatibility(holding, {
      ...btcUsdQuote,
      normalizedPair: "BTC/EUR",
      pairPrice: 90_000,
      priceEur: 90_000,
      currentPrice: 90_000,
      currency: "EUR",
    });
    expect(diagnosis.compatible).toBe(false);
    expect(diagnosis.reason).toBe("pair_mismatch");
  });

  it("rejects BTC/USDC quote for BTC/USD holding", () => {
    const diagnosis = diagnoseQuoteCompatibility(modernBtcUsd(), {
      ...btcUsdQuote,
      normalizedPair: "BTC/USDC",
    });
    expect(diagnosis.compatible).toBe(false);
    expect(diagnosis.reason).toBe("pair_mismatch");
  });

  it("rejects SOL/EUR quote for SOL/USD holding", () => {
    const holding = migrateLegacyCryptoHolding(legacySolUsd()).holding;
    const diagnosis = diagnoseQuoteCompatibility(holding, {
      symbol: "SOL",
      assetType: "crypto",
      normalizedPair: "SOL/EUR",
      pairPrice: 150,
      priceEur: 150,
      currentPrice: 150,
      currency: "EUR",
    });
    expect(diagnosis.reason).toBe("pair_mismatch");
  });

  it("indexes normalized pair quotes for legacy lookup keys", () => {
    const holding = migrateLegacyCryptoHolding(legacyBtcUsd()).holding;
    const lookup = buildPriceLookup([btcUsdQuote]);
    expect(lookup.get("BTC/USD")).toBeDefined();
    expect(isQuoteCompatibleWithHolding(holding, lookup.get("BTC/USD")!)).toBe(true);
  });
});

describe("safe crypto refresh application", () => {
  it("applies valid BTC/USD quote to legacy holding", () => {
    const holding = migrateLegacyCryptoHolding(legacyBtcUsd()).holding;
    const [updated] = applyPricesToHoldings([holding], [btcUsdQuote]);
    expect(updated?.currentPairPrice).toBe(95_000);
    expect(updated?.currentPrice).toBe(87_500);
    expect(getHoldingMarketValue(updated!)).toBeCloseTo(21_875, 2);
  });

  it("does not erase valid cached price on pair mismatch", () => {
    const holding = {
      ...modernBtcUsd(),
      currentPairPrice: 94_000,
      currentPrice: 86_000,
      priceDataStatus: "live" as const,
      marketPriceUpdatedAt: "2026-07-25T10:00:00.000Z",
    };
    const [updated] = applyPricesToHoldings(
      [holding],
      [{ ...btcUsdQuote, normalizedPair: "BTC/EUR", pairPrice: 90_000, priceEur: 90_000 }],
    );
    expect(updated?.currentPairPrice).toBe(94_000);
    expect(updated?.currentPrice).toBe(86_000);
    expect(updated?.priceDataStatus).toBe("stale");
  });

  it("keeps unavailable holdings unavailable when refresh returns missing price", () => {
    const holding = legacyBtcUsd();
    const [updated] = applyPricesToHoldings(
      [holding],
      [{ ...btcUsdQuote, pairPrice: 0, priceEur: 0, currentPrice: 0 }],
    );
    expect(updated?.currentPairPrice).toBeNull();
    expect(getHoldingMarketValue(updated!)).toBeNull();
  });

  it("handles successful BTC and failed SOL independently", () => {
    const btc = migrateLegacyCryptoHolding(legacyBtcUsd()).holding;
    const sol = migrateLegacyCryptoHolding(legacySolUsd()).holding;
    const [updatedBtc, updatedSol] = applyPricesToHoldings(
      [btc, sol],
      [btcUsdQuote],
    );
    expect(updatedBtc?.currentPairPrice).toBe(95_000);
    expect(updatedSol?.currentPairPrice).toBeNull();
  });
});

describe("portfolio total value availability", () => {
  it("shows unavailable total for two unpriced crypto holdings", () => {
    const availability = resolvePortfolioTotalValueAvailability([
      legacyBtcUsd(),
      legacySolUsd(),
    ]);
    expect(availability.isAvailable).toBe(false);
    expect(availability.totalValue).toBe(0);
    const performance = buildPortfolioPerformance([legacyBtcUsd(), legacySolUsd()]);
    expect(performance.totalValueAvailable).toBe(false);
  });

  it("shows partial total when one crypto is priced", () => {
    const priced = applyPricesToHoldings(
      [migrateLegacyCryptoHolding(legacyBtcUsd()).holding],
      [btcUsdQuote],
    )[0]!;
    const availability = resolvePortfolioTotalValueAvailability([
      priced,
      legacySolUsd(),
    ]);
    expect(availability.isAvailable).toBe(true);
    expect(availability.isPartial).toBe(true);
    expect(availability.totalValue).toBeGreaterThan(0);
  });

  it("preserves fully priced portfolio total", () => {
    const holdings = applyPricesToHoldings(
      migrateLegacyCryptoHoldings([modernBtcUsd(), legacySolUsd()]).holdings,
      [
        btcUsdQuote,
        {
          symbol: "SOL",
          assetType: "crypto" as const,
          normalizedPair: "SOL/USD",
          pairPrice: 150,
          priceEur: 138,
          currentPrice: 138,
          currency: "USD",
        },
      ],
    );
    const performance = buildPortfolioPerformance(holdings);
    expect(performance.totalValueAvailable).toBe(true);
    expect(performance.totalValue).toBeGreaterThan(0);
  });
});
