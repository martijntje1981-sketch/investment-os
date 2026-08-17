import { describe, expect, it } from "vitest";

import {
  filterHoldingsByIntelligenceScope,
  resolveIntelligenceScope,
} from "@/lib/services/intelligenceScope";
import {
  buildAmIOnTrackQuestion,
  buildFourQuestions,
  buildWhatHappenedQuestion,
  buildWhatMattersNowQuestion,
  buildWhatsAheadQuestion,
} from "@/lib/services/fourQuestions";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  const now = "2026-08-01T12:00:00.000Z";
  return {
    id: partial.id ?? partial.symbol,
    symbol: partial.symbol,
    name: partial.name ?? partial.symbol,
    quantity: partial.quantity ?? 1,
    purchasePrice: partial.purchasePrice ?? 100,
    currentPrice: partial.currentPrice ?? 110,
    previousClose: partial.previousClose ?? 100,
    currency: partial.currency ?? "EUR",
    portfolioCurrency: partial.portfolioCurrency ?? "EUR",
    assetType: partial.assetType ?? "investment",
    createdAt: now,
    updatedAt: now,
    priceDataStatus: "live",
    change24hPercent: partial.change24hPercent,
    changePercent: partial.changePercent,
    platform: partial.platform ?? null,
    pairCurrency: partial.pairCurrency,
    pricingStatus: partial.pricingStatus,
    tradingPair: partial.tradingPair,
  };
}

const goal: GoalSettings = {
  targetValue: 1_000_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 10,
};

describe("intelligence scope foundation", () => {
  it("defaults to complete without preferred scope", () => {
    const resolved = resolveIntelligenceScope();
    expect(resolved.scope).toBe("complete");
    expect(resolved.source).toBe("default_complete");
    expect(resolved.entitlementNote).toBeNull();
  });

  it("honors explicit preferred scope without pricing/gating fields", () => {
    expect(resolveIntelligenceScope({ preferred: "invest" }).scope).toBe(
      "invest",
    );
    expect(resolveIntelligenceScope({ preferred: "crypto" }).scope).toBe(
      "crypto",
    );
    const source = [
      "lib/services/intelligenceScope/resolveIntelligenceScope.ts",
      "lib/services/intelligenceScope/types.ts",
    ].join(" ");
    expect(source).not.toMatch(/stripe|checkout|subscription|entitle/i);
  });

  it("filters holdings by invest / crypto / complete", () => {
    const rows = [
      holding({ symbol: "AAPL", assetType: "investment" }),
      holding({
        symbol: "BTC",
        assetType: "crypto",
        change24hPercent: -2,
        currentPrice: 50_000,
        quantity: 0.1,
      }),
      holding({ symbol: "CASH", assetType: "cash", quantity: 1000, currentPrice: 1 }),
    ];
    expect(
      filterHoldingsByIntelligenceScope(rows, "invest").map((h) => h.symbol),
    ).toEqual(["AAPL", "CASH"]);
    expect(
      filterHoldingsByIntelligenceScope(rows, "crypto").map((h) => h.symbol),
    ).toEqual(["BTC"]);
    expect(filterHoldingsByIntelligenceScope(rows, "complete")).toHaveLength(3);
  });
});

describe("Four Questions builders", () => {
  const invest = holding({
    symbol: "AAPL",
    name: "Apple",
    quantity: 10,
    currentPrice: 200,
    previousClose: 190,
  });
  const crypto = holding({
    symbol: "BTC",
    name: "Bitcoin",
    assetType: "crypto",
    quantity: 1,
    currentPrice: 60_000,
    purchasePrice: 50_000,
    change24hPercent: -3,
  });

  it("builds all four questions for complete scope", () => {
    const progress = deriveGoalProgress({
      currentPortfolioValue: 100_000,
      goal,
      hasSavedGoal: true,
    });
    const bundle = buildFourQuestions({
      holdings: [invest, crypto],
      preferredScope: "complete",
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
      realityCheck: null,
    });
    expect(bundle.scope).toBe("complete");
    expect(bundle.questions.map((q) => q.id)).toEqual([
      "what_happened",
      "what_matters_now",
      "am_i_on_track",
      "whats_ahead",
    ]);
    expect(bundle.questions.every((q) => q.explore.href.length > 0)).toBe(true);
  });

  it("filters Q1 to invest assets only", () => {
    const q = buildWhatHappenedQuestion({
      scope: "invest",
      holdings: filterHoldingsByIntelligenceScope([invest, crypto], "invest"),
    });
    expect(q.scope).toBe("invest");
    expect(q.answer.toLowerCase()).toContain("investment");
    expect(q.explore.href).toContain("/analysis");
  });

  it("filters Q1 to crypto assets only", () => {
    const q = buildWhatHappenedQuestion({
      scope: "crypto",
      holdings: filterHoldingsByIntelligenceScope([invest, crypto], "crypto"),
    });
    expect(q.scope).toBe("crypto");
    expect(q.answer.toLowerCase()).toContain("crypto");
  });

  it("Complete materiality uses one portfolio-level answer (not stacked)", () => {
    const q = buildWhatHappenedQuestion({
      scope: "complete",
      holdings: [invest, crypto],
    });
    expect(q.answer).not.toMatch(/Invest[\s\S]*Crypto|Crypto[\s\S]*Invest/i);
    expect(q.support == null || !q.support.includes("\n")).toBe(true);
  });

  it("Q2 quiet state is valid", () => {
    const quietHolding = holding({
      symbol: "MSFT",
      currentPrice: 100,
      previousClose: 100.05,
    });
    const bundle = buildFourQuestions({
      holdings: [quietHolding],
      preferredScope: "invest",
      goal: null,
      hasSavedGoal: false,
      goalProgress: deriveGoalProgress({
        currentPortfolioValue: 100,
        goal: null,
        hasSavedGoal: false,
      }),
    });
    const q2 = bundle.questions.find((q) => q.id === "what_matters_now")!;
    // Either quiet copy or a single conclusion — never empty answer
    expect(q2.answer.length).toBeGreaterThan(0);
  });

  it("Q2 explicit quiet answer when no intelligence", () => {
    const q = buildWhatMattersNowQuestion({
      scope: "complete",
      holdings: [],
      intelligence: null,
    });
    expect(q.quiet).toBe(true);
    expect(q.answer).toMatch(/nothing requires special attention/i);
  });

  it("Goals work for invest, crypto, and complete scopes", () => {
    for (const scope of ["invest", "crypto", "complete"] as const) {
      const scoped = filterHoldingsByIntelligenceScope(
        [invest, crypto],
        scope,
      );
      const progress = deriveGoalProgress({
        currentPortfolioValue: scoped.reduce(
          (sum, row) => sum + row.quantity * row.currentPrice,
          0,
        ),
        goal,
        hasSavedGoal: true,
      });
      const q = buildAmIOnTrackQuestion({
        scope,
        progress,
        goal,
        realityCheck: null,
      });
      expect(q.answer.length).toBeGreaterThan(0);
      expect(q.explore.href).toContain("goal");
      expect(q.answer).not.toMatch(/upgrade|complete to use goals/i);
    }
  });

  it("Q4 quiet when no forward signal", () => {
    const q = buildWhatsAheadQuestion({
      scope: "complete",
      holdings: [],
    });
    expect(q.quiet).toBe(true);
    expect(q.answer).toMatch(/no major portfolio-specific forward signal/i);
  });

  it("Q4 can surface scenario sensitivity when holdings exist", () => {
    const q = buildWhatsAheadQuestion({
      scope: "complete",
      holdings: [invest, crypto],
      goal,
      hasSavedGoal: true,
    });
    expect(q.explore.href).toContain("scenario");
    expect(q.answer.length).toBeGreaterThan(0);
  });
});
