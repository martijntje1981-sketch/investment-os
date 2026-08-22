import { describe, expect, it } from "vitest";

import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  buildDeterministicPortfolioInsight,
  buildPortfolioHealthScoreV1,
  buildPortfolioInsightEvidenceContext,
  HEALTH_SCORE_BASE_WEIGHTS,
  PORTFOLIO_HEALTH_SCORE_VERSION,
} from "@/lib/services/portfolio/healthScore";
import { buildPortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { validatePortfolioInsightAiPayloadFromScorecard } from "@/lib/services/portfolio/healthScore/openaiInsightClient";
import { buildPortfolioScorecard } from "@/lib/services/portfolio/scorecard";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    name: partial.name ?? partial.symbol,
    purchasePrice: partial.purchasePrice ?? partial.currentPrice,
    currency: "EUR",
    assetType: partial.assetType ?? "investment",
    ...partial,
  };
}

function scoreFor(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null = null,
  hasSavedGoal = Boolean(goal),
) {
  const analysis = buildPortfolioAnalysis(holdings);
  const exposure = buildPortfolioExposureAllocation(holdings);
  const profile = buildPortfolioHealthProfile({
    holdings,
    goal,
    hasSavedGoal,
    analysis,
    exposure,
  });
  return buildPortfolioHealthScoreV1({
    holdings,
    analysis,
    exposure,
    profile,
    goal,
    hasSavedGoal,
    isStale: false,
    now: new Date("2026-08-02T10:00:00.000Z"),
  });
}

const longGoal: GoalSettings = {
  targetValue: 250_000,
  targetYear: 2040,
  monthlyContribution: 500,
  expectedAnnualReturn: 0.07,
};

const nearGoal: GoalSettings = {
  targetValue: 50_000,
  targetYear: 2028,
  monthlyContribution: 300,
  expectedAnnualReturn: 0.04,
};

describe("Portfolio Health Score v1", () => {
  it("is versioned and deterministic for the same inputs", () => {
    const holdings = [
      holding({
        id: "1",
        symbol: "VWCE",
        quantity: 40,
        currentPrice: 120,
        fundCategory: "Global Equity ETF",
      }),
      holding({
        id: "2",
        symbol: "CSPX",
        quantity: 10,
        currentPrice: 500,
        fundCategory: "US Equity ETF",
      }),
      holding({
        id: "cash",
        symbol: "EUR",
        quantity: 5000,
        currentPrice: 1,
        assetType: "cash",
      }),
    ];
    const a = scoreFor(holdings, longGoal, true);
    const b = scoreFor(holdings, longGoal, true);
    expect(a.version).toBe(PORTFOLIO_HEALTH_SCORE_VERSION);
    expect(a.score).toBe(b.score);
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(a.score).toBeGreaterThanOrEqual(0);
    expect(a.score).toBeLessThanOrEqual(100);
  });

  it("renormalizes weights when goal and income dimensions are not applicable", () => {
    const holdings = [
      holding({ id: "1", symbol: "AAPL", quantity: 10, currentPrice: 180 }),
      holding({ id: "2", symbol: "MSFT", quantity: 8, currentPrice: 400 }),
      holding({ id: "3", symbol: "ASML", quantity: 2, currentPrice: 700 }),
    ];
    const result = scoreFor(holdings, null, false);
    const applicable = result.dimensions.filter((d) => d.applicable);
    const weightSum = applicable.reduce((sum, d) => sum + d.effectiveWeight, 0);
    expect(applicable.every((d) => d.id !== "goal_alignment")).toBe(true);
    expect(applicable.every((d) => d.id !== "income_alignment")).toBe(true);
    expect(weightSum).toBeCloseTo(100, 0);
    expect(
      Object.values(HEALTH_SCORE_BASE_WEIGHTS).reduce((a, b) => a + b, 0),
    ).toBe(100);
  });

  it("scores a one-holding portfolio with weak diversification and concentration", () => {
    const result = scoreFor([
      holding({ id: "1", symbol: "AAPL", quantity: 100, currentPrice: 180 }),
    ]);
    const concentration = result.dimensions.find(
      (d) => d.id === "concentration",
    );
    const diversification = result.dimensions.find(
      (d) => d.id === "diversification",
    );
    expect(concentration?.score).toBeLessThan(40);
    expect(diversification?.score).toBeLessThan(45);
    expect(result.score).toBeLessThan(60);
    expect(result.attentionPoints.length).toBeGreaterThan(0);
  });

  it("gives a Bitcoin-only portfolio low diversification and high concentration pressure", () => {
    const result = scoreFor([
      holding({
        id: "btc",
        symbol: "BTC",
        quantity: 1.5,
        currentPrice: 60_000,
        assetType: "crypto",
        tradingPair: "BTC/USD",
      }),
    ]);
    expect(result.portfolioIdentity).toMatch(/Bitcoin/i);
    expect(
      result.dimensions.find((d) => d.id === "concentration")?.score,
    ).toBeLessThan(30);
    expect(result.score).toBeLessThan(55);
  });

  it("credits diversified equity ETF exposure without inventing history", () => {
    const etfBook = scoreFor([
      holding({
        id: "1",
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 100,
        currentPrice: 120,
      }),
      holding({
        id: "cash",
        symbol: "EUR",
        quantity: 8000,
        currentPrice: 1,
        assetType: "cash",
      }),
    ]);
    const singleStock = scoreFor([
      holding({ id: "1", symbol: "AAPL", quantity: 100, currentPrice: 180 }),
    ]);
    const etfDiv = etfBook.dimensions.find((d) => d.id === "diversification");
    const stockDiv = singleStock.dimensions.find(
      (d) => d.id === "diversification",
    );
    expect(etfDiv?.score ?? 0).toBeGreaterThan(stockDiv?.score ?? 0);
    expect(
      etfDiv?.evidence.some((item) => item.id === "broad-etf-credit"),
    ).toBe(true);
  });

  it("does not over-reward overlapping holdings in the same exposure group", () => {
    const overlapping = scoreFor([
      holding({
        id: "1",
        symbol: "AAPL",
        quantity: 20,
        currentPrice: 180,
        sectorExposure: ["Technology"],
      }),
      holding({
        id: "2",
        symbol: "MSFT",
        quantity: 10,
        currentPrice: 400,
        sectorExposure: ["Technology"],
      }),
      holding({
        id: "3",
        symbol: "NVDA",
        quantity: 5,
        currentPrice: 900,
        sectorExposure: ["Technology"],
      }),
      holding({
        id: "4",
        symbol: "GOOGL",
        quantity: 8,
        currentPrice: 160,
        sectorExposure: ["Technology"],
      }),
    ]);
    const diversification = overlapping.dimensions.find(
      (d) => d.id === "diversification",
    );
    expect(
      diversification?.evidence.some(
        (e) => e.id === "overlapping-exposures" || e.id === "distinct-groups",
      ),
    ).toBe(true);
    expect(diversification?.score ?? 100).toBeLessThan(85);
  });

  it("scores cash-only and high-cash portfolios without claiming investment quality", () => {
    const cashOnly = scoreFor([
      holding({
        id: "cash",
        symbol: "EUR",
        quantity: 20_000,
        currentPrice: 1,
        assetType: "cash",
      }),
    ]);
    expect(cashOnly.hasValuedPortfolio).toBe(true);
    expect(cashOnly.disclaimer.toLowerCase()).toContain("not predict returns");
    expect(cashOnly.score).toBeLessThan(70);

    const highCash = scoreFor(
      [
        holding({ id: "1", symbol: "VWCE", quantity: 10, currentPrice: 120 }),
        holding({
          id: "cash",
          symbol: "EUR",
          quantity: 40_000,
          currentPrice: 1,
          assetType: "cash",
        }),
      ],
      longGoal,
      true,
    );
    expect(
      highCash.dimensions.find((d) => d.id === "liquidity_cash")?.score ?? 100,
    ).toBeLessThan(70);
  });

  it("treats near-term goals more strictly on risk balance than long-term goals", () => {
    const cryptoHeavy = [
      holding({
        id: "btc",
        symbol: "BTC",
        quantity: 1,
        currentPrice: 60_000,
        assetType: "crypto",
      }),
      holding({
        id: "eth",
        symbol: "ETH",
        quantity: 10,
        currentPrice: 3000,
        assetType: "crypto",
      }),
      holding({ id: "1", symbol: "VWCE", quantity: 5, currentPrice: 120 }),
    ];
    const near = scoreFor(cryptoHeavy, nearGoal, true);
    const long = scoreFor(cryptoHeavy, longGoal, true);
    const nearRisk =
      near.dimensions.find((d) => d.id === "risk_balance")?.score ?? 0;
    const longRisk =
      long.dimensions.find((d) => d.id === "risk_balance")?.score ?? 0;
    expect(longRisk).toBeGreaterThanOrEqual(nearRisk - 2);
  });

  it("excludes income alignment without a passive-income goal", () => {
    const result = scoreFor(
      [holding({ id: "1", symbol: "VWCE", quantity: 20, currentPrice: 120 })],
      longGoal,
      true,
    );
    expect(
      result.dimensions.find((d) => d.id === "income_alignment")?.applicable,
    ).toBe(false);
  });

  it("reduces confidence for unclassified or incomplete books without zeroing the score", () => {
    const result = scoreFor([
      holding({
        id: "1",
        symbol: "UNKNOWN",
        quantity: 50,
        currentPrice: 40,
        name: "Mystery Holding",
      }),
    ]);
    expect(result.score).toBeGreaterThan(0);
    expect(["Moderate confidence", "Limited confidence"]).toContain(
      result.confidence.label,
    );
  });

  it("avoids sharp cliffs around concentration thresholds", () => {
    const lower = scoreFor([
      holding({ id: "1", symbol: "AAPL", quantity: 25, currentPrice: 180 }),
      holding({ id: "2", symbol: "MSFT", quantity: 20, currentPrice: 400 }),
      holding({ id: "3", symbol: "ASML", quantity: 8, currentPrice: 700 }),
    ]);
    const higher = scoreFor([
      holding({ id: "1", symbol: "AAPL", quantity: 26, currentPrice: 180 }),
      holding({ id: "2", symbol: "MSFT", quantity: 20, currentPrice: 400 }),
      holding({ id: "3", symbol: "ASML", quantity: 8, currentPrice: 700 }),
    ]);
    expect(Math.abs(lower.score - higher.score)).toBeLessThanOrEqual(4);
  });

  it("exposes evidence-based strengths and attention points", () => {
    const result = scoreFor(
      [
        holding({
          id: "1",
          symbol: "BTC",
          quantity: 2,
          currentPrice: 60_000,
          assetType: "crypto",
        }),
        holding({ id: "2", symbol: "VWCE", quantity: 5, currentPrice: 120 }),
      ],
      longGoal,
      true,
    );
    expect(result.strengths.every((s) => s.detail.length > 10)).toBe(true);
    expect(result.attentionPoints.every((s) => s.detail.length > 10)).toBe(
      true,
    );
    expect(result.explanation).toContain(`${result.score}/100`);
  });
});

describe("Portfolio insight rules + validation", () => {
  it("builds a deterministic insight from score evidence without buy/sell language", () => {
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        quantity: 2,
        currentPrice: 60_000,
        assetType: "crypto",
      }),
      holding({ id: "2", symbol: "VWCE", quantity: 10, currentPrice: 120 }),
    ];
    const analysis = buildPortfolioAnalysis(holdings);
    const exposure = buildPortfolioExposureAllocation(holdings);
    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: longGoal,
      hasSavedGoal: true,
      analysis,
      exposure,
    });
    const score = buildPortfolioHealthScoreV1({
      holdings,
      analysis,
      exposure,
      profile,
      goal: longGoal,
      hasSavedGoal: true,
    });
    const context = buildPortfolioInsightEvidenceContext(score, {
      holdings,
      analysis,
      exposure,
      profile,
      goal: longGoal,
      hasSavedGoal: true,
    });
    const insight = buildDeterministicPortfolioInsight(context);
    expect(insight.source).toBe("rules");
    expect(insight.leadInsight.length).toBeGreaterThan(20);
    expect(insight.supportingEvidence.length).toBeGreaterThan(0);
    expect(JSON.stringify(insight).toLowerCase()).not.toMatch(
      /\b(buy|sell|guaranteed)\b/,
    );
  });

  it("rejects AI payloads with advisory language or empty required fields", () => {
    const holdings = [
      holding({
        id: "1",
        symbol: "BTC",
        quantity: 1,
        currentPrice: 50000,
        assetType: "crypto",
      }),
    ];
    const analysis = buildPortfolioAnalysis(holdings);
    const exposure = buildPortfolioExposureAllocation(holdings);
    const longGoal: GoalSettings = {
      targetValue: 100000,
      targetYear: 2035,
      monthlyContribution: 500,
      expectedAnnualReturn: 7,
    };
    const profile = buildPortfolioHealthProfile({
      holdings,
      goal: longGoal,
      hasSavedGoal: true,
      dividends: null,
      analysis,
      exposure,
    });
    const health = buildPortfolioHealthScoreV1({
      holdings,
      analysis,
      exposure,
      profile,
      goal: longGoal,
      hasSavedGoal: true,
      dividends: null,
      isStale: false,
    });
    const scorecard = buildPortfolioScorecard({
      health,
      goal: longGoal,
      hasSavedGoal: true,
      goalProgress: buildGoalProgressEngine({
        currentPortfolioValue: analysis.totalValue,
        goal: longGoal,
        hasSavedGoal: true,
      }),
      analysis,
      exposure,
      momentum: { week: null, month: null, breadth: null },
    });
    expect(
      validatePortfolioInsightAiPayloadFromScorecard(
        {
          headline: "Buy more Bitcoin now",
          scoreLines: [{ scoreId: "health", text: "You should buy." }],
          watchItem: "Buy",
        },
        scorecard,
      ),
    ).toBeNull();
  });
});
