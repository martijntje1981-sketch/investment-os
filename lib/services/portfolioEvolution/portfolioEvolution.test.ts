/**
 * Portfolio Evolution fixtures A–S.
 * Truth-first: no reconstructed trades, no invented allocation series.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { IntelligenceStatePayload, IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { buildFourQuestions } from "@/lib/services/fourQuestions";
import { deriveGoalProgress } from "@/lib/client/useGoalProgress";
import {
  buildEvolutionCompactCard,
  buildEvolutionNowState,
  buildPortfolioEvolutionTimeline,
} from "@/lib/services/portfolioEvolution";
import type { EvolutionNowState } from "@/lib/services/portfolioEvolution/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function read(relativePath: string) {
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
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
    priceDataStatus: "live",
    ...partial,
  };
}

function entry(
  partial: Partial<PortfolioContributionEntry> &
    Pick<PortfolioContributionEntry, "id" | "entryType" | "baseAmount" | "entryDate">,
): PortfolioContributionEntry {
  return {
    portfolioId: "p1",
    userId: "u1",
    amount: partial.baseAmount,
    currency: "EUR",
    baseCurrency: "EUR",
    fxRateUsed: 1,
    note: null,
    source: "manual",
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
    createdAt: `${partial.entryDate}T12:00:00.000Z`,
    updatedAt: `${partial.entryDate}T12:00:00.000Z`,
    ...partial,
  };
}

function nowState(overrides: Partial<EvolutionNowState> = {}): EvolutionNowState {
  return {
    asOfDate: "2026-08-20",
    portfolioValue: 127_000,
    portfolioValueAvailable: true,
    exposure: [
      { groupId: "crypto", displayLabel: "Crypto", weightPercent: 54 },
      { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 38 },
      { groupId: "cash", displayLabel: "Cash", weightPercent: 8 },
    ],
    largestHoldingSymbol: "BTC",
    largestHoldingName: "Bitcoin",
    largestHoldingWeightPercent: 55,
    bitcoinDependent: true,
    scenarioId: "bitcoin_minus_20",
    scenarioName: "Bitcoin −20%",
    scenarioImpactPercent: -10.8,
    resilienceScore: 42,
    goalProgressPercent: 16.9,
    ...overrides,
  };
}

function thenState(overrides: Partial<EvolutionNowState> = {}): EvolutionNowState {
  return nowState({
    asOfDate: "2026-05-22",
    portfolioValue: 108_000,
    exposure: [
      { groupId: "crypto", displayLabel: "Crypto", weightPercent: 43 },
      { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 50 },
      { groupId: "cash", displayLabel: "Cash", weightPercent: 7 },
    ],
    largestHoldingWeightPercent: 46,
    scenarioImpactPercent: -8.6,
    goalProgressPercent: 14.4,
    ...overrides,
  });
}

function snapshotFromState(
  state: EvolutionNowState,
  extras?: Partial<IntelligenceStateSnapshot>,
): IntelligenceStateSnapshot {
  const payload: IntelligenceStatePayload = {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: state.portfolioValue,
      coverage: {
        holdingCount: 3,
        valuedHoldingCount: 3,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: state.portfolioValueAvailable,
      },
    },
    holdings: state.largestHoldingSymbol
      ? [
          {
            id: state.largestHoldingSymbol.toLowerCase(),
            symbol: state.largestHoldingSymbol,
            name: state.largestHoldingName ?? state.largestHoldingSymbol,
            quantity: 1,
            value: 1,
            weightPercent: state.largestHoldingWeightPercent ?? 0,
            assetType: "crypto",
            providerSymbol: null,
          },
        ]
      : [],
    exposure: {
      groups: state.exposure,
      classifiedHoldingCount: 3,
      unclassifiedHoldingCount:
        state.exposure.find((row) => row.groupId === "other_unclassified")
          ?.weightPercent ?? 0 ? 1 : 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: state.largestHoldingSymbol?.toLowerCase() ?? null,
      largestHoldingSymbol: state.largestHoldingSymbol,
      largestHoldingName: state.largestHoldingName,
      largestHoldingWeightPercent: state.largestHoldingWeightPercent,
      hhi: 0.4,
      concentrationLevel: "highly_concentrated",
    },
    goal: {
      goalId: "g1",
      targetValue: 750_000,
      targetYear: 2035,
      progressPercent: state.goalProgressPercent,
      monthlyContribution: 400,
      expectedAnnualReturnPercent: 7,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: state.resilienceScore,
      bandId: "sensitive",
      bandLabel: "Sensitive",
      primaryDriver: "concentration",
      factors: [],
      mostSensitive:
        state.scenarioId && state.scenarioName && state.scenarioImpactPercent != null
          ? {
              scenarioId: "bitcoin_minus_20",
              scenarioName: state.scenarioName,
              estimatedPortfolioImpactPercent: state.scenarioImpactPercent,
            }
          : null,
    },
    scorecard: null,
  };

  return {
    id: extras?.id ?? `snap-${state.asOfDate}`,
    userId: "u1",
    portfolioId: "p1",
    schemaVersion: 1,
    capturedAt: `${state.asOfDate}T18:00:00.000Z`,
    snapshotKind: extras?.snapshotKind ?? "weekly",
    periodKey: extras?.periodKey ?? state.asOfDate,
    periodStart: extras?.periodStart ?? state.asOfDate,
    periodEnd: state.asOfDate,
    timezone: "Europe/Amsterdam",
    payload: {
      ...payload,
      resilience: {
        ...payload.resilience!,
        mostSensitive:
          state.scenarioId && state.scenarioName && state.scenarioImpactPercent != null
            ? {
                scenarioId: "bitcoin_minus_20",
                scenarioName: state.scenarioName,
                estimatedPortfolioImpactPercent: state.scenarioImpactPercent,
              }
            : null,
      },
    },
    ...extras,
  };
}

function series(from: string, to: string, start: number, end: number): PortfolioPerformancePoint[] {
  const points: PortfolioPerformancePoint[] = [];
  let cursor = from;
  const startMs = Date.parse(`${from}T00:00:00.000Z`);
  const endMs = Date.parse(`${to}T00:00:00.000Z`);
  const days = Math.max(Math.round((endMs - startMs) / 86_400_000), 1);
  for (let index = 0; index <= days; index += 7) {
    const date = new Date(startMs + index * 86_400_000).toISOString().slice(0, 10);
    const t = index / days;
    points.push({
      date,
      portfolioValue: start + (end - start) * t,
      netContributions: null,
      investmentReturn: null,
    });
    cursor = date;
  }
  if (cursor !== to) {
    points.push({
      date: to,
      portfolioValue: end,
      netContributions: null,
      investmentReturn: null,
    });
  }
  return points;
}

describe("Portfolio Evolution", () => {
  const contribution = entry({
    id: "c1",
    entryType: "contribution",
    baseAmount: 400,
    entryDate: "2026-07-15",
  });
  const withdrawal = entry({
    id: "w1",
    entryType: "withdrawal",
    baseAmount: 1000,
    entryDate: "2026-06-10",
  });
  const chart = series("2026-05-20", "2026-08-20", 108_000, 127_000);

  it("A. contribution increases portfolio value as a recorded ledger effect", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [snapshotFromState(thenState()), snapshotFromState(nowState())],
    });
    const event = timeline.fundingEvents.find((row) => row.id === "c1");
    expect(event?.amount).toBe(400);
    expect(event?.immediateEffectLabel).toBe("Added to your portfolio.");
    expect(timeline.conclusion.primary).not.toMatch(/became Bitcoin/i);
  });

  it("B. withdrawal decreases portfolio value as a recorded ledger effect", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [withdrawal],
      snapshots: [snapshotFromState(thenState())],
    });
    const event = timeline.fundingEvents.find((row) => row.id === "w1");
    expect(event?.amount).toBe(-1000);
    expect(event?.immediateEffectLabel).toBe("Removed from your portfolio.");
  });

  it("C. contribution cash allocation coincidence only when snapshots prove it", () => {
    const beforeCash = snapshotFromState(
      thenState({
        asOfDate: "2026-07-10",
        exposure: [
          { groupId: "crypto", displayLabel: "Crypto", weightPercent: 50 },
          { groupId: "cash", displayLabel: "Cash", weightPercent: 2.1 },
        ],
      }),
    );
    const afterCash = snapshotFromState(
      nowState({
        asOfDate: "2026-07-20",
        exposure: [
          { groupId: "crypto", displayLabel: "Crypto", weightPercent: 48 },
          { groupId: "cash", displayLabel: "Cash", weightPercent: 5.8 },
        ],
      }),
    );
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [beforeCash, afterCash],
    });
    expect(timeline.fundingEvents[0]?.allocationCoincidence).toEqual({
      groupId: "cash",
      groupLabel: "Cash",
      fromPercent: 2.1,
      toPercent: 5.8,
    });
  });

  it("D. contribution is not attributed to a holding without destination evidence", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [snapshotFromState(thenState())],
    });
    expect(timeline.fundingEvents[0]?.recordedDestinationLabel).toBeNull();
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).toBe(
      "Added to your portfolio.",
    );
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).not.toMatch(/cash/i);
    expect(JSON.stringify(timeline)).not.toMatch(/became Bitcoin/i);
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).not.toMatch(/Bitcoin/i);
  });

  it("E. snapshot value change mainly coincides with market movement", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [snapshotFromState(thenState()), snapshotFromState(nowState())],
      contributionBasisReliable: true,
    });
    expect(timeline.fundingVsMarket?.valueChange).toBe(19_000);
    expect(timeline.fundingVsMarket?.recordedNetFunding).toBe(400);
    expect(timeline.fundingVsMarket?.investmentMovementApproximate).toBe(18_600);
    expect(timeline.fundingVsMarket?.copy).toMatch(/Recorded contributions explain/i);
    expect(timeline.fundingVsMarket?.copy).not.toMatch(/Only €/i);
  });

  it("F. recorded contribution can dominate a small snapshot value change", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({ portfolioValue: 108_500 }),
      chartPoints: series("2026-05-20", "2026-08-20", 108_000, 108_500),
      entries: [
        entry({
          id: "big",
          entryType: "contribution",
          baseAmount: 400,
          entryDate: "2026-07-15",
        }),
      ],
      snapshots: [
        snapshotFromState(thenState({ portfolioValue: 108_000 })),
        snapshotFromState(nowState({ portfolioValue: 108_500 })),
      ],
    });
    expect(timeline.fundingVsMarket?.recordedNetFunding).toBe(400);
    expect(timeline.fundingVsMarket?.investmentMovementApproximate).toBe(100);
  });

  it("G. crypto share materially increases", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
    });
    const crypto = timeline.beforeNow.find((row) => row.kind === "crypto_exposure");
    expect(crypto?.fromLabel).toBe("43%");
    expect(crypto?.toLabel).toBe("54%");
    expect(timeline.conclusion.primary).toMatch(/Bitcoin-dependent|crypto exposure increased/i);
  });

  it("H. concentration increases", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
    });
    const largest = timeline.beforeNow.find((row) => row.kind === "largest_holding");
    expect(largest?.deltaLabel).toMatch(/\+9pp/);
  });

  it("I. portfolio becomes more balanced", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({
        portfolioValue: 127_000,
        bitcoinDependent: false,
        largestHoldingSymbol: "VWCE",
        largestHoldingName: "FTSE All-World",
        largestHoldingWeightPercent: 28,
        scenarioId: null,
        scenarioName: null,
        scenarioImpactPercent: null,
        exposure: [
          { groupId: "crypto", displayLabel: "Crypto", weightPercent: 20 },
          { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 65 },
          { groupId: "cash", displayLabel: "Cash", weightPercent: 15 },
        ],
      }),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [
        snapshotFromState(
          thenState({
            largestHoldingSymbol: "BTC",
            largestHoldingName: "Bitcoin",
            largestHoldingWeightPercent: 46,
            scenarioId: null,
            scenarioName: null,
            scenarioImpactPercent: null,
            exposure: [
              { groupId: "crypto", displayLabel: "Crypto", weightPercent: 43 },
              { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 50 },
              { groupId: "cash", displayLabel: "Cash", weightPercent: 7 },
            ],
          }),
        ),
      ],
    });
    expect(timeline.conclusion.primary).toMatch(/more balanced/i);
  });

  it("J. scenario sensitivity increases", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
    });
    const scenario = timeline.beforeNow.find((row) => row.kind === "scenario_sensitivity");
    expect(scenario?.fromLabel).toMatch(/8\.6/);
    expect(scenario?.toLabel).toMatch(/10\.8/);
    expect(timeline.structuralMarkers.some((row) => row.kind === "scenario_sensitivity_changed")).toBe(
      true,
    );
  });

  it("K. insufficient allocation history omits mix visual", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({ exposure: [] }),
      chartPoints: chart,
      snapshots: [],
    });
    expect(timeline.mixCheckpoints).toBeNull();
    expect(timeline.mixHistoryBlocked).toBe(true);
    expect(timeline.mixHistoryBlockReason).toBe("Historical allocation persistence required.");
  });

  it("L. incomplete contribution history uses explain-not-only copy", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [snapshotFromState(thenState())],
      contributionBasisReliable: false,
    });
    expect(timeline.fundingVsMarket?.copy).toMatch(/Recorded contributions explain/);
    expect(timeline.fundingVsMarket?.copy).not.toMatch(/^Only /);
    expect(timeline.fundingVsMarket?.contributionBasisReliable).toBe(false);
  });

  it("M. sparse value history is kept sparse", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: [
        { date: "2026-05-22", portfolioValue: 108_000, netContributions: null, investmentReturn: null },
        { date: "2026-08-20", portfolioValue: 127_000, netContributions: null, investmentReturn: null },
      ],
      snapshots: [snapshotFromState(thenState())],
      timeframe: "90D",
    });
    expect(timeline.valueSeries).toHaveLength(2);
    expect(timeline.hasValueSeries).toBe(true);
  });

  it("N. no material structural change stays quiet", () => {
    const stable = nowState({
      portfolioValue: 108_200,
      exposure: thenState().exposure,
      largestHoldingWeightPercent: 46,
      scenarioImpactPercent: -8.6,
    });
    const timeline = buildPortfolioEvolutionTimeline({
      now: stable,
      chartPoints: series("2026-05-20", "2026-08-20", 108_000, 108_200),
      snapshots: [snapshotFromState(thenState({ portfolioValue: 108_000 }))],
    });
    expect(timeline.conclusion.material).toBe(false);
    expect(timeline.conclusion.primary).toMatch(/stable|No material structural change/i);
    expect(timeline.beforeNow.filter((row) => row.kind !== "value").length).toBe(0);
  });

  it("O. current and history dates reconcile without fabricating missing days", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({ asOfDate: "2026-08-20" }),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState({ asOfDate: "2026-05-22" }))],
    });
    expect(timeline.valueSeries.every((point) => point.date <= "2026-08-20")).toBe(true);
    expect(timeline.mixCheckpoints?.at(-1)?.date).toBe("2026-08-20");
    expect(timeline.mixCheckpoints?.at(-1)?.sourceQuality).toBe("current");
  });

  it("P. unclassified remains visible when it changes", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({
        largestHoldingWeightPercent: 40,
        scenarioId: null,
        scenarioName: null,
        scenarioImpactPercent: null,
        exposure: [
          { groupId: "crypto", displayLabel: "Crypto", weightPercent: 40 },
          { groupId: "other_unclassified", displayLabel: "Other / Unclassified", weightPercent: 18 },
          { groupId: "cash", displayLabel: "Cash", weightPercent: 42 },
        ],
      }),
      snapshots: [
        snapshotFromState(
          thenState({
            largestHoldingWeightPercent: 40,
            scenarioId: null,
            scenarioName: null,
            scenarioImpactPercent: null,
            exposure: [
              { groupId: "crypto", displayLabel: "Crypto", weightPercent: 40 },
              { groupId: "other_unclassified", displayLabel: "Other / Unclassified", weightPercent: 5 },
              { groupId: "cash", displayLabel: "Cash", weightPercent: 55 },
            ],
          }),
        ),
      ],
    });
    expect(timeline.beforeNow.some((row) => row.kind === "unclassified")).toBe(true);
  });

  it("Q. fixed income and precious metals remain distinct", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({
        bitcoinDependent: false,
        largestHoldingSymbol: "VWCE",
        largestHoldingName: "All-World",
        largestHoldingWeightPercent: 30,
        scenarioId: null,
        scenarioName: null,
        scenarioImpactPercent: null,
        exposure: [
          { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 60 },
          { groupId: "fixed_income", displayLabel: "Fixed income", weightPercent: 20 },
          { groupId: "precious_metals", displayLabel: "Precious metals", weightPercent: 12 },
          { groupId: "cash", displayLabel: "Cash", weightPercent: 8 },
        ],
      }),
      snapshots: [
        snapshotFromState(
          thenState({
            largestHoldingSymbol: "VWCE",
            largestHoldingName: "All-World",
            largestHoldingWeightPercent: 70,
            scenarioId: null,
            scenarioName: null,
            scenarioImpactPercent: null,
            exposure: [
              { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 92 },
              { groupId: "cash", displayLabel: "Cash", weightPercent: 8 },
            ],
          }),
        ),
      ],
    });
    expect(timeline.beforeNow.some((row) => row.kind === "fixed_income")).toBe(true);
    expect(timeline.beforeNow.some((row) => row.kind === "precious_metals")).toBe(true);
    expect(timeline.structuralMarkers.some((row) => row.kind === "fixed_income_introduced")).toBe(true);
    expect(timeline.structuralMarkers.some((row) => row.kind === "precious_metals_introduced")).toBe(true);
    expect(timeline.mixCheckpoints?.[0]?.groups.some((row) => row.groupId === "fixed_income")).toBeDefined();
  });

  it("R. does not add duplicate performance requests on Dashboard Evolution card", () => {
    const dashboard = read("app/dashboard/page.tsx");
    const card = read("components/portfolioEvolution/DashboardPortfolioEvolutionCard.tsx");
    const section = read("components/portfolioEvolution/PortfolioEvolutionSection.tsx");
    expect(card).not.toContain("usePortfolioPerformanceHistory");
    expect(card).not.toContain("/api/prices");
    expect(dashboard).not.toContain("DashboardPortfolioEvolutionCard");
    expect(dashboard).toContain("DashboardSecondaryNav");
    expect(section).toContain("usePortfolioPerformanceHistory");
    expect(section).toContain("historyEnabled");
  });

  it("S. Evolution module introduces no paid API, OpenAI, or EODHD client calls", () => {
    const files = [
      "lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline.ts",
      "lib/services/portfolioEvolution/buildEvolutionConclusion.ts",
      "lib/services/portfolioEvolution/buildEvolutionNowState.ts",
      "components/portfolioEvolution/PortfolioEvolutionSection.tsx",
    ];
    for (const file of files) {
      const source = read(file);
      expect(source).not.toMatch(/openai|OpenAI|eodhd|EODHD|fetch\(/i);
    }
  });

  it("does not add a Value/Performance toggle when series cannot support it", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution],
      snapshots: [snapshotFromState(thenState())],
    });
    expect(timeline.performanceToggleAvailable).toBe(false);
  });

  it("Free keeps 30D, one before/now metric, and omits mix", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      timeframe: "1Y",
      intelligenceDepth: "free",
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
      entries: [contribution],
    });
    expect(timeline.timeframe).toBe("30D");
    expect(timeline.beforeNow.length).toBeLessThanOrEqual(1);
    expect(timeline.mixCheckpoints).toBeNull();
    expect(timeline.fundingVsMarket?.investmentMovementApproximate).toBeNull();
  });

  it("Q2 evolution item does not override the glance answer", () => {
    const holdings = [
      holding({
        id: "btc",
        symbol: "BTC",
        name: "Bitcoin",
        quantity: 1,
        currentPrice: 70_000,
        assetType: "crypto",
      }),
    ];
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      snapshots: [snapshotFromState(thenState())],
    });
    const bundle = buildFourQuestions({
      holdings,
      goal: null,
      hasSavedGoal: false,
      goalProgress: deriveGoalProgress({
        currentPortfolioValue: 70_000,
        goal: null,
        hasSavedGoal: false,
      }),
      evolutionTimeline: timeline,
    });
    const q2 = bundle.questions.find((row) => row.id === "what_matters_now")!;
    expect(q2.expandItems.some((item) => item.id === "evolution-structure")).toBe(true);
    expect(q2.answer).not.toBe(timeline.conclusion.primary);
  });

  it("empty history uses building copy", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState({
        portfolioValue: null,
        portfolioValueAvailable: false,
        exposure: [],
      }),
      chartPoints: [],
      snapshots: [],
      entries: [],
    });
    expect(timeline.emptyState).toBe("building");
    expect(buildEvolutionCompactCard(timeline).building).toBe(true);
  });

  it("destination holding evidence may be labeled without claiming later investment effect", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      entries: [
        entry({
          id: "to-btc",
          entryType: "contribution",
          baseAmount: 400,
          entryDate: "2026-07-15",
          destinationType: "holding",
          destinationHoldingId: "btc",
          destinationHoldingSymbol: "BTC",
          destinationQuantity: 0.01,
        }),
      ],
      snapshots: [snapshotFromState(thenState())],
    });
    expect(timeline.fundingEvents[0]?.recordedDestinationLabel).toBe("Recorded toward BTC");
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).not.toMatch(/became/i);
  });

  it("buildEvolutionNowState uses current holdings only", () => {
    const state = buildEvolutionNowState({
      holdings: [
        holding({
          id: "btc",
          symbol: "BTC",
          name: "Bitcoin",
          quantity: 1,
          currentPrice: 50_000,
          assetType: "crypto",
        }),
        holding({
          id: "cash",
          symbol: "EUR",
          name: "Euro",
          quantity: 5000,
          currentPrice: 1,
          assetType: "cash",
        }),
      ],
      goal: null,
      hasSavedGoal: false,
      asOfDate: "2026-08-20",
    });
    expect(state.bitcoinDependent).toBe(true);
    expect(state.exposure.some((row) => row.groupId === "crypto")).toBe(true);
    expect(state.exposure.some((row) => row.groupId === "cash")).toBe(true);
  });
});
