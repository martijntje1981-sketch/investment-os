import {
  ANALYSIS_BLOCK_LIMITED_COPY,
  ANALYSIS_HYPOTHETICAL_DISCLAIMER,
  ANALYSIS_INCOMPLETE_COVERAGE_COPY,
  ANALYSIS_QUIET_ATTENTION_COPY,
  buildAnalysisGlance,
} from "@/lib/services/analysisGlance";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { resolvePortfolioValuationCoverage } from "@/lib/client/portfolioValuationCoverage";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { STANCE_POSITIONING_DISCLAIMER } from "@/lib/services/portfolioStance";
import { SCENARIO_PROHIBITED_PATTERNS } from "@/lib/services/scenarioEngine/wording";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import { describe, expect, it } from "vitest";

function equity(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: `${overrides.symbol}-id`,
    assetType: "investment",
    name: overrides.symbol,
    quantity: 10,
    purchasePrice: 100,
    currentPrice: 110,
    currency: "EUR",
    providerSymbol: `${overrides.symbol}.XETRA`,
    priceDataStatus: "live",
    ...overrides,
  };
}

function bitcoin(weightPrice: number): StoredPortfolioHolding {
  return {
    id: "btc-id",
    assetType: "crypto",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    purchasePrice: weightPrice,
    currentPrice: weightPrice,
    currentPairPrice: weightPrice,
    pairCurrency: "EUR",
    tradingPair: "BTC/EUR",
    providerSymbol: "BTC-EUR.CC",
    currency: "EUR",
    portfolioCurrency: "EUR",
    priceDataStatus: "live",
    pricingStatus: "priced",
  };
}

function cash(amount: number): StoredPortfolioHolding {
  return {
    id: "cash-eur",
    assetType: "cash",
    symbol: "EUR",
    name: "EUR Cash",
    quantity: amount,
    purchasePrice: 1,
    currentPrice: 1,
    currency: "EUR",
    priceDataStatus: "live",
  };
}

describe("buildAnalysisGlance", () => {
  it("reuses canonical stance classification rather than inventing a new score", () => {
    const holdings = [
      bitcoin(73_000),
      equity({ symbol: "VWCE", name: "FTSE All-World", quantity: 20, currentPrice: 140 }),
      cash(5_000),
    ];
    const analysis = buildPortfolioAnalysis(holdings);
    const allocation = buildPortfolioExposureAllocation(holdings);
    const glance = buildAnalysisGlance({ holdings, analysis, allocation });

    expect(glance.stance.status).toBe("ready");
    expect(glance.stance.bandLabel).toMatch(/offensive/i);
    expect(glance.stance.score).toEqual(expect.any(Number));
    expect(glance.stance.disclaimer).toBe(STANCE_POSITIONING_DISCLAIMER);
    expect(glance.stance.metrics.length).toBeGreaterThan(0);
    expect(glance.stance.metrics.length).toBeLessThanOrEqual(3);
    expect(glance.stance.conclusion).toMatch(/stance|positioned|mix/i);
  });

  it("turns concentration facts into implications and keeps at most three items", () => {
    const holdings = [
      bitcoin(80_000),
      equity({ symbol: "VWCE", quantity: 10, currentPrice: 120 }),
      equity({ symbol: "VUSA", quantity: 8, currentPrice: 100 }),
      equity({ symbol: "IWDA", quantity: 6, currentPrice: 90 }),
      equity({ symbol: "EQQQ", quantity: 4, currentPrice: 80 }),
      cash(1_000),
    ];
    const analysis = buildPortfolioAnalysis(holdings);
    const allocation = buildPortfolioExposureAllocation(holdings);
    const glance = buildAnalysisGlance({ holdings, analysis, allocation });

    expect(glance.attention.items.length).toBeGreaterThan(0);
    expect(glance.attention.items.length).toBeLessThanOrEqual(3);
    expect(glance.attention.items.some((item) => item.id === "holding_dominance")).toBe(
      true,
    );
    expect(glance.attention.items[0]?.implication).toMatch(
      /outweigh|dominate|dominated/i,
    );
    expect(
      glance.attention.items.every((item) => !/^IB1T is 72/i.test(item.implication)),
    ).toBe(true);
    expect(glance.attention.items.every((item) => item.value.length > 0)).toBe(
      true,
    );
  });

  it("allows a calm empty attention list", () => {
    const holdings = [
      equity({ symbol: "VWCE", quantity: 25, currentPrice: 100 }),
      equity({ symbol: "IWDA", quantity: 24, currentPrice: 100 }),
      equity({ symbol: "VUSA", quantity: 23, currentPrice: 100 }),
      equity({ symbol: "IEMA", quantity: 22, currentPrice: 100 }),
      cash(1_200),
    ];
    const analysis = buildPortfolioAnalysis(holdings);
    const allocation = buildPortfolioExposureAllocation(holdings);
    const glance = buildAnalysisGlance({ holdings, analysis, allocation });
    expect(glance.attention.items.length).toBeLessThanOrEqual(3);
    if (glance.attention.items.length === 0) {
      expect(glance.attention.quietMessage).toBe(ANALYSIS_QUIET_ATTENTION_COPY);
    }
  });

  it("uses existing scenario calculations and hypothetical language", () => {
    const holdings = [
      bitcoin(40_000),
      equity({ symbol: "VWCE", quantity: 50, currentPrice: 200 }),
    ];
    const analysis = buildPortfolioAnalysis(holdings);
    const allocation = buildPortfolioExposureAllocation(holdings);
    const glance = buildAnalysisGlance({ holdings, analysis, allocation });

    expect(glance.outlook.status).toBe("ready");
    expect(glance.outlook.primary).not.toBeNull();
    expect(glance.outlook.primary?.shortLabel).toMatch(/Bitcoin|Equities|Crypto/);
    expect(glance.outlook.primary?.impactPercent).not.toBeNull();
    expect(glance.outlook.comparisons.length).toBeLessThanOrEqual(2);
    expect(glance.outlook.disclaimer).toBe(ANALYSIS_HYPOTHETICAL_DISCLAIMER);
    expect(glance.outlook.disclaimer).toMatch(/not a prediction/i);
    for (const pattern of SCENARIO_PROHIBITED_PATTERNS) {
      expect(glance.outlook.disclaimer).not.toMatch(pattern);
      expect(glance.outlook.primary?.title ?? "").not.toMatch(pattern);
    }
  });

  it("does not emit false-confidence weights when Phase 3 coverage is incomplete", () => {
    const holdings = [
      {
        ...bitcoin(40_000),
        currentPrice: 0,
        currentPairPrice: null,
        priceDataStatus: "unavailable" as const,
        pricingStatus: "price_unavailable" as const,
      },
      equity({
        symbol: "VWCE",
        currentPrice: 0,
        priceDataStatus: "unavailable",
      }),
    ];
    const coverage = resolvePortfolioValuationCoverage(holdings);
    expect(coverage.allowsValuationConclusions).toBe(false);

    const analysis = buildPortfolioAnalysis(holdings);
    const allocation = buildPortfolioExposureAllocation(holdings);
    const glance = buildAnalysisGlance({ holdings, analysis, allocation });

    expect(glance.coverageComplete).toBe(false);
    expect(glance.coverageMessage).toBe(ANALYSIS_INCOMPLETE_COVERAGE_COPY);
    expect(glance.stance.status).toBe("incomplete");
    expect(glance.stance.bandLabel).toBeNull();
    expect(glance.stance.score).toBeNull();
    expect(glance.stance.metrics).toEqual([]);
    expect(glance.stance.conclusion).toBe(ANALYSIS_BLOCK_LIMITED_COPY);
    expect(glance.outlook.status).toBe("incomplete");
    expect(glance.outlook.primary).toBeNull();
    expect(glance.outlook.message).toBe(ANALYSIS_BLOCK_LIMITED_COPY);
    expect(glance.attention.items).toHaveLength(0);
    expect(glance.attention.limited).toBe(true);
    expect(glance.attention.quietMessage).toBe(ANALYSIS_BLOCK_LIMITED_COPY);
    expect(glance.stance.conclusion).not.toBe(glance.coverageMessage);
    expect(glance.outlook.message).not.toBe(glance.coverageMessage);
  });
});
