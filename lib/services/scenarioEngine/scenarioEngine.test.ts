import { describe, expect, it } from "vitest";

import {
  applyExposureShock,
  DEFERRED_SCENARIO_NOTES,
  runAllPortfolioScenarios,
  runPortfolioScenario,
  SCENARIO_DEFINITIONS,
  SCENARIO_PROHIBITED_PATTERNS,
  selectAffectedHoldings,
} from "@/lib/services/scenarioEngine";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 90,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol ?? null,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

describe("applyExposureShock", () => {
  it("applies transparent weight × shock arithmetic", () => {
    // 40% sleeve × −20% → −8% and −800 on 10_000 total
    const result = applyExposureShock({
      portfolioTotalValue: 10_000,
      affectedValue: 4_000,
      shockPercent: -20,
    });
    expect(result).toEqual({
      affectedPortfolioWeightPercent: 40,
      estimatedPortfolioImpactPercent: -8,
      estimatedPortfolioImpactAmount: -800,
    });
  });

  it("supports positive shocks", () => {
    const result = applyExposureShock({
      portfolioTotalValue: 1_000,
      affectedValue: 500,
      shockPercent: 10,
    });
    expect(result?.estimatedPortfolioImpactPercent).toBe(5);
    expect(result?.estimatedPortfolioImpactAmount).toBe(50);
  });

  it("returns null for missing portfolio value", () => {
    expect(
      applyExposureShock({
        portfolioTotalValue: 0,
        affectedValue: 100,
        shockPercent: -20,
      }),
    ).toBeNull();
  });
});

describe("runPortfolioScenario", () => {
  it("estimates Bitcoin −20% from direct Bitcoin exposure", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        providerSymbol: "BTC-EUR.CC",
        quantity: 1,
        currentPrice: 40_000,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 60_000,
        currentPrice: 1,
      }),
    ];

    const result = runPortfolioScenario(holdings, "bitcoin_minus_20");
    expect(result.status).toBe("ok");
    expect(result.affectedPortfolioWeightPercent).toBe(40);
    expect(result.estimatedPortfolioImpactPercent).toBe(-8);
    expect(result.estimatedPortfolioImpactAmount).toBe(-8_000);
    expect(result.affectedHoldings.map((row) => row.symbol)).toEqual(["BTC"]);
    expect(result.explanation).toMatch(/Bitcoin exposure/i);
    expect(result.coverageNote).toMatch(/not intended to be stacked/i);
  });

  it("estimates equity −20% from classified equity / ETF exposure", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 1_000,
        currentPrice: 1,
      }),
    ];

    // Equity 1000 / total 2000 = 50% × −20% = −10%
    const result = runPortfolioScenario(holdings, "global_equities_minus_20");
    expect(result.status).toBe("ok");
    expect(result.affectedPortfolioWeightPercent).toBe(50);
    expect(result.estimatedPortfolioImpactPercent).toBe(-10);
    expect(result.estimatedPortfolioImpactAmount).toBe(-200);
    expect(result.affectedHoldings.map((row) => row.symbol)).toEqual(["VWCE"]);
  });

  it("estimates crypto −20% for mixed crypto sleeve", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 20_000,
      }),
      holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        quantity: 10,
        currentPrice: 2_000,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 60_000,
        currentPrice: 1,
      }),
    ];

    const result = runPortfolioScenario(holdings, "crypto_minus_20");
    expect(result.status).toBe("ok");
    expect(result.affectedPortfolioWeightPercent).toBe(40);
    expect(result.estimatedPortfolioImpactPercent).toBe(-8);
    expect(result.estimatedPortfolioImpactAmount).toBe(-8_000);
    expect(result.affectedHoldings.map((row) => row.symbol).sort()).toEqual([
      "BTC",
      "ETH",
    ]);
  });

  it("handles a mixed portfolio without stacking Bitcoin into equity", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 400,
        currentPrice: 100,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 40_000,
      }),
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 20_000,
        currentPrice: 1,
      }),
    ];
    // Equity 40k + BTC 40k + cash 20k = 100k → 40% / 40% / 20%

    const equity = runPortfolioScenario(holdings, "global_equities_minus_20");
    const bitcoin = runPortfolioScenario(holdings, "bitcoin_minus_20");
    const crypto = runPortfolioScenario(holdings, "crypto_minus_20");

    expect(equity.affectedPortfolioWeightPercent).toBe(40);
    expect(equity.estimatedPortfolioImpactPercent).toBe(-8);
    expect(bitcoin.affectedPortfolioWeightPercent).toBe(40);
    expect(bitcoin.estimatedPortfolioImpactPercent).toBe(-8);
    expect(crypto.affectedPortfolioWeightPercent).toBe(40);
    expect(crypto.estimatedPortfolioImpactPercent).toBe(-8);

    expect(equity.affectedHoldings.map((row) => row.symbol)).toEqual(["VWCE"]);
    expect(bitcoin.affectedHoldings.map((row) => row.symbol)).toEqual(["BTC"]);
  });

  it("returns ~0% impact for cash-heavy portfolios on equity/crypto shocks", () => {
    const holdings = [
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 9_500,
        currentPrice: 1,
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 5,
        currentPrice: 100,
      }),
    ];

    const equity = runPortfolioScenario(holdings, "global_equities_minus_20");
    expect(equity.affectedPortfolioWeightPercent).toBe(5);
    expect(equity.estimatedPortfolioImpactPercent).toBe(-1);

    const bitcoin = runPortfolioScenario(holdings, "bitcoin_minus_20");
    expect(bitcoin.affectedPortfolioWeightPercent).toBe(0);
    expect(bitcoin.estimatedPortfolioImpactPercent).toBe(0);
    expect(bitcoin.estimatedPortfolioImpactAmount).toBe(0);
    expect(bitcoin.explanation).toMatch(/None of your current valued portfolio/i);
  });

  it("returns zero Bitcoin impact when crypto exists but is not Bitcoin", () => {
    const holdings = [
      holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        quantity: 10,
        currentPrice: 2_000,
      }),
    ];

    const result = runPortfolioScenario(holdings, "bitcoin_minus_20");
    expect(result.affectedPortfolioWeightPercent).toBe(0);
    expect(result.estimatedPortfolioImpactPercent).toBe(0);
    expect(result.affectedHoldings).toHaveLength(0);
  });

  it("returns zero equity impact when portfolio has no classified equity", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 50_000,
      }),
    ];

    const result = runPortfolioScenario(holdings, "global_equities_minus_20");
    expect(result.affectedPortfolioWeightPercent).toBe(0);
    expect(result.estimatedPortfolioImpactPercent).toBe(0);
  });

  it("excludes unclassified investments from equity shock and notes coverage", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
      holding({
        symbol: "AAPL",
        name: "Apple Inc",
        quantity: 10,
        currentPrice: 100,
      }),
    ];

    const result = runPortfolioScenario(holdings, "global_equities_minus_20");
    // Only VWCE (1000) of 2000 total
    expect(result.affectedPortfolioWeightPercent).toBe(50);
    expect(result.estimatedPortfolioImpactPercent).toBe(-10);
    expect(result.affectedHoldings.map((row) => row.symbol)).toEqual(["VWCE"]);
    expect(result.coverageNote).toMatch(/unclassified/i);
    expect(result.dataQuality).toBe("medium");
  });

  it("excludes holdings without usable price/value", () => {
    const valued = holding({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 10,
      currentPrice: 100,
    });
    const unvalued = holding({
      symbol: "NOVAL",
      name: "No value",
      quantity: 0,
      currentPrice: 100,
      providerSymbol: "VWCE.XETRA",
    });

    const result = runPortfolioScenario(
      [valued, unvalued],
      "global_equities_minus_20",
    );
    expect(result.portfolioTotalValue).toBe(1_000);
    expect(result.affectedPortfolioWeightPercent).toBe(100);
    expect(result.estimatedPortfolioImpactPercent).toBe(-20);
    expect(result.coverageNote).toMatch(/without usable value excluded/i);
  });

  it("returns insufficient_data when no valued holdings exist", () => {
    const result = runPortfolioScenario([], "crypto_minus_20");
    expect(result.status).toBe("insufficient_data");
    expect(result.estimatedPortfolioImpactPercent).toBeNull();
    expect(result.estimatedPortfolioImpactAmount).toBeNull();
    expect(result.affectedPortfolioWeightPercent).toBeNull();
    expect(result.dataQuality).toBe("insufficient");
    expect(result.coverageNote).toMatch(/unavailable/i);
  });

  it("includes Bitcoin-named crypto ETP in Bitcoin scenario once (no double count)", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        quantity: 100,
        currentPrice: 50,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 5_000,
      }),
    ];

    const bitcoin = runPortfolioScenario(holdings, "bitcoin_minus_20");
    expect(bitcoin.affectedHoldings).toHaveLength(2);
    expect(bitcoin.affectedPortfolioWeightPercent).toBe(100);
    expect(bitcoin.estimatedPortfolioImpactPercent).toBe(-20);

    // Whole-instrument: each id appears once
    const ids = bitcoin.affectedHoldings.map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);

    const equity = runPortfolioScenario(holdings, "global_equities_minus_20");
    expect(equity.affectedHoldings).toHaveLength(0);
  });

  it("does not double-count an equity ETF via look-through underlyings", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
    ];

    const affected = selectAffectedHoldings(holdings, "equity_classified");
    expect(affected).toHaveLength(1);
    expect(affected[0]?.holding.symbol).toBe("VWCE");

    const result = runPortfolioScenario(holdings, "global_equities_minus_20");
    expect(result.affectedHoldings).toHaveLength(1);
    expect(result.estimatedPortfolioImpactAmount).toBe(-200);
  });

  it("calculates base-currency impact amount from affected sleeve value", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 2,
        currentPrice: 25_000,
      }),
    ];

    const result = runPortfolioScenario(holdings, "bitcoin_minus_20");
    expect(result.portfolioTotalValue).toBe(50_000);
    expect(result.estimatedPortfolioImpactAmount).toBe(-10_000);
  });

  it("avoids advisory wording in scenario copy", () => {
    const holdings = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 10,
        currentPrice: 100,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 10_000,
      }),
    ];

    for (const result of runAllPortfolioScenarios(holdings)) {
      const text = [
        result.scenarioName,
        result.explanation,
        result.coverageNote ?? "",
        ...result.assumptions,
        ...result.limitations,
      ].join("\n");
      for (const pattern of SCENARIO_PROHIBITED_PATTERNS) {
        expect(text).not.toMatch(pattern);
      }
    }
  });
});

describe("Phase 2A scenario catalog", () => {
  it("ships only the three reliable scenarios", () => {
    expect(SCENARIO_DEFINITIONS.map((row) => row.id)).toEqual([
      "global_equities_minus_20",
      "bitcoin_minus_20",
      "crypto_minus_20",
    ]);
  });

  it("documents deferred FX and rates scenarios", () => {
    expect(DEFERRED_SCENARIO_NOTES.map((row) => row.id)).toEqual([
      "eur_plus_10_vs_usd",
      "rates_plus_1",
      "rates_minus_1",
      "credit_spreads_widen",
      "inflation_shock",
    ]);
  });
});
