import { describe, expect, it } from "vitest";

import {
  ALLOCATION_DOMINANT_PERCENT,
  ALLOCATION_TWO_LARGEST_PERCENT,
  buildAllocationIntelligence,
} from "@/lib/services/allocationIntelligence";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  runAllPortfolioScenarios,
  type ScenarioAffectedHolding,
  type ScenarioResult,
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
    quantity: overrides.quantity ?? 1,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
    marketPriceUpdatedAt: overrides.marketPriceUpdatedAt,
  };
}

function affected(
  row: Pick<ScenarioAffectedHolding, "id" | "symbol" | "name" | "value">,
): ScenarioAffectedHolding {
  return {
    ...row,
    weightPercent: 0,
  };
}

function scenarioResult(
  overrides: Partial<ScenarioResult> & Pick<ScenarioResult, "scenarioId">,
): ScenarioResult {
  return {
    scenarioName: "Global equities −20%",
    status: "ok",
    shockPercent: -20,
    estimatedPortfolioImpactPercent: -8,
    estimatedPortfolioImpactAmount: -800,
    affectedPortfolioWeightPercent: 40,
    affectedValue: 400,
    portfolioTotalValue: 1000,
    affectedHoldings: [],
    explanation: "Modeled from current exposure.",
    coverageNote: null,
    assumptions: [],
    limitations: [],
    dataQuality: "high",
    ...overrides,
  };
}

describe("buildAllocationIntelligence", () => {
  it("A. sorts allocation groups by canonical portfolio weight", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 240,
        currentPrice: 1,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 540,
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 1,
        currentPrice: 50,
      }),
    ]);
    const intelligence = buildAllocationIntelligence({ allocation });

    expect(intelligence.groups.map((group) => group.groupId)).toEqual(
      allocation.groups.map((group) => group.groupId),
    );
    const weights = intelligence.groups.map((group) => group.rawPercent);
    const sorted = [...weights].sort((left, right) => right - left);
    expect(weights).toEqual(sorted);
    expect(intelligence.groups[0]?.groupId).toBe("crypto");
  });

  it("B. uses canonical allocation percentages without a parallel engine", () => {
    const holdings = [
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 540,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 460,
        currentPrice: 1,
      }),
    ];
    const allocation = buildPortfolioExposureAllocation(holdings);
    const intelligence = buildAllocationIntelligence({ allocation });

    for (const group of intelligence.groups) {
      const canonical = allocation.groups.find(
        (row) => row.groupId === group.groupId,
      );
      expect(canonical).toBeTruthy();
      expect(group.rawPercent).toBe(canonical!.rawPercent);
      expect(group.displayPercent).toBe(canonical!.displayPercent);
      expect(group.value).toBe(canonical!.value);
    }
  });

  it("C. keeps cash as a real allocation group", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "EUR",
        name: "Euro cash",
        assetType: "cash",
        quantity: 400,
        currentPrice: 1,
      }),
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 600,
      }),
    ]);
    const intelligence = buildAllocationIntelligence({ allocation });
    const cash = intelligence.groups.find((group) => group.groupId === "cash");
    expect(cash).toBeTruthy();
    expect(cash?.isCash).toBe(true);
    expect(cash?.rawPercent).toBeCloseTo(40, 5);
    expect(cash?.holdings.map((row) => row.name)).toContain("Euro cash");
  });

  it("D. does not redistribute unclassified weight into known groups", () => {
    const classifiedOnly = buildPortfolioExposureAllocation([
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 800,
      }),
    ]);
    const withUnclassified = buildPortfolioExposureAllocation([
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 800,
      }),
      holding({
        symbol: "ZZZXFOO",
        name: "Unknown holding",
        quantity: 1,
        currentPrice: 200,
      }),
    ]);

    const before = buildAllocationIntelligence({ allocation: classifiedOnly });
    const after = buildAllocationIntelligence({ allocation: withUnclassified });
    const cryptoBefore = before.groups.find((group) => group.groupId === "crypto");
    const cryptoAfter = after.groups.find((group) => group.groupId === "crypto");
    const unclassified = after.groups.find(
      (group) => group.groupId === "other_unclassified",
    );

    expect(cryptoBefore?.rawPercent).toBe(100);
    expect(cryptoAfter?.rawPercent).toBeCloseTo(80, 5);
    expect(unclassified?.rawPercent).toBeCloseTo(20, 5);
    expect(
      (cryptoAfter?.rawPercent ?? 0) + (unclassified?.rawPercent ?? 0),
    ).toBeCloseTo(100, 5);
  });

  it("E. reports a dominant allocation when one group is concentrated", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 540,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 460,
        currentPrice: 1,
      }),
    ]);
    const intelligence = buildAllocationIntelligence({ allocation });
    const crypto = allocation.groups.find((group) => group.groupId === "crypto");
    expect(crypto!.rawPercent).toBeGreaterThanOrEqual(ALLOCATION_DOMINANT_PERCENT);
    expect(intelligence.insight.kind).toBe("dominant");
    expect(intelligence.insight.sentence).toContain("Crypto is your largest allocation");
    expect(intelligence.insight.sentence).toMatch(/54%/);
  });

  it("F. reports two-largest concentration when no single group dominates", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "BTC",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 350,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 350,
        currentPrice: 1,
      }),
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 1,
        currentPrice: 300,
      }),
    ]);
    const intelligence = buildAllocationIntelligence({ allocation });
    const twoLargest =
      (allocation.groups[0]?.rawPercent ?? 0) +
      (allocation.groups[1]?.rawPercent ?? 0);
    expect(allocation.groups[0]!.rawPercent).toBeLessThan(
      ALLOCATION_DOMINANT_PERCENT,
    );
    expect(twoLargest).toBeGreaterThanOrEqual(ALLOCATION_TWO_LARGEST_PERCENT);
    expect(intelligence.insight.kind).toBe("two_largest");
    expect(intelligence.insight.sentence).toMatch(
      /two largest allocation groups represent/i,
    );
  });

  it("G. links a scenario only when one allocation group accounts for the shocked sleeve", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        providerSymbol: "IB1T.XETRA",
        name: "iShares Bitcoin ETP",
        quantity: 1,
        currentPrice: 800,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 200,
        currentPrice: 1,
      }),
    ];
    const allocation = buildPortfolioExposureAllocation(holdings);
    const intelligence = buildAllocationIntelligence({
      allocation,
      scenarioResults: runAllPortfolioScenarios(holdings),
    });

    expect(intelligence.scenarioLink).not.toBeNull();
    expect(intelligence.scenarioLink?.groupId).toBe("crypto");
    expect(intelligence.scenarioLink?.sentence).toMatch(/Crypto is also the main reason/);
    expect(intelligence.scenarioLink?.sentence).toMatch(/Bitcoin −20%|Crypto −20%/);
  });

  it("H. omits a scenario explanation when no single group traces the shocked sleeve", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        id: "vwce-id",
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 1,
        currentPrice: 200,
      }),
      holding({
        id: "nukl-id",
        symbol: "NUKL",
        providerSymbol: "NUKL.XETRA",
        quantity: 1,
        currentPrice: 200,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 600,
        currentPrice: 1,
      }),
    ]);
    const diversified = allocation.groups.find((group) =>
      group.holdings.some((row) => row.id === "vwce-id"),
    );
    const industrials = allocation.groups.find((group) =>
      group.holdings.some((row) => row.id === "nukl-id"),
    );
    expect(diversified?.groupId).toBe("diversified_equity");
    expect(industrials?.groupId).toBe("industrials_resources");

    const intelligence = buildAllocationIntelligence({
      allocation,
      scenarioResults: [
        scenarioResult({
          scenarioId: "global_equities_minus_20",
          affectedValue: 400,
          affectedHoldings: [
            affected({
              id: "vwce-id",
              symbol: "VWCE",
              name: "VWCE",
              value: 200,
            }),
            affected({
              id: "nukl-id",
              symbol: "NUKL",
              name: "NUKL",
              value: 200,
            }),
          ],
        }),
      ],
    });

    expect(intelligence.scenarioLink).toBeNull();
  });

  it("I/J. includes Fixed Income and the existing Bonds & Rates destination", () => {
    const allocation = buildPortfolioExposureAllocation([
      holding({
        symbol: "IBTM",
        name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
        quantity: 1,
        currentPrice: 80,
      }),
      holding({
        symbol: "EUR",
        assetType: "cash",
        quantity: 920,
        currentPrice: 1,
      }),
    ]);
    const intelligence = buildAllocationIntelligence({ allocation });
    const fi = intelligence.groups.find((group) => group.groupId === "fixed_income");
    expect(fi).toBeTruthy();
    expect(intelligence.hasFixedIncome).toBe(true);
    expect(intelligence.fixedIncomeRawPercent).toBeCloseTo(8, 5);
    expect(intelligence.bondsRatesHref).toBe(DASHBOARD_DEEP_LINKS.bondsRates);
    expect(intelligence.bondsRatesHref).toContain("#bonds-rates");
  });

  it("K/L. expanded groups list actual portfolio holdings only — no X-Ray constituents", () => {
    const holdings = [
      holding({
        symbol: "IB1T",
        providerSymbol: "IB1T.XETRA",
        name: "iShares Bitcoin ETP",
        quantity: 1,
        currentPrice: 535,
      }),
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        quantity: 1,
        currentPrice: 5,
      }),
    ];
    const allocation = buildPortfolioExposureAllocation(holdings);
    const intelligence = buildAllocationIntelligence({ allocation });
    const crypto = intelligence.groups.find((group) => group.groupId === "crypto");
    expect(crypto?.holdings.map((row) => row.symbol).sort()).toEqual([
      "BTC",
      "IB1T",
    ]);
    expect(crypto?.holdings.some((row) => row.symbol === "IBIT")).toBe(false);
    expect(
      crypto?.holdings.reduce((sum, row) => sum + row.weightPercent, 0),
    ).toBeCloseTo(100, 5);
  });
});
