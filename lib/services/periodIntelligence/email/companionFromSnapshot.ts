/**
 * Companion-shaped review from stored intelligence snapshots.
 * No market-data provider calls, no reconstructed market history, no live Change Intelligence.
 */

import {
  defaultCompanionMoneyFormatter,
  formatSignedPercent,
} from "@/lib/services/portfolio/companion/format";
import type {
  CompanionReview,
  CompanionReviewFact,
} from "@/lib/services/portfolio/companion/types";
import type { IntelligenceStateSnapshot } from "@/lib/services/changeIntelligence/types";
import type { PeriodIntelligenceKind } from "@/lib/services/periodIntelligence/types";
import type { ResilienceProfile } from "@/lib/services/resilience";

function formatRange(start: string, end: string): string {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  return `${fmt.format(new Date(`${start}T12:00:00.000Z`))} – ${fmt.format(new Date(`${end}T12:00:00.000Z`))}`;
}

function weeklyLabel(periodKey: string): string {
  const match = periodKey.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return "Your week";
  return `Week ${Number(match[2])}, ${match[1]}`;
}

function fact(
  id: string,
  label: string,
  value: string,
  tone: CompanionReviewFact["tone"] = "neutral",
): CompanionReviewFact {
  return { id, label, value, tone };
}

export function companionFromStoredSnapshots(input: {
  kind: PeriodIntelligenceKind;
  current: IntelligenceStateSnapshot;
  previous: IntelligenceStateSnapshot | null;
}): CompanionReview {
  const currentValue = input.current.payload.portfolio.totalValue;
  const previousValue = input.previous?.payload.portfolio.totalValue ?? null;
  const formatMoney = defaultCompanionMoneyFormatter;
  const supportingFacts: CompanionReviewFact[] = [];

  if (previousValue != null && Number.isFinite(previousValue)) {
    supportingFacts.push(
      fact("starting-value", "Starting portfolio value", formatMoney(previousValue)),
    );
  }
  if (currentValue != null && Number.isFinite(currentValue)) {
    supportingFacts.push(
      fact("ending-value", "Ending portfolio value", formatMoney(currentValue)),
    );
  }

  let movementPercent: number | null = null;
  if (
    previousValue != null &&
    currentValue != null &&
    Number.isFinite(previousValue) &&
    Number.isFinite(currentValue) &&
    previousValue !== 0
  ) {
    movementPercent = ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
    supportingFacts.push(
      fact(
        "movement",
        "Portfolio movement",
        formatSignedPercent(movementPercent),
        movementPercent > 0 ? "positive" : movementPercent < 0 ? "negative" : "neutral",
      ),
    );
  }

  const largest = input.current.payload.concentration.largestHoldingName;
  const largestWeight = input.current.payload.concentration.largestHoldingWeightPercent;
  if (largest && largestWeight != null) {
    supportingFacts.push(
      fact("strongest", "Largest holding", `${largest} · ${Math.round(largestWeight)}%`),
    );
  }

  const goal = input.current.payload.goal;
  const goalStatusLabel =
    goal?.progressPercent != null
      ? `${goal.progressPercent.toFixed(0)}% of saved target`
      : null;

  const noun = input.kind === "monthly" ? "month" : "week";
  let lead: string;
  if (movementPercent != null) {
    lead = `Your portfolio moved ${formatSignedPercent(movementPercent)} this ${noun}.`;
  } else if (currentValue != null && Number.isFinite(currentValue)) {
    lead = `Your stored ${noun} closed at ${formatMoney(currentValue)}.`;
  } else {
    lead = `Your ${noun} in Tobailey is ready to review.`;
  }

  return {
    period: input.kind,
    ready: true,
    readinessReason: null,
    periodKind: input.kind === "monthly" ? "calendar_month" : "rolling_7d",
    periodLabel:
      input.kind === "monthly" ? input.current.periodKey : weeklyLabel(input.current.periodKey),
    dateRangeLabel: formatRange(input.current.periodStart, input.current.periodEnd),
    startDate: input.current.periodStart,
    endDate: input.current.periodEnd,
    lead,
    supportingFacts,
    focus: null,
    milestone: null,
    closingStatement: `Based on your stored ${noun} snapshot — not a reconstructed market close.`,
    goalStatusLabel,
    freshnessNote: `Stored snapshot captured ${input.current.capturedAt.slice(0, 10)}.`,
    links: [],
    isDemo: input.current.payload.isDemo === true,
    metrics: {
      startingValue: previousValue,
      endingValue: currentValue,
      portfolioMovement:
        previousValue != null && currentValue != null
          ? currentValue - previousValue
          : null,
      investmentReturn: null,
      netContributions: null,
      contributed: null,
      withdrawn: null,
      dividends: null,
      baseCurrency: "EUR",
      strongestContributor: largest,
      weakestContributor: null,
    },
  };
}

export function resilienceProfileFromSnapshot(
  snapshot: IntelligenceStateSnapshot | null,
): ResilienceProfile | null {
  const resilience = snapshot?.payload.resilience;
  if (!resilience || resilience.status !== "ok") return null;
  return {
    status: "ok",
    score: resilience.score,
    bandId: resilience.bandId,
    bandLabel: resilience.bandLabel,
    summary: resilience.bandLabel ?? "Resilience",
    factors: [],
    primaryDriver: resilience.primaryDriver,
    primaryDriverExplanation: null,
    mostSensitive: resilience.mostSensitive
      ? {
          scenarioId: resilience.mostSensitive.scenarioId,
          scenarioName: resilience.mostSensitive.scenarioName,
          estimatedPortfolioImpactPercent:
            resilience.mostSensitive.estimatedPortfolioImpactPercent,
          estimatedPortfolioImpactAmount: null,
          affectedPortfolioWeightPercent: null,
          note: "",
        }
      : null,
    goalContext: null,
    scenarioResults: [],
    assumptions: [],
    limitations: [],
  };
}
