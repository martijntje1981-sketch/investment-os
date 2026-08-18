/**
 * Build a compact intelligence-state snapshot from already-available portfolio state.
 * No market-data fetches. No AI. Drops large engine payloads.
 */

import { getExpectedReturnAssumption } from "@/lib/client/expectedReturnAssumption";
import {
  buildPortfolioAnalysis,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";
import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import {
  INTELLIGENCE_STATE_SCHEMA_VERSION,
  INTELLIGENCE_STATE_TIMEZONE,
  TOP_HOLDINGS_LIMIT,
} from "@/lib/services/changeIntelligence/config";
import { resolveCompletedIntelligencePeriod } from "@/lib/services/changeIntelligence/periodKeys";
import type {
  IntelligenceHoldingState,
  IntelligencePeriodIdentity,
  IntelligenceResilienceState,
  IntelligenceScorecardState,
  IntelligenceSnapshotKind,
  IntelligenceStatePayload,
  IntelligenceStateSnapshot,
} from "@/lib/services/changeIntelligence/types";
import { buildResilienceProfile } from "@/lib/services/resilience";
import type { GoalSettings, StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function roundQuantity(value: number): number {
  return Math.round(value * 1e8) / 1e8;
}

function toHoldingState(
  analysis: PortfolioAnalysisSnapshot,
): IntelligenceHoldingState[] {
  return analysis.valuedPositions.slice(0, TOP_HOLDINGS_LIMIT).map((row) => ({
    id: row.holding.id,
    symbol: row.holding.symbol,
    name: row.holding.name,
    quantity: roundQuantity(row.holding.quantity),
    value: round4(row.value),
    weightPercent: round1(row.weightPercent),
    assetType: row.holding.assetType ?? "investment",
    providerSymbol: row.holding.providerSymbol ?? null,
  }));
}

function compactResilience(
  holdings: StoredPortfolioHolding[],
  goal: GoalSettings | null,
  hasSavedGoal: boolean,
): IntelligenceResilienceState {
  const profile = buildResilienceProfile({ holdings, goal, hasSavedGoal });
  return {
    status: profile.status,
    score: profile.score,
    bandId: profile.bandId,
    bandLabel: profile.bandLabel,
    primaryDriver: profile.primaryDriver,
    factors: profile.factors.map((factor) => ({
      id: factor.id,
      score: factor.score,
    })),
    mostSensitive: profile.mostSensitive
      ? {
          scenarioId: profile.mostSensitive.scenarioId,
          scenarioName: profile.mostSensitive.scenarioName,
          estimatedPortfolioImpactPercent: round1(
            profile.mostSensitive.estimatedPortfolioImpactPercent,
          ),
        }
      : null,
  };
}

export type BuildIntelligenceStateSnapshotInput = {
  holdings: StoredPortfolioHolding[];
  goal?: GoalSettings | null;
  goalId?: string | null;
  hasSavedGoal?: boolean;
  isDemo?: boolean;
  scorecard?: IntelligenceScorecardState | null;
  capturedAt?: Date | string;
  snapshotKind: IntelligenceSnapshotKind;
  period?: IntelligencePeriodIdentity;
  timezone?: string;
  userId?: string | null;
  portfolioId?: string | null;
  snapshotId?: string | null;
};

export function buildIntelligenceStatePayload(
  input: Omit<
    BuildIntelligenceStateSnapshotInput,
    "snapshotKind" | "period" | "userId" | "portfolioId" | "snapshotId"
  >,
): IntelligenceStatePayload {
  const holdings = input.holdings;
  const goal = input.goal ?? null;
  const hasSavedGoal = Boolean(input.hasSavedGoal && goal);
  const analysis = buildPortfolioAnalysis(holdings);
  const exposure = buildPortfolioExposureAllocation(holdings);
  const largest = analysis.largestPosition;
  const portfolioValueAvailable = analysis.totalValue > 0;

  let goalState: IntelligenceStatePayload["goal"] = null;
  if (hasSavedGoal && goal) {
    const progress = buildGoalProgressEngine({
      currentPortfolioValue: analysis.totalValue,
      portfolioValueAvailable,
      goal,
      hasSavedGoal: true,
    });
    goalState = {
      goalId: input.goalId?.trim() || null,
      targetValue: goal.targetValue,
      targetYear: goal.targetYear,
      progressPercent: portfolioValueAvailable
        ? round1(progress.currentProgressPercent)
        : null,
      monthlyContribution: Number.isFinite(goal.monthlyContribution)
        ? goal.monthlyContribution
        : null,
      expectedAnnualReturnPercent: getExpectedReturnAssumption(goal),
      portfolioValueAvailable,
    };
  }

  return {
    schemaVersion: INTELLIGENCE_STATE_SCHEMA_VERSION,
    isDemo: Boolean(input.isDemo),
    portfolio: {
      totalValue: portfolioValueAvailable ? round4(analysis.totalValue) : null,
      coverage: {
        holdingCount: holdings.length,
        valuedHoldingCount: analysis.valuedPositions.length,
        unvaluedHoldingCount: analysis.unvaluedHoldings.length,
        portfolioValueAvailable,
      },
    },
    holdings: toHoldingState(analysis),
    exposure: {
      groups: exposure.groups
        .filter((group) => group.rawPercent > 0)
        .map((group) => ({
          groupId: group.groupId,
          displayLabel: group.displayLabel,
          weightPercent: round1(group.rawPercent),
        })),
      classifiedHoldingCount: exposure.classifiedHoldingCount,
      unclassifiedHoldingCount: exposure.unclassifiedHoldingCount,
      coverageLabel: exposure.coverageLabel,
    },
    concentration: {
      largestHoldingId: largest?.holding.id ?? null,
      largestHoldingSymbol: largest?.holding.symbol ?? null,
      largestHoldingName: largest?.holding.name ?? null,
      largestHoldingWeightPercent:
        largest != null ? round1(largest.weightPercent) : null,
      hhi: Number.isFinite(analysis.hhi) ? round4(analysis.hhi) : null,
      concentrationLevel: analysis.concentrationLevel,
    },
    goal: goalState,
    resilience: compactResilience(holdings, goal, hasSavedGoal),
    scorecard: input.scorecard ?? null,
  };
}

export function buildIntelligenceStateSnapshot(
  input: BuildIntelligenceStateSnapshotInput,
): IntelligenceStateSnapshot {
  const capturedAtDate =
    input.capturedAt instanceof Date
      ? input.capturedAt
      : input.capturedAt
        ? new Date(input.capturedAt)
        : new Date();
  const capturedAt = capturedAtDate.toISOString();
  const timezone = input.timezone ?? INTELLIGENCE_STATE_TIMEZONE;
  const period =
    input.period ??
    resolveCompletedIntelligencePeriod(
      input.snapshotKind,
      capturedAtDate,
      timezone,
    );

  return {
    id: input.snapshotId ?? null,
    userId: input.userId ?? null,
    portfolioId: input.portfolioId ?? null,
    schemaVersion: INTELLIGENCE_STATE_SCHEMA_VERSION,
    capturedAt,
    snapshotKind: period.snapshotKind,
    periodKey: period.periodKey,
    periodStart: period.periodStart,
    periodEnd: period.periodEnd,
    timezone: period.timezone,
    payload: buildIntelligenceStatePayload(input),
  };
}
