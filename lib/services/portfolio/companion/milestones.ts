/**
 * Factual milestones for companion reviews.
 * Only return a milestone when the crossing is supported by period data.
 * No gamification language.
 */

import type { CompanionMilestone } from "@/lib/services/portfolio/companion/types";
import type { CompanionMoneyFormatter } from "@/lib/services/portfolio/companion/format";
import { detectGoalMilestonePercent } from "@/lib/client/smartDashboardIntelligence";

const VALUE_THRESHOLDS = [
  1_000_000, 500_000, 250_000, 100_000, 50_000, 25_000, 10_000,
] as const;

export type CompanionMilestoneInput = {
  startingValue: number | null;
  endingValue: number | null;
  goalProgressPercent?: number | null;
  goalReached?: boolean;
  /** Goal progress at period start when known — avoids repeating milestones. */
  goalProgressAtStart?: number | null;
  firstHoldingInPeriod?: boolean;
  firstContributionInPeriod?: boolean;
  firstDividendInPeriod?: boolean;
  historyMonthsAvailable?: number | null;
  formatMoney: CompanionMoneyFormatter;
};

function crossedThreshold(
  start: number,
  end: number,
  threshold: number,
): boolean {
  return start < threshold && end >= threshold;
}

export function detectCompanionMilestone(
  input: CompanionMilestoneInput,
): CompanionMilestone | null {
  const start = input.startingValue;
  const end = input.endingValue;

  if (
    start != null &&
    end != null &&
    Number.isFinite(start) &&
    Number.isFinite(end)
  ) {
    for (const threshold of VALUE_THRESHOLDS) {
      if (crossedThreshold(start, end, threshold)) {
        return {
          id: `value:${threshold}`,
          label: `Portfolio passed ${input.formatMoney(threshold)}.`,
        };
      }
    }
  }

  const goalMilestone = detectGoalMilestonePercent(
    input.goalProgressPercent,
    Boolean(input.goalReached),
  );
  if (goalMilestone != null) {
    const startProgress = input.goalProgressAtStart;
    const newlyCrossed =
      startProgress == null ||
      !Number.isFinite(startProgress) ||
      startProgress < goalMilestone;
    if (newlyCrossed) {
      if (goalMilestone === 100) {
        return {
          id: "goal:100",
          label: "Your main goal reached 100%.",
        };
      }
      return {
        id: `goal:${goalMilestone}`,
        label: `Your main goal reached ${goalMilestone}%.`,
      };
    }
  }

  if (input.historyMonthsAvailable != null && input.historyMonthsAvailable >= 12) {
    // Only announce at the 12-month boundary window (12–13 months).
    if (input.historyMonthsAvailable < 13) {
      return {
        id: "history:12m",
        label: "You have now recorded 12 months of portfolio history.",
      };
    }
  }

  if (input.firstDividendInPeriod) {
    return {
      id: "dividend:first",
      label: "First dividend recorded in this period.",
    };
  }

  if (input.firstContributionInPeriod) {
    return {
      id: "contribution:first",
      label: "First contribution recorded in this period.",
    };
  }

  if (input.firstHoldingInPeriod) {
    return {
      id: "holding:first",
      label: "First holding added in this period.",
    };
  }

  return null;
}
