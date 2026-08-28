import { describe, expect, it } from "vitest";

import { buildDashboardSummary } from "@/lib/client/dashboardSummary";
import { buildLookingAhead } from "@/lib/services/lookingAhead/buildLookingAhead";
import {
  HERO_COVERAGE_CHECKING_LABEL,
  presentDashboardValuationCoverageMessage,
  resolvePortfolioValuationCoverage,
} from "@/lib/client/portfolioValuationCoverage";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function cryptoHolding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const symbol = overrides.symbol;
  const pairCurrency = overrides.pairCurrency ?? "USD";
  return {
    id: overrides.id ?? `${symbol}-id`,
    assetType: "crypto",
    symbol,
    name: overrides.name ?? symbol,
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 0,
    currentPairPrice: overrides.currentPairPrice ?? null,
    pairCurrency,
    tradingPair: overrides.tradingPair ?? `${symbol}/${pairCurrency}`,
    providerSymbol: overrides.providerSymbol ?? `${symbol}-${pairCurrency}.CC`,
    currency: "EUR",
    portfolioCurrency: "EUR",
    priceDataStatus: overrides.priceDataStatus ?? "unavailable",
    pricingStatus: overrides.pricingStatus ?? "price_unavailable",
  };
}

function equityHolding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    assetType: "investment",
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 110,
    currency: "EUR",
    providerSymbol: overrides.providerSymbol ?? `${overrides.symbol}.XETRA`,
    priceDataStatus: overrides.priceDataStatus ?? "live",
  };
}

describe("portfolioValuationCoverage", () => {
  it("marks one priced + two unavailable holdings incomplete and blocks 100% concentration", () => {
    const holdings = [
      cryptoHolding({
        symbol: "BTC",
        currentPrice: 90_000,
        currentPairPrice: 98_000,
        priceDataStatus: "live",
      }),
      cryptoHolding({ symbol: "ETH", currentPrice: 0, currentPairPrice: null }),
      cryptoHolding({ symbol: "XRP", currentPrice: 0, currentPairPrice: null }),
    ];

    const coverage = resolvePortfolioValuationCoverage(holdings);
    expect(coverage.status).toBe("incomplete");
    expect(coverage.pricedHoldingCount).toBe(1);
    expect(coverage.materialHoldingCount).toBe(3);
    expect(coverage.allowsValuationConclusions).toBe(false);
    expect(coverage.coverageMessage).toBe(
      "Portfolio coverage incomplete — 1 of 3 holdings currently priced.",
    );

    const summary = buildDashboardSummary(holdings, null, false);
    expect(summary.concentrationWeightPercent).toBeNull();
    expect(summary.concentrationSymbol).toBeNull();
    expect(summary.portfolioValueCoverageMessage).toBe(coverage.coverageMessage);

    const ahead = buildLookingAhead({ holdings });
    expect(ahead.primaryKind).not.toBe("concentration");
    expect(ahead.headline).not.toMatch(/100%/);
  });

  it("preserves concentration conclusions when coverage is complete", () => {
    const holdings = [
      equityHolding({ symbol: "AAA", quantity: 8, currentPrice: 100 }),
      equityHolding({ symbol: "BBB", quantity: 2, currentPrice: 100 }),
    ];

    const coverage = resolvePortfolioValuationCoverage(holdings);
    expect(coverage.status).toBe("complete");
    expect(coverage.allowsValuationConclusions).toBe(true);

    const summary = buildDashboardSummary(holdings, null, false);
    expect(summary.concentrationSymbol).toBe("AAA");
    expect(summary.concentrationWeightPercent).toBeCloseTo(80, 5);
  });

  it("keeps a small missing share usable as partial coverage", () => {
    const holdings = [
      ...Array.from({ length: 8 }, (_, index) =>
        equityHolding({
          symbol: `H${index}`,
          quantity: 10,
          currentPrice: 100,
        }),
      ),
      equityHolding({
        symbol: "GAP1",
        quantity: 1,
        currentPrice: 0,
        purchasePrice: 80,
        priceDataStatus: "unavailable",
        providerSymbol: "GAP1.XETRA",
      }),
      equityHolding({
        symbol: "GAP2",
        quantity: 1,
        currentPrice: 0,
        purchasePrice: 80,
        priceDataStatus: "unavailable",
        providerSymbol: "GAP2.XETRA",
      }),
    ];

    const coverage = resolvePortfolioValuationCoverage(holdings);
    expect(coverage.status).toBe("partial");
    expect(coverage.allowsValuationConclusions).toBe(true);
    expect(coverage.coverageMessage).toMatch(/excluded until market prices/i);
  });
});

describe("presentDashboardValuationCoverageMessage", () => {
  const zeroOfSeven =
    "Portfolio coverage incomplete — 0 of 7 holdings currently priced.";

  it("does not show a contradictory 0-of-N conclusion once delayed-current quotes exist", () => {
    expect(
      presentDashboardValuationCoverageMessage({
        coverageMessage: zeroOfSeven,
        priceQualities: ["delayed", "delayed", "live"],
      }),
    ).toBeNull();
  });

  it("uses a neutral checking state while quotes are still initializing", () => {
    expect(
      presentDashboardValuationCoverageMessage({
        coverageMessage: zeroOfSeven,
        priceQualities: ["unavailable", "unavailable"],
        pricesInitializing: true,
      }),
    ).toBe(HERO_COVERAGE_CHECKING_LABEL);

    expect(
      presentDashboardValuationCoverageMessage({
        coverageMessage: zeroOfSeven,
        priceQualities: ["unavailable", "unavailable"],
      }),
    ).toBe(HERO_COVERAGE_CHECKING_LABEL);

    expect(
      presentDashboardValuationCoverageMessage({
        coverageMessage: zeroOfSeven,
        priceQualities: [],
      }),
    ).toBe(HERO_COVERAGE_CHECKING_LABEL);
  });

  it("keeps an honest 0-of-N message for settled stale or unavailable quotes", () => {
    expect(
      presentDashboardValuationCoverageMessage({
        coverageMessage: zeroOfSeven,
        priceQualities: ["unavailable", "last_session", "unavailable"],
        hasSettledMarketTimestamp: true,
      }),
    ).toBe(zeroOfSeven);
  });

  it("does not weaken a genuine partial coverage message", () => {
    const partial = "1 holding excluded until market prices are available.";
    expect(
      presentDashboardValuationCoverageMessage({
        coverageMessage: partial,
        priceQualities: ["delayed", "unavailable"],
        pricesInitializing: true,
      }),
    ).toBe(partial);
  });
});
