import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import { CHANGE_INTELLIGENCE_THRESHOLDS } from "@/lib/services/changeIntelligence/config";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import { buildFourQuestions } from "@/lib/services/fourQuestions";
import {
  applyPortfolioChangeAccess,
  buildPortfolioChangeAttention,
  NOTHING_IMPORTANT_CHANGED_COPY,
  PORTFOLIO_CHANGE_MAX_SECONDARY,
  resolveSmartAlertsAccessMode,
  toAlertCandidate,
} from "@/lib/services/portfolioChangeDetection";
import { resolveProductAccess } from "@/lib/services/productAccess";
import { RESILIENCE_PROHIBITED_PATTERNS } from "@/lib/services/resilience/wording";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function holding(
  partial: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    name: partial.name ?? partial.symbol,
    purchasePrice: partial.purchasePrice ?? partial.currentPrice,
    currency: "EUR",
    assetType: partial.assetType ?? "investment",
    previousClose: partial.previousClose ?? partial.currentPrice,
    ...partial,
  };
}

function newsItem(
  overrides: Partial<NewsContentItem> &
    Pick<NewsContentItem, "id" | "title" | "matchedSymbols">,
): NewsContentItem {
  return {
    sourceName: "Test Wire",
    sourceType: "news",
    canonicalUrl: `https://example.test/${overrides.id}`,
    thumbnailUrl: null,
    publishedAt: "2026-08-19T07:00:00.000Z",
    description: overrides.title,
    summary: overrides.title,
    interpretation: "",
    impactLevel: "High Impact",
    matchedHoldingIds: overrides.matchedHoldingIds ?? [],
    matchedSymbols: overrides.matchedSymbols,
    matchedHoldings: overrides.matchedHoldings ?? [],
    relevanceLabel: null,
    category: "crypto",
    marketCategory: "crypto",
    contentTypeLabel: "News",
    fetchedAt: "2026-08-19T08:00:00.000Z",
    relevanceScore: overrides.relevanceScore ?? 24,
    ...overrides,
  };
}

const goal: GoalSettings = {
  targetValue: 750_000,
  targetYear: 2035,
  monthlyContribution: 500,
  expectedAnnualReturn: 20,
};

const NOW = "2026-08-19T08:00:00.000Z";

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 100_000,
      coverage: {
        holdingCount: 3,
        valuedHoldingCount: 3,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [
      {
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        value: 47_000,
        weightPercent: 47,
        assetType: "crypto",
        providerSymbol: "BTC-USD",
      },
      {
        id: "vwce",
        symbol: "VWCE",
        name: "VWCE",
        quantity: 10,
        value: 30_000,
        weightPercent: 30,
        assetType: "investment",
        providerSymbol: null,
      },
    ],
    exposure: {
      groups: [
        { groupId: "crypto", displayLabel: "Crypto", weightPercent: 47 },
        {
          groupId: "broad_equity",
          displayLabel: "Broad equity",
          weightPercent: 30,
        },
      ],
      classifiedHoldingCount: 3,
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 47,
      hhi: 0.35,
      concentrationLevel: "highly_concentrated",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 750_000,
      targetYear: 2035,
      progressPercent: 11.3,
      monthlyContribution: 500,
      expectedAnnualReturnPercent: 20,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 90,
      bandId: "strong",
      bandLabel: "Strong resilience",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 80 }],
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin drawdown",
        estimatedPortfolioImpactPercent: 4,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Partial<IntelligenceStateSnapshot> & {
    payload?: Partial<IntelligenceStatePayload> & {
      concentration?: Partial<IntelligenceStatePayload["concentration"]>;
      goal?: IntelligenceStatePayload["goal"];
      resilience?: IntelligenceStatePayload["resilience"];
      holdings?: IntelligenceStatePayload["holdings"];
      exposure?: IntelligenceStatePayload["exposure"];
    };
  } = {},
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  const payload: IntelligenceStatePayload = {
    ...base,
    ...overrides.payload,
    portfolio: overrides.payload?.portfolio ?? base.portfolio,
    holdings: overrides.payload?.holdings ?? base.holdings,
    exposure: overrides.payload?.exposure ?? base.exposure,
    concentration: {
      ...base.concentration,
      ...overrides.payload?.concentration,
    },
    goal:
      overrides.payload && "goal" in overrides.payload
        ? overrides.payload.goal ?? null
        : base.goal,
    resilience:
      overrides.payload && "resilience" in overrides.payload
        ? overrides.payload.resilience ?? null
        : base.resilience,
    scorecard: overrides.payload?.scorecard ?? base.scorecard,
  };
  return {
    id: overrides.id ?? "snap-1",
    userId: overrides.userId ?? "user-1",
    portfolioId: overrides.portfolioId ?? "port-1",
    schemaVersion: 1,
    capturedAt: overrides.capturedAt ?? "2026-08-17T08:00:00.000Z",
    snapshotKind: overrides.snapshotKind ?? "weekly",
    periodKey: overrides.periodKey ?? "2026-W33",
    periodStart: overrides.periodStart ?? "2026-08-10",
    periodEnd: overrides.periodEnd ?? "2026-08-16",
    timezone: overrides.timezone ?? "Europe/Amsterdam",
    payload,
  };
}

const portfolio47: StoredPortfolioHolding[] = [
  holding({
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    currentPrice: 47_000,
    assetType: "crypto",
    change24hPercent: 0,
  }),
  holding({
    id: "vwce",
    symbol: "VWCE",
    name: "VWCE",
    quantity: 10,
    currentPrice: 3_000,
    previousClose: 3_000,
  }),
  holding({
    id: "cash",
    symbol: "EUR",
    name: "EUR cash",
    quantity: 23_000,
    currentPrice: 1,
    assetType: "cash",
  }),
];

const portfolio52: StoredPortfolioHolding[] = [
  holding({
    id: "btc",
    symbol: "BTC",
    name: "Bitcoin",
    quantity: 1,
    currentPrice: 52_000,
    assetType: "crypto",
    change24hPercent: 0,
  }),
  holding({
    id: "vwce",
    symbol: "VWCE",
    name: "VWCE",
    quantity: 10,
    currentPrice: 3_000,
    previousClose: 3_000,
  }),
  holding({
    id: "cash",
    symbol: "EUR",
    name: "EUR cash",
    quantity: 18_000,
    currentPrice: 1,
    assetType: "cash",
  }),
];

function attentionBlob(
  result: ReturnType<typeof buildPortfolioChangeAttention>,
): string {
  const signals = [result.primary, ...result.secondary, ...result.ranked];
  return [
    result.headline,
    result.support,
    ...result.limitations,
    ...signals.flatMap((signal) =>
      signal
        ? [
            signal.title,
            signal.summary,
            signal.whyItMatters,
            signal.evidence.whyAmISeeingThis,
            signal.evidence.whatChanged,
            signal.evidence.whyItMattersToPortfolio,
            signal.evidence.howCalculated,
            signal.evidence.confidenceNote,
            ...signal.limitations,
          ]
        : [],
    ),
  ].join("\n");
}

describe("Phase 13 portfolio change detection", () => {
  it("detects a material concentration change from live vs last snapshot", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    expect(result.status).toBe("attention");
    expect(result.structuralHistoryAvailable).toBe(true);
    expect(result.window.label).toMatch(/^Compared with .+ snapshot$/);
    expect(result.window.label).not.toMatch(/Last opened/i);
    expect(
      result.ranked.some(
        (row) =>
          row.type === "concentration_changed" ||
          row.type === "largest_holding_changed",
      ),
    ).toBe(true);
    const concentration = result.ranked.find(
      (row) => row.type === "concentration_changed",
    );
    expect(concentration?.previousValue).toBe(47);
    expect(concentration?.currentValue).toBe(52);
    expect(Math.abs(concentration?.delta ?? 0)).toBeGreaterThanOrEqual(
      CHANGE_INTELLIGENCE_THRESHOLDS.concentrationPp,
    );
    expect(concentration?.evidence.howCalculated).toMatch(/Change Intelligence/i);
  });

  it("suppresses a tiny concentration change", () => {
    const previous = snapshot({
      payload: {
        concentration: {
          largestHoldingId: "btc",
          largestHoldingSymbol: "BTC",
          largestHoldingName: "Bitcoin",
          largestHoldingWeightPercent: 52.4,
          hhi: 0.35,
          concentrationLevel: "highly_concentrated",
        },
        exposure: {
          groups: [
            { groupId: "crypto", displayLabel: "Crypto", weightPercent: 52.4 },
            {
              groupId: "broad_equity",
              displayLabel: "Broad equity",
              weightPercent: 30,
            },
          ],
          classifiedHoldingCount: 3,
          unclassifiedHoldingCount: 0,
          coverageLabel: null,
        },
        goal: {
          goalId: "goal-1",
          targetValue: 750_000,
          targetYear: 2035,
          progressPercent: 13.3,
          monthlyContribution: 500,
          expectedAnnualReturnPercent: 20,
          portfolioValueAvailable: true,
        },
        resilience: null,
        holdings: [
          {
            id: "btc",
            symbol: "BTC",
            name: "Bitcoin",
            quantity: 1,
            value: 52_400,
            weightPercent: 52.4,
            assetType: "crypto",
            providerSymbol: "BTC-USD",
          },
          {
            id: "vwce",
            symbol: "VWCE",
            name: "VWCE",
            quantity: 10,
            value: 30_000,
            weightPercent: 30,
            assetType: "investment",
            providerSymbol: null,
          },
        ],
      },
    });
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 52_400,
        assetType: "crypto",
        change24hPercent: 0,
      }),
      holding({
        id: "vwce",
        symbol: "VWCE",
        quantity: 10,
        currentPrice: 3_000,
        previousClose: 3_000,
      }),
      holding({
        id: "cash",
        symbol: "EUR",
        quantity: 17_600,
        currentPrice: 1,
        assetType: "cash",
      }),
    ];
    const result = buildPortfolioChangeAttention({
      holdings,
      goal,
      hasSavedGoal: true,
      snapshots: [previous],
      now: NOW,
    });
    expect(
      result.ranked.some((row) => row.type === "concentration_changed"),
    ).toBe(false);
  });

  it("is honest when there is no stored snapshot and no daily prices", () => {
    const result = buildPortfolioChangeAttention({
      holdings: [
        holding({
          id: "vwce",
          symbol: "VWCE",
          quantity: 10,
          currentPrice: 100,
          previousClose: undefined,
        }),
      ],
      snapshots: [],
      now: NOW,
    });
    expect(result.status).toBe("insufficient_history");
    expect(result.primary).toBeNull();
    expect(result.headline).toMatch(/enough comparable history/i);
  });

  it("says nothing important changed when history exists and moves are quiet", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio47,
      goal,
      hasSavedGoal: true,
      snapshots: [
        snapshot({
          payload: {
            goal: {
              goalId: "goal-1",
              targetValue: 750_000,
              targetYear: 2035,
              progressPercent: 13.3,
              monthlyContribution: 500,
              expectedAnnualReturnPercent: 20,
              portfolioValueAvailable: true,
            },
            resilience: null,
          },
        }),
      ],
      now: NOW,
    });
    expect(result.status).toBe("nothing_material");
    expect(result.headline).toBe(NOTHING_IMPORTANT_CHANGED_COPY);
    expect(result.support).toMatch(/broadly consistent with the latest comparable snapshot/);
    expect(result.primary).toBeNull();
    expect(result.secondary).toEqual([]);
  });

  it("ranks by portfolio impact, not article count — Bitcoin is not privileged", () => {
    const holdings = [
      holding({
        id: "aapl",
        symbol: "AAPL",
        name: "Apple",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 50,
        assetType: "crypto",
        change24hPercent: 0.2,
      }),
    ];
    const newsItems = Array.from({ length: 8 }, (_, index) =>
      newsItem({
        id: `btc-news-${index}`,
        title: `Bitcoin headline ${index}`,
        matchedSymbols: ["BTC"],
        relevanceScore: 30,
      }),
    );
    const result = buildPortfolioChangeAttention({
      holdings,
      snapshots: [],
      newsItems,
      now: NOW,
    });
    expect(result.status).toBe("attention");
    expect(result.primary?.holdingSymbol).toBe("AAPL");
    expect(result.primary?.type).toBe("holding_contribution");
    expect(
      result.ranked.some((row) => row.holdingSymbol === "BTC"),
    ).toBe(false);
  });

  it("can rank Bitcoin first when it is genuinely the most material move", () => {
    const holdings = [
      holding({
        id: "aapl",
        symbol: "AAPL",
        name: "Apple",
        quantity: 10,
        currentPrice: 101,
        previousClose: 100,
      }),
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 50_000,
        assetType: "crypto",
        change24hPercent: 10,
      }),
    ];
    const newsItems = Array.from({ length: 6 }, (_, index) =>
      newsItem({
        id: `aapl-news-${index}`,
        title: `Apple headline ${index}`,
        matchedSymbols: ["AAPL"],
        category: "equities",
        marketCategory: "equities",
        relevanceScore: 30,
      }),
    );
    const result = buildPortfolioChangeAttention({
      holdings,
      snapshots: [],
      newsItems,
      now: NOW,
    });
    expect(result.primary?.holdingSymbol).toBe("BTC");
    expect(Math.abs(result.primary?.portfolioImpactPp ?? 0)).toBeGreaterThan(1);
  });

  it("detects a material goal progress change", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio47,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    const goalChange = result.ranked.find(
      (row) => row.type === "goal_progress_changed",
    );
    expect(goalChange).toBeTruthy();
    expect(goalChange?.fourQuestionId).toBe("am_i_on_track");
    expect(goalChange?.destination.href).toMatch(/goal/);
  });

  it("detects a material concentration and exposure mix shift together", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    expect(
      result.ranked.some((row) => row.type === "exposure_mix_changed"),
    ).toBe(true);
    expect(
      result.ranked.some((row) => row.type === "concentration_changed"),
    ).toBe(true);
  });

  it("detects a material resilience and scenario sensitivity change", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    expect(
      result.ranked.some((row) => row.type === "resilience_changed"),
    ).toBe(true);
    expect(
      result.ranked.some(
        (row) => row.type === "scenario_sensitivity_changed",
      ),
    ).toBe(true);
  });

  it("handles null snapshots, missing news, and empty holdings", () => {
    const empty = buildPortfolioChangeAttention({
      holdings: [],
      snapshots: null,
      newsItems: null,
      now: NOW,
    });
    expect(empty.status).toBe("unavailable");
    expect(empty.primary).toBeNull();

    const missing = buildPortfolioChangeAttention({
      holdings: portfolio47,
      snapshots: undefined,
      newsItems: undefined,
      now: NOW,
    });
    expect(missing.primary).toBeNull();
    expect(missing.status === "nothing_material" || missing.status === "insufficient_history").toBe(
      true,
    );
  });

  it("includes explainability and confidence on every surfaced signal", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    expect(result.primary).toBeTruthy();
    for (const signal of [result.primary, ...result.secondary]) {
      if (!signal) continue;
      expect(signal.evidence.whyAmISeeingThis.length).toBeGreaterThan(12);
      expect(signal.evidence.whatChanged.length).toBeGreaterThan(8);
      expect(signal.evidence.whyItMattersToPortfolio.length).toBeGreaterThan(12);
      expect(signal.evidence.howCalculated.length).toBeGreaterThan(12);
      expect(signal.confidence).toMatch(/high|moderate|limited/);
    }
  });

  it("caps attention at one primary and two secondary signals", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    expect(result.primary ? 1 : 0).toBeLessThanOrEqual(1);
    expect(result.secondary.length).toBeLessThanOrEqual(
      PORTFOLIO_CHANGE_MAX_SECONDARY,
    );
    expect((result.primary ? 1 : 0) + result.secondary.length).toBeLessThanOrEqual(
      3,
    );
  });

  it("does not use buy/sell/hold/rebalance advice language", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    const blob = attentionBlob(result);
    for (const pattern of RESILIENCE_PROHIBITED_PATTERNS) {
      expect(blob).not.toMatch(pattern);
    }
  });

  it("does not add OpenAI, EODHD, or polling loops", () => {
    const files = [
      "lib/services/portfolioChangeDetection/buildPortfolioChangeAttention.ts",
      "lib/services/portfolioChangeDetection/mapSignals.ts",
      "lib/services/portfolioChangeDetection/access.ts",
      "lib/services/portfolioChangeDetection/alertFoundation.ts",
      "components/dashboard/NewAndNotableSection.tsx",
      "app/dashboard/page.tsx",
    ];
    const blob = files.map((file) => read(file)).join("\n");
    expect(blob).not.toMatch(/openai|OpenAI|chat\.completions/i);
    expect(blob).not.toMatch(/eodhd|fetchEodhd/i);
    expect(blob).not.toMatch(/setInterval\s*\(|cron\/smart-alerts/);
    expect(read("lib/services/portfolioChangeDetection/buildPortfolioChangeAttention.ts")).not.toMatch(
      /lastCheckMemory/,
    );
  });

  it("keeps email and push delivery unready in the alert foundation", () => {
    const result = buildPortfolioChangeAttention({
      holdings: [
        holding({
          id: "aapl",
          symbol: "AAPL",
          name: "Apple",
          quantity: 10,
          currentPrice: 110,
          previousClose: 100,
        }),
      ],
      snapshots: [],
      now: NOW,
    });
    expect(result.primary).toBeTruthy();
    const candidate = toAlertCandidate(result.primary!);
    expect(candidate.channels.find((row) => row.channel === "in_app")?.ready).toBe(
      true,
    );
    expect(candidate.channels.find((row) => row.channel === "email")?.ready).toBe(
      false,
    );
    expect(candidate.channels.find((row) => row.channel === "push")?.ready).toBe(
      false,
    );
  });

  it("Free shows only the strongest change; Complete and Demo keep the full set", () => {
    const raw = buildPortfolioChangeAttention({
      holdings: portfolio52,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      now: NOW,
    });
    const free = applyPortfolioChangeAccess(
      raw,
      resolveSmartAlertsAccessMode(
        resolveProductAccess({ exampleKind: "none" }),
      ),
    );
    const complete = applyPortfolioChangeAccess(
      raw,
      resolveSmartAlertsAccessMode(
        resolveProductAccess({ exampleKind: "converted" }),
      ),
    );
    const demo = applyPortfolioChangeAccess(
      raw,
      resolveSmartAlertsAccessMode(
        resolveProductAccess({ exampleKind: "active", trialKind: "demo" }),
      ),
    );
    expect(free.secondary).toEqual([]);
    expect(complete.secondary.length).toBe(raw.secondary.length);
    expect(demo.secondary.length).toBe(raw.secondary.length);
    expect(free.support).toMatch(/Complete shows/i);
  });

  it("Demo ignores stored snapshots and uses real demo holdings only", () => {
    const result = buildPortfolioChangeAttention({
      holdings: portfolio47,
      goal,
      hasSavedGoal: true,
      snapshots: [snapshot()],
      isDemo: true,
      now: NOW,
    });
    expect(result.structuralHistoryAvailable).toBe(false);
    expect(
      result.ranked.some((row) => row.windowKind === "live_vs_snapshot"),
    ).toBe(false);
  });

  it("does not rewrite Four Questions glance answers when attaching change items", () => {
    const holdings = [
      holding({
        id: "aapl",
        symbol: "AAPL",
        name: "Apple",
        quantity: 10,
        currentPrice: 110,
        previousClose: 100,
      }),
    ];
    const progress = deriveGoalProgress({
      holdings,
      goal,
      hasSavedGoal: true,
    });
    const attention = buildPortfolioChangeAttention({
      holdings,
      snapshots: [],
      now: NOW,
    });
    const without = buildFourQuestions({
      holdings,
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
    });
    const withChange = buildFourQuestions({
      holdings,
      goal,
      hasSavedGoal: true,
      goalProgress: progress,
      portfolioChangeAttention: attention,
    });
    expect(withChange.questions[0]?.answer).toBe(without.questions[0]?.answer);
    expect(
      withChange.questions[0]?.expandItems.some((item) =>
        item.id.startsWith("change-attention-"),
      ),
    ).toBe(true);
  });
});

describe("Phase 13 UI wiring", () => {
  it("renders selected personal intelligence on Dashboard from existing change attention", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const ui = read("components/dashboard/DashboardPersonalIntelligence.tsx");
    expect(dashboard).toContain("DashboardPersonalIntelligence");
    expect(dashboard).toContain("buildPortfolioChangeAttention");
    expect(dashboard).toContain("selectDashboardPersonalIntelligence");
    expect(ui).toContain("Personal intelligence");
    expect(ui).not.toContain("Since your last check");
    expect(ui).not.toContain("Last opened");
    expect(ui).toContain("min-h-11");
    expect(ui).not.toMatch(/buy|sell|rebalance/i);
  });
});
