/**
 * Dashboard hierarchy + Portfolio Evolution signature contracts.
 * Source and engine checks only — no new APIs.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { IntelligenceStatePayload, IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import { PORTFOLIO_EVOLUTION_HREF } from "@/lib/services/portfolioEvolution";
import { buildPortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution";
import type { EvolutionNowState } from "@/lib/services/portfolioEvolution/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { resolveHistorySummaryPresentation } from "@/lib/services/portfolio/timeline/resolveHistorySummaryPresentation";
import type { PortfolioTimelineSummary } from "@/lib/services/portfolio/timeline/types";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

function nowState(overrides: Partial<EvolutionNowState> = {}): EvolutionNowState {
  return {
    asOfDate: "2026-08-20",
    portfolioValue: 126_706,
    portfolioValueAvailable: true,
    exposure: [
      { groupId: "crypto", displayLabel: "Crypto", weightPercent: 54 },
      { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 38 },
      { groupId: "cash", displayLabel: "Cash", weightPercent: 8 },
    ],
    largestHoldingSymbol: "BTC",
    largestHoldingName: "Bitcoin",
    largestHoldingWeightPercent: 54,
    bitcoinDependent: true,
    scenarioId: "bitcoin_minus_20",
    scenarioName: "Bitcoin −20%",
    scenarioImpactPercent: -10.8,
    resilienceScore: 42,
    goalProgressPercent: 16.9,
    ...overrides,
  };
}

function thenState(): EvolutionNowState {
  return nowState({
    asOfDate: "2026-05-22",
    portfolioValue: 119_502,
    exposure: [
      { groupId: "crypto", displayLabel: "Crypto", weightPercent: 43 },
      { groupId: "diversified_equity", displayLabel: "Diversified equity", weightPercent: 50 },
      { groupId: "cash", displayLabel: "Cash", weightPercent: 7 },
    ],
    largestHoldingWeightPercent: 52,
    scenarioImpactPercent: -8.6,
  });
}

function snapshotFromState(state: EvolutionNowState): IntelligenceStateSnapshot {
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
            id: "btc",
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
      unclassifiedHoldingCount: 0,
      coverageLabel: null,
    },
    concentration: {
      largestHoldingId: "btc",
      largestHoldingSymbol: state.largestHoldingSymbol,
      largestHoldingName: state.largestHoldingName,
      largestHoldingWeightPercent: state.largestHoldingWeightPercent,
      hhi: 0.4,
      concentrationLevel: "highly_concentrated",
    },
    goal: null,
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
    id: `snap-${state.asOfDate}`,
    userId: "u1",
    portfolioId: "p1",
    schemaVersion: 1,
    capturedAt: `${state.asOfDate}T18:00:00.000Z`,
    snapshotKind: "weekly",
    periodKey: state.asOfDate,
    periodStart: state.asOfDate,
    periodEnd: state.asOfDate,
    timezone: "Europe/Amsterdam",
    payload,
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

const chart: PortfolioPerformancePoint[] = [
  { date: "2026-05-22", portfolioValue: 119_502, netContributions: null, investmentReturn: null },
  { date: "2026-07-15", portfolioValue: 123_000, netContributions: null, investmentReturn: null },
  { date: "2026-08-20", portfolioValue: 126_706, netContributions: null, investmentReturn: null },
];

describe("Portfolio Evolution Dashboard hierarchy", () => {
  const dashboard = read("app/dashboard/page.tsx");
  const card = read("components/portfolioEvolution/DashboardPortfolioEvolutionCard.tsx");
  const visual = read("components/portfolioEvolution/PortfolioEvolutionVisual.tsx");
  const chartUi = read("components/portfolioEvolution/PortfolioEvolutionChart.tsx");
  const mixUi = read("components/portfolioEvolution/PortfolioEvolutionMixCheckpoints.tsx");
  const section = read("components/portfolioEvolution/PortfolioEvolutionSection.tsx");
  const historyPage = read("components/portfolioHistory/PortfolioHistoryPage.tsx");
  const cashCard = read("components/dashboard/DashboardCashIntelligenceCard.tsx");
  const cashSection = read("components/analysis/CashIntelligenceSection.tsx");
  const analysisPage = read("components/analysis/PortfolioAnalysisPage.tsx");
  const holdingPage = read("app/holding/[ticker]/page.tsx");
  const engine = read("lib/services/portfolioEvolution/buildPortfolioEvolutionTimeline.ts");

  it("A. Dashboard Evolution renders as the major lower intelligence visual", () => {
    expect(dashboard).toContain("<DashboardPortfolioEvolutionCard");
    expect(card).toContain("Portfolio Evolution");
    expect(card).toContain("See how your portfolio changed");
    expect(card).toContain("View full evolution");
    expect(card).toContain("PORTFOLIO_EVOLUTION_HREF");
    expect(dashboard.indexOf("<FourQuestionsSection")).toBeGreaterThan(-1);
    expect(dashboard.indexOf("<DashboardPortfolioEvolutionCard")).toBeGreaterThan(
      dashboard.indexOf("<FourQuestionsSection"),
    );
    expect(dashboard.indexOf("<HoldingsToday")).toBeGreaterThan(
      dashboard.indexOf("<DashboardPortfolioEvolutionCard"),
    );
  });

  it("B/C. contribution and withdrawal markers are visually distinct", () => {
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
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [contribution, withdrawal],
      snapshots: [snapshotFromState(thenState())],
    });
    expect(timeline.fundingEvents.some((row) => row.kind === "contribution" && row.amount === 400)).toBe(
      true,
    );
    expect(timeline.fundingEvents.some((row) => row.kind === "withdrawal" && row.amount === -1000)).toBe(
      true,
    );
    expect(chartUi).toContain('#059669');
    expect(chartUi).toContain('#e11d48');
    expect(chartUi).toContain("Contribution");
    expect(chartUi).toContain("Withdrawal");
  });

  it("D. funding is not treated as return", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [entry({ id: "c1", entryType: "contribution", baseAmount: 400, entryDate: "2026-07-15" })],
      snapshots: [snapshotFromState(thenState())],
      contributionBasisReliable: false,
    });
    expect(timeline.fundingVsMarket?.copy).toMatch(/Recorded contributions explain/);
    expect(timeline.fundingVsMarket?.copy).not.toMatch(/Only €/);
    expect(chartUi).toContain("funding, not investment return");
    expect(visual).toContain("fundingVsMarket");
  });

  it("E. no fake holding attribution", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [entry({ id: "c1", entryType: "contribution", baseAmount: 400, entryDate: "2026-07-15" })],
      snapshots: [snapshotFromState(thenState())],
    });
    expect(timeline.fundingEvents[0]?.immediateEffectLabel).not.toMatch(/Bitcoin/i);
    expect(engine).not.toMatch(/became Bitcoin/i);
  });

  it("F. no daily allocation interpolation", () => {
    expect(engine).toContain("EVOLUTION_DAILY_MIX_BLOCK_REASON");
    expect(mixUi).toContain("EVOLUTION_SPARSE_MIX_NOTE");
    expect(mixUi).not.toMatch(/interpolat/i);
    expect(visual).not.toMatch(/stacked daily/i);
  });

  it("G. sparse mix checkpoints require stored snapshots", () => {
    const empty = buildPortfolioEvolutionTimeline({
      now: nowState({ exposure: [] }),
      chartPoints: chart,
      snapshots: [],
    });
    expect(empty.mixCheckpoints).toBeNull();
    const withSnaps = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState()), snapshotFromState(nowState())],
    });
    expect((withSnaps.mixCheckpoints?.length ?? 0) >= 2).toBe(true);
    expect(mixUi).toContain("Mix checkpoints");
  });

  it("H. canonical conclusion is evidence-generated", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
    });
    expect(timeline.conclusion.primary.length).toBeGreaterThan(0);
    expect(timeline.conclusion.supporting.length).toBeLessThanOrEqual(2);
    expect(visual).toContain("Tobailey conclusion");
    expect(visual).toContain("timeline.conclusion.primary");
  });

  it("I. max three structural comparisons", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
      intelligenceDepth: "complete",
    });
    expect(timeline.beforeNow.length).toBeLessThanOrEqual(3);
    expect(visual).toContain("complete ? 3 : 1");
  });

  it("J. unsupported timeframes stay disabled", () => {
    expect(section).toContain("disabled={!timeline.timeframeEnabled[id]");
    expect(section).toContain('complete ? "90D" : "30D"');
    expect(dashboard).toContain('timeframe: "30D"');
    expect(dashboard).not.toContain('"3M"');
  });

  it("K. Portfolio History deep link", () => {
    expect(PORTFOLIO_EVOLUTION_HREF).toBe("/portfolio-history#portfolio-evolution");
    expect(card).toContain("PORTFOLIO_EVOLUTION_HREF");
    expect(section).toContain('id="portfolio-evolution"');
    expect(historyPage).toContain("PortfolioEvolutionSection");
  });

  it("L/M. Cash Intelligence is preserved and discoverable", () => {
    expect(cashSection).toContain('id="cash-intelligence"');
    expect(cashSection).toContain("Cash intelligence");
    expect(analysisPage).toContain("CashIntelligenceSection");
    expect(DASHBOARD_DEEP_LINKS.cashIntelligence).toBe("/analysis#cash-intelligence");
    expect(cashCard).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
    expect(cashCard).toContain("View cash intelligence");
    expect(holdingPage).toContain("Understand your cash");
    expect(holdingPage).toContain("DASHBOARD_DEEP_LINKS.cashIntelligence");
  });

  it("N. large Dashboard Cash card is demoted to a compact teaser", () => {
    expect(cashCard).toContain("Compact Dashboard Cash Intelligence teaser");
    expect(cashCard).toContain("appCardPaddingCompactClass");
    expect(dashboard).toContain("DashboardCashIntelligenceCard");
  });

  it("O. generic Dashboard Portfolio History card is demoted", () => {
    expect(dashboard).not.toContain("DashboardPortfolioHistorySection");
    expect(dashboard).toContain("DashboardPortfolioEvolutionCard");
    expect(read("components/dashboard/DashboardPortfolioHistorySection.tsx")).toContain(
      "export function DashboardPortfolioHistorySection",
    );
  });

  it("P. contribution recording remains", () => {
    expect(historyPage).toContain("ManageContributionsDialog");
    expect(historyPage).toContain("Add activity");
    expect(read("app/portfolio/page.tsx")).toContain("PortfolioFundingSection");
  });

  it("Q/R. Free vs Complete access is preserved", () => {
    expect(visual).toContain('timeline.intelligenceDepth === "complete"');
    expect(visual).toContain("showFunding={complete}");
    expect(section).toContain('complete ? "90D" : "30D"');
    const free = buildPortfolioEvolutionTimeline({
      timeframe: "90D",
      intelligenceDepth: "free",
      now: nowState(),
      chartPoints: chart,
      snapshots: [snapshotFromState(thenState())],
      entries: [entry({ id: "c1", entryType: "contribution", baseAmount: 400, entryDate: "2026-07-15" })],
    });
    expect(free.timeframe).toBe("30D");
    expect(free.beforeNow.length).toBeLessThanOrEqual(1);
    expect(free.mixCheckpoints).toBeNull();
  });

  it("S. Dashboard Evolution adds no extra price request", () => {
    expect(card).not.toContain("/api/prices");
    expect(card).not.toContain("usePortfolioPerformanceHistory");
    expect(dashboard).not.toContain('fetch("/api/prices"');
    expect(dashboard.match(/usePortfolioPerformanceHistory\(/g)?.length).toBe(2);
    expect(dashboard).toContain('"1W"');
    expect(dashboard).toContain('"1M"');
    expect(dashboard).not.toMatch(/usePortfolioPerformanceHistory\([\s\S]*?"3M"/);
    expect(dashboard).not.toMatch(/usePortfolioPerformanceHistory\([\s\S]*?"ALL"/);
  });

  it("T. Dashboard reuses month history instead of a duplicate Evolution fetch", () => {
    expect(dashboard).toContain("monthHistory.data?.chartPoints");
    expect(section).toContain("historyEnabled && complete && timeframe === \"ALL\"");
  });

  it("U. History summary metrics are honest", () => {
    const presentation = resolveHistorySummaryPresentation({
      currentPortfolioValue: 126_706,
      portfolioValueAvailable: true,
      netContributions: 400,
      totalContributed: 400,
      totalWithdrawn: 0,
      portfolioGrowth: 7_204,
      portfolioGrowthPercent: 6,
      investmentReturn: 7_204,
      investmentReturnPercent: 6,
      startingPortfolioValue: 119_502,
      endingPortfolioValue: 126_706,
      periodLabel: "1 year",
      contributionSummary: {
        totalContributed: 400,
        totalWithdrawn: 0,
        netContributed: 400,
        currentValue: 126_706,
        valueAboveContributions: null,
        valueAboveContributionsPercent: null,
        contributionCount: 1,
        withdrawalCount: 0,
        hasContributionData: true,
        contributionBasisReliable: false,
      },
    } satisfies PortfolioTimelineSummary);
    expect(presentation.showsInvestmentReturn).toBe(false);
    expect(presentation.metrics.map((row) => row.label)).toEqual([
      "Portfolio value change",
      "Recorded net contributions",
      "Current portfolio value",
    ]);
    expect(historyPage).toContain("resolveHistorySummaryPresentation");
    expect(historyPage).not.toContain("Investment return");
  });

  it("V. incomplete contribution history uses explain-not-only wording", () => {
    const timeline = buildPortfolioEvolutionTimeline({
      now: nowState(),
      chartPoints: chart,
      entries: [entry({ id: "c1", entryType: "contribution", baseAmount: 400, entryDate: "2026-07-15" })],
      snapshots: [snapshotFromState(thenState())],
      contributionBasisReliable: false,
    });
    expect(timeline.fundingVsMarket?.copy).toMatch(/Recorded contributions explain/);
    expect(timeline.fundingVsMarket?.copy).not.toMatch(/^Only /);
  });

  it("W. mobile structure / overflow contract", () => {
    expect(card).toContain("overflow-x-clip");
    expect(visual).toContain("overflow-x-clip");
    expect(chartUi).toContain("overflow-x-clip");
    expect(chartUi).toContain("min-h-11");
    expect(mixUi).toContain("overflow-x-clip");
    expect(section).toContain("min-h-11");
    expect(dashboard).not.toMatch(/overflow-x-auto|overflow-x-scroll/);
  });
});
