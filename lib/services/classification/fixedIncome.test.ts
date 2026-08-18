/**
 * Phase 9A.5 — Fixed Income foundation.
 * Classification, exposure, snapshots, Free/Complete, and honesty guards.
 */

import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  applyFourQuestionsIntelligenceDepth,
  buildFourQuestions,
  buildWhatHappenedQuestion,
  buildWhatMattersNowQuestion,
} from "@/lib/services/fourQuestions";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import {
  buildChangeIntelligenceSummary,
  buildIntelligenceStateSnapshot,
  compareIntelligenceStates,
} from "@/lib/services/changeIntelligence";
import {
  buildPortfolioExposureAllocation,
  classifyFixedIncomeHolding,
  classifyHoldingExposure,
} from "@/lib/services/classification";
import { buildPeriodIntelligenceReview } from "@/lib/services/periodIntelligence";
import { applyPeriodIntelligenceDepth } from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import { selectRelevantPortfolioScenarios } from "@/lib/services/scenarioRelevance";
import { runPortfolioScenario } from "@/lib/services/scenarioEngine";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    instrumentName: overrides.instrumentName,
    providerInstrumentType: overrides.providerInstrumentType,
    changePercent: overrides.changePercent,
    previousClose: overrides.previousClose,
    change24hPercent: overrides.change24hPercent,
  };
}

const goal: GoalSettings = {
  targetValue: 250_000,
  targetYear: 2035,
  monthlyContribution: 400,
  expectedAnnualReturn: 6,
};

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function listFiles(dir: string, ext: string): string[] {
  const abs = path.resolve(process.cwd(), dir);
  return readdirSync(abs)
    .filter((name) => name.endsWith(ext) && !name.endsWith(".test.ts"))
    .map((name) => path.join(dir, name).replaceAll("\\", "/"));
}

describe("fixed-income classification", () => {
  it("1. classifies a government bond ETF as Fixed Income", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "IBTM",
        name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.fixedIncome?.type).toBe("government");
    expect(result.fixedIncome?.durationBucket).toBe("intermediate");
    expect(result.fixedIncome?.confidence.assetClass).toBe("inferred");
    expect(result.fixedIncome?.confidence.duration).toBe("inferred");
  });

  it("2. classifies a corporate IG bond ETF", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "IEAC",
        name: "iShares EUR Investment Grade Corporate Bond UCITS ETF",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.fixedIncome?.type).toBe("corporate");
    expect(result.fixedIncome?.creditQuality).toBe("investment_grade");
    expect(result.fixedIncome?.confidence.creditQuality).toBe("inferred");
  });

  it("3. classifies a high-yield bond ETF", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "IHYU",
        name: "iShares USD High Yield Corporate Bond UCITS ETF",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.fixedIncome?.type).toBe("corporate");
    expect(result.fixedIncome?.creditQuality).toBe("high_yield");
  });

  it("4. classifies an aggregate bond ETF", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "AGGH",
        name: "iShares Core Global Aggregate Bond UCITS ETF",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.fixedIncome?.type).toBe("mixed_aggregate");
  });

  it("5. classifies an inflation-linked ETF", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "ITPS",
        name: "iShares USD TIPS UCITS ETF",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.fixedIncome?.type).toBe("inflation_linked");
  });

  it("6. unknown bond fund → Fixed Income / subtype unknown", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "BOND",
        name: "Bond Fund",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.fixedIncome?.type).toBe("unknown");
    expect(result.fixedIncome?.classificationIncomplete).toBe(true);
    expect(result.displayLabel).toBe("Fixed income");
  });

  it("7. does not misclassify an equity ETF", () => {
    expect(
      classifyHoldingExposure(
        holding({ symbol: "VWCE", providerSymbol: "VWCE.XETRA" }),
      ).normalizedGroupId,
    ).toBe("diversified_equity");
    expect(
      classifyHoldingExposure(
        holding({
          symbol: "CSPX",
          name: "iShares Core S&P 500 UCITS ETF",
        }),
      ).normalizedGroupId,
    ).not.toBe("fixed_income");
  });

  it("8. does not affect crypto", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        providerSymbol: "BTC-EUR.CC",
      }),
    );
    expect(result.normalizedGroupId).toBe("crypto");
    expect(result.fixedIncome?.isFixedIncome).not.toBe(true);
  });

  it("13. does not invent duration when absent", () => {
    const result = classifyFixedIncomeHolding({
      name: "Global Bond Fund",
      assetType: "investment",
    });
    expect(result.isFixedIncome).toBe(true);
    expect(result.durationBucket).toBe("unknown");
    expect(result.confidence.duration).toBe("unknown");
  });

  it("14. does not invent credit quality when absent", () => {
    const result = classifyFixedIncomeHolding({
      name: "Euro Government Bond ETF",
      assetType: "investment",
    });
    expect(result.type).toBe("government");
    expect(result.creditQuality).toBe("mixed_unknown");
    expect(result.confidence.creditQuality).toBe("unknown");
  });

  it("classifies a direct bond from provider type without analytics", () => {
    const result = classifyHoldingExposure(
      holding({
        symbol: "DE0001102374",
        name: "Bundesrepublik Deutschland 0.5% 15.02.2032",
        providerInstrumentType: "Bond",
      }),
    );
    expect(result.normalizedGroupId).toBe("fixed_income");
    expect(result.classificationSource).toBe("provider_type");
    expect(result.fixedIncome?.durationBucket).toBe("unknown");
    expect(result.fixedIncome?.confidence.assetClass).toBe("known");
  });
});

describe("fixed-income exposure, snapshots, and intelligence", () => {
  const mix = [
    holding({
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      quantity: 45,
      currentPrice: 100,
    }),
    holding({
      symbol: "BTC",
      assetType: "crypto",
      quantity: 0.25,
      currentPrice: 100_000,
    }),
    holding({
      symbol: "IBTM",
      name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
      quantity: 20,
      currentPrice: 100,
    }),
    holding({
      symbol: "IEAC",
      name: "iShares EUR Investment Grade Corporate Bond UCITS ETF",
      quantity: 10,
      currentPrice: 100,
    }),
    holding({
      symbol: "EUR",
      assetType: "cash",
      quantity: 0,
      currentPrice: 1,
    }),
  ];

  it("9. flows into portfolio exposure as Fixed income, not Other/Equity/Cash", () => {
    const allocation = buildPortfolioExposureAllocation(mix);
    const ids = allocation.groups.map((group) => group.groupId);
    expect(ids).toContain("fixed_income");
    expect(ids).toContain("diversified_equity");
    expect(ids).toContain("crypto");
    expect(ids).not.toContain("cash");
    const fi = allocation.groups.find((group) => group.groupId === "fixed_income");
    expect(fi?.displayPercent).toBeGreaterThan(0);
    expect(allocation.fixedIncome?.subgroups.map((row) => row.type)).toEqual(
      expect.arrayContaining(["government", "corporate"]),
    );
  });

  it("10. snapshots and change comparison treat Fixed income as an exposure group", () => {
    const previous = buildIntelligenceStateSnapshot({
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 82,
          currentPrice: 100,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
          quantity: 18,
          currentPrice: 100,
        }),
      ],
      snapshotKind: "monthly",
      capturedAt: "2026-06-01T08:00:00.000Z",
    });
    const current = buildIntelligenceStateSnapshot({
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 76,
          currentPrice: 100,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
          quantity: 24,
          currentPrice: 100,
        }),
      ],
      snapshotKind: "monthly",
      capturedAt: "2026-07-01T08:00:00.000Z",
    });

    expect(
      current.payload.exposure.groups.some((row) => row.groupId === "fixed_income"),
    ).toBe(true);
    expect(
      current.payload.exposure.subgroups?.some((row) =>
        /government/i.test(row.displayLabel),
      ),
    ).toBe(true);

    const compared = compareIntelligenceStates({ previous, current });
    expect(compared.status).toBe("ready");
    expect(
      compared.signals.some(
        (row) => row.category === "exposure" && row.subject === "fixed_income",
      ),
    ).toBe(true);

    const summary = buildChangeIntelligenceSummary({ previous, current });
    const blob = [
      summary.freeHeadline,
      summary.primaryStory?.headline,
      summary.primaryStory?.meaning,
      ...(summary.supportingStories ?? []).map((row) => row.headline),
      ...compared.signals.map((row) => row.headline),
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/fixed income/);
  });

  it("11. Free keeps a basic allocation headline without subtype depth", () => {
    const progress = deriveGoalProgress({
      currentPortfolioValue: 32_500,
      goal,
      hasSavedGoal: true,
    });
    const complete = buildFourQuestions({
      holdings: mix,
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
      intelligenceDepth: "complete",
    });
    const free = applyFourQuestionsIntelligenceDepth(complete, "free");
    expect(free.intelligenceDepth).toBe("free");
    expect(
      buildPortfolioExposureAllocation(mix).groups.some(
        (group) => group.groupId === "fixed_income",
      ),
    ).toBe(true);
    expect(free.questions).toHaveLength(4);
  });

  it("12. Complete can include subtype / allocation detail", () => {
    const balanced = [
      holding({
        symbol: "VWCE",
        providerSymbol: "VWCE.XETRA",
        quantity: 34,
        currentPrice: 100,
      }),
      holding({
        symbol: "IBTM",
        name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
        quantity: 33,
        currentPrice: 100,
      }),
      holding({
        symbol: "IEAC",
        name: "iShares EUR Investment Grade Corporate Bond UCITS ETF",
        quantity: 33,
        currentPrice: 100,
      }),
    ];
    const allocation = buildPortfolioExposureAllocation(balanced);
    const intelligence: PersonalIntelligenceToday = {
      generatedAt: "2026-08-18T10:00:00.000Z",
      version: "pi-today-v1",
      attention: "watch",
      headline: "Review your mix.",
      portfolioMove: null,
      topContributors: [],
      topDetractors: [],
      holdingsWeights: balanced.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        weightPercent:
          allocation.groups
            .find((group) => group.holdings.some((item) => item.symbol === row.symbol))
            ?.displayPercent ?? 0,
      })),
      exposure: allocation,
      news: null,
      goals: null,
      attentionItems: [],
      dataNotes: [],
    };
    const q2 = buildWhatMattersNowQuestion({
      scope: "all",
      holdings: balanced,
      intelligence,
      goal,
      hasSavedGoal: true,
      resilienceProfile: null,
      intelligenceDepth: "complete",
    });
    expect(allocation.fixedIncome?.subgroups.length).toBeGreaterThan(1);
    expect(allocation.groups.find((row) => row.groupId === "fixed_income")?.subgroups).toBeTruthy();
    if (q2.support) {
      expect(q2.support.toLowerCase()).toMatch(/fixed income|bond/);
    }
  });

  it("15. does not calculate a precise rate-shock without duration inputs", () => {
    const selected = selectRelevantPortfolioScenarios([
      holding({
        symbol: "IBTM",
        name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
        quantity: 100,
        currentPrice: 100,
      }),
    ]);
    expect(selected.profile.fixedIncomeWeightPercent).toBeGreaterThan(90);
    expect(selected.modeled.every((row) => row.scenarioId !== ("rates_plus_1" as never))).toBe(
      true,
    );
    expect(
      selected.unavailableRelevant.some((row) => row.id === "rates_plus_1"),
    ).toBe(true);
    const equityShock = runPortfolioScenario(
      [
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
          quantity: 100,
          currentPrice: 100,
        }),
      ],
      "global_equities_minus_20",
    );
    expect(equityShock.affectedPortfolioWeightPercent).toBe(0);
  });

  it("16. period report can mention Fixed Income through PeriodIntelligenceReview", () => {
    const previous = buildIntelligenceStateSnapshot({
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 50,
          currentPrice: 100,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
          quantity: 50,
          currentPrice: 100,
        }),
      ],
      snapshotKind: "monthly",
      capturedAt: "2026-06-01T08:00:00.000Z",
    });
    const currentLive = buildIntelligenceStateSnapshot({
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 50,
          currentPrice: 100,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond 7-10yr UCITS ETF",
          quantity: 50,
          currentPrice: 100,
        }),
      ],
      snapshotKind: "monthly",
      capturedAt: "2026-07-01T08:00:00.000Z",
    });
    const current: typeof currentLive = {
      ...currentLive,
      payload: {
        ...currentLive.payload,
        concentration: previous.payload.concentration,
        holdings: previous.payload.holdings,
        exposure: {
          ...currentLive.payload.exposure,
          groups: [
            { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 76 },
            { groupId: "fixed_income", displayLabel: "Fixed income", weightPercent: 24 },
          ],
          subgroups: [
            {
              parentGroupId: "fixed_income",
              subgroupId: "fi_government",
              displayLabel: "Government",
              weightPercent: 24,
            },
          ],
        },
      },
    };
    previous.payload.exposure = {
      ...previous.payload.exposure,
      groups: [
        { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 82 },
        { groupId: "fixed_income", displayLabel: "Fixed income", weightPercent: 18 },
      ],
      subgroups: [
        {
          parentGroupId: "fixed_income",
          subgroupId: "fi_government",
          displayLabel: "Government",
          weightPercent: 18,
        },
      ],
    };
    const change = buildChangeIntelligenceSummary({ previous, current });
    const companion = buildCompanionReview("monthly", {
      now: new Date("2026-07-31T12:00:00.000Z"),
      holdingCount: 2,
      monthSeries: [
        {
          date: "2026-07-01",
          portfolioValue: 10_000,
          netContributions: null,
          investmentReturn: null,
        },
        {
          date: "2026-07-31",
          portfolioValue: 10_200,
          netContributions: null,
          investmentReturn: null,
        },
      ],
    });
    const review = buildPeriodIntelligenceReview({
      kind: "monthly",
      companion,
      change,
      snapshotCount: 2,
      intelligenceDepth: "complete",
    });
    const blob = [
      review.changed?.headline,
      review.matters?.headline,
      review.freeHeadline,
      ...(review.changed?.evidence ?? []),
    ]
      .join(" ")
      .toLowerCase();
    expect(blob).toMatch(/fixed income/);
    const free = applyPeriodIntelligenceDepth(review, "free");
    expect(free.changed?.headline.toLowerCase()).toMatch(/fixed income|changed/);
  });

  it("Q1 can mention a fixed-income offset when attribution supports it", () => {
    const q1 = buildWhatHappenedQuestion({
      scope: "all",
      holdings: [
        holding({
          symbol: "VWCE",
          providerSymbol: "VWCE.XETRA",
          quantity: 80,
          currentPrice: 90,
          previousClose: 100,
          changePercent: -10,
        }),
        holding({
          symbol: "IBTM",
          name: "iShares USD Treasury Bond ETF",
          quantity: 20,
          currentPrice: 103,
          previousClose: 100,
          changePercent: 3,
        }),
      ],
    });
    expect(q1.support).toMatch(/offset part of/i);
  });
});

describe("fixed-income cost and honesty guards", () => {
  it("17. adds no new EODHD, OpenAI, or polling path", () => {
    const files = [
      ...listFiles("lib/services/classification", ".ts"),
      "lib/services/scenarioRelevance/selectRelevantPortfolioScenarios.ts",
      "lib/services/scenarioEngine/scenarios.ts",
      "lib/services/resilience/factors.ts",
      "lib/services/fourQuestions/buildWhatHappened.ts",
      "lib/services/fourQuestions/buildWhatMattersNow.ts",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/openai|setInterval|new cron|executeEodhdApiCall/i);
      if (file.includes("classifyHoldingExposure")) {
        expect(source).not.toMatch(/fetch\(/);
        expect(source).not.toMatch(/eodhd/i);
      }
      if (file.includes("classifyFixedIncome")) {
        expect(source).not.toMatch(/fetch\(/);
        expect(source).not.toMatch(/executeEodhdApiCall/i);
      }
    }
  });

  it("does not treat STRC income ETP as a bond", () => {
    const result = classifyHoldingExposure(
      holding({ symbol: "STRC", providerSymbol: "STRC.AS" }),
    );
    expect(result.normalizedGroupId).toBe("other_unclassified");
  });
});
