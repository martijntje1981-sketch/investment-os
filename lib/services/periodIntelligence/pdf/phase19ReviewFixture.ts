/**
 * Phase 19 local visual-review fixture.
 * Test data only — not production intelligence.
 */

import { writeFileSync } from "node:fs";
import path from "node:path";

import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import {
  applyPeriodIntelligenceDepth,
  buildPeriodIntelligenceReview,
} from "@/lib/services/periodIntelligence";
import { buildChangeIntelligenceSummary } from "@/lib/services/changeIntelligence";
import type {
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import type { HoldingPeriodMove } from "@/lib/services/performanceAttribution/buildHoldingMovesFromEod";
import { renderPeriodReportPdf } from "@/lib/services/periodIntelligence/pdf/renderPeriodReportPdf";
import { buildCompanionReview } from "@/lib/services/portfolio/companion";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { PeriodIntelligenceKind, PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "id" | "symbol" | "name" | "quantity" | "currentPrice">,
): StoredPortfolioHolding {
  return {
    purchasePrice: overrides.purchasePrice ?? overrides.currentPrice,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    priceDataStatus: overrides.priceDataStatus ?? "delayed",
    ...overrides,
  };
}

export function phase19Holdings(): StoredPortfolioHolding[] {
  return [
    holding({
      id: "btc",
      symbol: "BTC",
      name: "Bitcoin",
      quantity: 0.5,
      currentPrice: 108_000,
      currentPairPrice: 108_000,
      pairCurrency: "EUR",
      assetType: "crypto",
      priceDataStatus: "delayed",
    }),
    holding({
      id: "vwce",
      symbol: "VWCE",
      name: "Vanguard FTSE All-World UCITS ETF",
      quantity: 150,
      currentPrice: 122,
      providerSymbol: "VWCE.XETRA",
      priceDataStatus: "stale",
    }),
    holding({
      id: "aggh",
      symbol: "AGGH",
      name: "iShares Core Global Aggregate Bond UCITS ETF",
      quantity: 400,
      currentPrice: 25,
      providerSymbol: "AGGH.XETRA",
      providerInstrumentType: "ETF",
      instrumentName: "iShares Core Global Aggregate Bond UCITS ETF",
      priceDataStatus: "delayed",
    }),
    holding({
      id: "igln",
      symbol: "IGLN",
      name: "iShares Physical Gold ETC",
      quantity: 80,
      currentPrice: 63.75,
      providerSymbol: "IGLN.LSE",
      providerInstrumentType: "ETC",
      priceDataStatus: "delayed",
    }),
    holding({
      id: "cash",
      symbol: "EUR",
      name: "Euro cash",
      quantity: 12_000,
      currentPrice: 1,
      assetType: "cash",
    }),
    holding({
      id: "zzzx",
      symbol: "ZZZX",
      name: "Custom Private Note",
      quantity: 40,
      currentPrice: 70,
      priceDataStatus: "unavailable",
    }),
    holding({
      id: "nukl",
      symbol: "NUKL",
      name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
      quantity: 20,
      currentPrice: 90,
      providerSymbol: "NUKL.XETRA",
      priceDataStatus: "live",
    }),
  ];
}

export const PHASE19_GOAL: GoalSettings = {
  name: "Independence",
  targetValue: 250_000,
  targetYear: 2035,
  monthlyContribution: 400,
  expectedAnnualReturn: 6,
};

export function phase19ContributionEntries(
  kind: PeriodIntelligenceKind = "weekly",
): PortfolioContributionEntry[] {
  const entryDate = kind === "monthly" ? "2026-07-15" : "2026-08-13";
  return [
    {
      id: "c-400",
      portfolioId: "p1",
      userId: "user-1",
      entryType: "contribution",
      amount: 400,
      currency: "EUR",
      baseCurrency: "EUR",
      baseAmount: 400,
      fxRateUsed: 1,
      entryDate,
      note: "Monthly savings",
      source: "manual",
      destinationType: "cash",
      destinationHoldingId: "cash",
      destinationHoldingSymbol: "EUR",
      destinationQuantity: null,
      destinationPricePerUnit: null,
      destinationFee: null,
      createdAt: `${entryDate}T09:00:00.000Z`,
      updatedAt: `${entryDate}T09:00:00.000Z`,
    },
  ];
}

export function phase19HoldingMoves(): HoldingPeriodMove[] {
  return [
    move("btc", "BTC", "Bitcoin", "crypto", 0.5, 50_000, 54_000),
    move("vwce", "VWCE", "Vanguard FTSE All-World UCITS ETF", "investment", 150, 18_000, 18_300),
    move("aggh", "AGGH", "iShares Core Global Aggregate Bond UCITS ETF", "investment", 400, 10_000, 10_000),
    move("igln", "IGLN", "iShares Physical Gold ETC", "investment", 80, 5_000, 5_100),
    move("cash", "EUR", "Euro cash", "cash", 12_000, 12_000, 12_000),
    move("zzzx", "ZZZX", "Custom Private Note", "investment", 40, 3_000, 2_800),
    move("nukl", "NUKL", "VanEck Uranium and Nuclear Technologies UCITS ETF", "investment", 20, 2_000, 1_800),
  ];
}

function move(
  holdingId: string,
  symbol: string,
  name: string,
  assetType: "investment" | "cash" | "crypto",
  quantity: number,
  startingValueEur: number,
  endingValueEur: number,
): HoldingPeriodMove {
  const moveEur = endingValueEur - startingValueEur;
  return {
    holdingId,
    symbol,
    name,
    assetType,
    quantity,
    startingClose: startingValueEur / quantity,
    endingClose: endingValueEur / quantity,
    startingValueEur,
    endingValueEur,
    moveEur,
    returnPercent: startingValueEur > 0 ? (moveEur / startingValueEur) * 100 : 0,
    included: true,
    exclusionReason: null,
    usesApproximateFx: false,
  };
}

export function phase19ChartPoints(kind: PeriodIntelligenceKind): PortfolioPerformancePoint[] {
  if (kind === "weekly") {
    return [
      point("2026-08-11", 100_000),
      point("2026-08-12", 101_200),
      point("2026-08-13", 100_800),
      point("2026-08-14", 102_400),
      point("2026-08-17", 104_000),
    ];
  }
  return [
    point("2026-07-01", 96_000),
    point("2026-07-08", 97_400),
    point("2026-07-15", 99_100),
    point("2026-07-22", 101_200),
    point("2026-07-31", 104_000),
  ];
}

function point(date: string, portfolioValue: number): PortfolioPerformancePoint {
  return {
    date,
    portfolioValue,
    netContributions: null,
    investmentReturn: null,
  };
}

function emptyPayload(): IntelligenceStatePayload {
  return {
    schemaVersion: 1,
    isDemo: false,
    portfolio: {
      totalValue: 104_000,
      coverage: {
        holdingCount: 7,
        valuedHoldingCount: 7,
        unvaluedHoldingCount: 0,
        portfolioValueAvailable: true,
      },
    },
    holdings: [],
    exposure: {
      groups: [
        { groupId: "crypto", displayLabel: "Crypto", weightPercent: 52 },
        { groupId: "cash", displayLabel: "Cash", weightPercent: 12 },
        { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 18 },
      ],
      classifiedHoldingCount: 6,
      unclassifiedHoldingCount: 1,
      coverageLabel: "1 holding unclassified",
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: "BTC",
      largestHoldingName: "Bitcoin",
      largestHoldingWeightPercent: 52,
      hhi: 0.33,
      concentrationLevel: "highly_concentrated",
    },
    goal: {
      goalId: "goal-1",
      targetValue: 250_000,
      targetYear: 2035,
      progressPercent: 41.6,
      monthlyContribution: 400,
      expectedAnnualReturnPercent: 6,
      portfolioValueAvailable: true,
    },
    resilience: {
      status: "ok",
      score: 58,
      bandId: "moderate",
      bandLabel: "Moderate",
      primaryDriver: "concentration",
      factors: [{ id: "concentration", score: 35 }],
      mostSensitive: {
        scenarioId: "bitcoin_minus_20",
        scenarioName: "Bitcoin -20%",
        estimatedPortfolioImpactPercent: 10.4,
      },
    },
    scorecard: null,
  };
}

function snapshot(
  overrides: Omit<Partial<IntelligenceStateSnapshot>, "payload"> & {
    payload?: Partial<IntelligenceStatePayload>;
  } = {},
): IntelligenceStateSnapshot {
  const base = emptyPayload();
  return {
    id: overrides.id ?? "snap-1",
    userId: "user-1",
    portfolioId: "p1",
    snapshotKind: overrides.snapshotKind ?? "weekly",
    schemaVersion: 1,
    periodKey: overrides.periodKey ?? "2026-W33",
    periodStart: overrides.periodStart ?? "2026-08-11",
    periodEnd: overrides.periodEnd ?? "2026-08-17",
    capturedAt: overrides.capturedAt ?? "2026-08-17T16:00:00.000Z",
    timezone: "Europe/Amsterdam",
    payload: {
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
      resilience: overrides.payload?.resilience ?? base.resilience,
      scorecard: overrides.payload?.scorecard ?? null,
    },
  };
}

export function phase19News(): NewsContentItem[] {
  return [
    {
      id: "btc-news",
      title: "Bitcoin holds above key level after ETF inflows",
      sourceName: "Reuters",
      sourceType: "news",
      canonicalUrl: "https://www.reuters.com/example-bitcoin-inflows",
      thumbnailUrl: null,
      publishedAt: "2026-08-14T09:00:00.000Z",
      description: "Spot bitcoin ETFs recorded net inflows.",
      summary: "Spot bitcoin ETFs recorded net inflows this week.",
      interpretation: "Context for the largest holding, not a cause of the portfolio result.",
      impactLevel: "Medium Impact",
      matchedHoldingIds: ["btc"],
      matchedSymbols: ["BTC"],
      matchedHoldings: [
        { id: "btc", symbol: "BTC", name: "Bitcoin", providerSymbol: null },
      ],
      relevanceLabel: "Direct holding",
      category: "crypto",
      marketCategory: "crypto",
      contentTypeLabel: "News",
      fetchedAt: "2026-08-17T12:00:00.000Z",
      relevanceScore: 22,
    },
    {
      id: "ecb-event",
      title: "ECB rate decision scheduled next week",
      sourceName: "European Central Bank",
      sourceType: "news",
      canonicalUrl: "https://www.ecb.europa.eu/press/example-decision",
      thumbnailUrl: null,
      publishedAt: "2026-08-16T08:00:00.000Z",
      description: "The Governing Council meets next week.",
      summary: "The ECB Governing Council meets next week.",
      interpretation: "Macro calendar context for bond and cash holdings, not a forecast.",
      impactLevel: "Medium Impact",
      matchedHoldingIds: ["aggh"],
      matchedSymbols: ["AGGH"],
      matchedHoldings: [
        {
          id: "aggh",
          symbol: "AGGH",
          name: "iShares Core Global Aggregate Bond UCITS ETF",
          providerSymbol: "AGGH.XETRA",
        },
      ],
      relevanceLabel: "Portfolio-relevant",
      category: "macro",
      marketCategory: "macro",
      contentTypeLabel: "News",
      fetchedAt: "2026-08-17T12:00:00.000Z",
      relevanceScore: 18,
      contextKind: "macro_official",
      macroTopic: "interest_rates",
      officialInstitution: "ecb",
      officialFeedKind: "policy_decision",
    },
  ];
}

export function buildPhase19PeriodReview(
  kind: PeriodIntelligenceKind,
): PeriodIntelligenceReview {
  const holdings = phase19Holdings();
  const chartPoints = phase19ChartPoints(kind);
  const companion = buildCompanionReview(kind, {
    now: new Date("2026-08-17T16:00:00.000Z"),
    holdingCount: holdings.length,
    weekSeries: kind === "weekly" ? chartPoints : undefined,
    monthSeries: kind === "monthly" ? chartPoints : undefined,
    weekBestHoldingName: "Bitcoin",
    weekWorstHoldingName: "NUKL",
    monthBestHoldingName: "Bitcoin",
    monthWorstHoldingName: "NUKL",
    hasSavedGoal: true,
    goalStatus: "On track",
    goalProgressPercent: 41.6,
    contributionEntries: phase19ContributionEntries(kind),
  });
  const previous = snapshot({
    id: "prev",
    snapshotKind: kind,
    periodKey: kind === "weekly" ? "2026-W32" : "2026-07",
    periodStart: kind === "weekly" ? "2026-08-04" : "2026-07-01",
    periodEnd: kind === "weekly" ? "2026-08-10" : "2026-07-31",
    payload: {
      concentration: {
        largestHoldingId: "btc",
        largestHoldingSymbol: "BTC",
        largestHoldingName: "Bitcoin",
        largestHoldingWeightPercent: 48,
        hhi: 0.3,
        concentrationLevel: "highly_concentrated",
      },
    },
  });
  const current = snapshot({
    id: "curr",
    snapshotKind: kind,
    periodKey: kind === "weekly" ? "2026-W33" : "2026-08",
  });
  const built = buildPeriodIntelligenceReview({
    kind,
    companion,
    change: buildChangeIntelligenceSummary({ previous, current }),
    snapshotCount: 2,
    intelligenceDepth: "complete",
    holdings,
    goal: PHASE19_GOAL,
    hasSavedGoal: true,
    contributionEntries: phase19ContributionEntries(kind),
    chartPoints,
    holdingMoves: phase19HoldingMoves(),
    startingPortfolioValue: 100_000,
    endingPortfolioValue: 104_000,
    totalReturnPercent: 4,
    totalReturnAmount: 4_000,
    resilienceProfile: buildResilienceProfile({
      holdings,
      goal: PHASE19_GOAL,
      hasSavedGoal: true,
    }),
    concentrationWeightPercent: 52,
    largestHoldingName: "Bitcoin",
    newsItems: phase19News(),
    now: new Date("2026-08-17T16:00:00.000Z"),
  });
  return applyPeriodIntelligenceDepth(built, "complete");
}

export function writePhase19ReviewPdfs(outDir = process.cwd()): {
  weeklyPath: string;
  monthlyPath: string;
} {
  const weeklyPath = path.join(outDir, "phase19-weekly-review.pdf");
  const monthlyPath = path.join(outDir, "phase19-monthly-review.pdf");
  writeFileSync(
    weeklyPath,
    Buffer.from(renderPeriodReportPdf(buildPhase19PeriodReview("weekly"))),
  );
  writeFileSync(
    monthlyPath,
    Buffer.from(renderPeriodReportPdf(buildPhase19PeriodReview("monthly"))),
  );
  return { weeklyPath, monthlyPath };
}
