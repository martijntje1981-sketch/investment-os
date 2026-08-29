/**
 * Goal path trade-offs: contribution what-if via the existing goal engine,
 * stance what-if as modeled-sensitivity illustration only.
 *
 * Stance-specific expected returns are not fabricated.
 */

import { buildGoalProgressEngine } from "@/lib/services/goals/goalProgressEngine";
import {
  STANCE_ILLUSTRATIVE_DISCLAIMER,
  STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON,
  STANCE_SENSITIVITY_ILLUSTRATION,
} from "@/lib/services/portfolioStance/config";
import type {
  GoalTradeOffs,
  PortfolioStance,
} from "@/lib/services/portfolioStance/types";
import { buildContributionWhatIfPresets } from "@/lib/services/whatIf/options";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import { assertNoStanceAdvisoryLanguage } from "@/lib/services/portfolioStance/wording";

function usableCompletion(label: string | null | undefined): string | null {
  if (!label || label === "Insufficient history") return null;
  return label;
}

function scaleImpact(
  current: number | null,
  factor: number,
): number | null {
  if (current == null || !Number.isFinite(current)) return null;
  return Math.round(current * factor * 10) / 10;
}

export type BuildGoalTradeOffsInput = {
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  currentPortfolioValue: number;
  portfolioValueAvailable: boolean;
  stance: PortfolioStance;
  complete: boolean;
};

export function buildGoalTradeOffs(
  input: BuildGoalTradeOffsInput,
): GoalTradeOffs {
  const blockedStance = {
    returnAssumptionsAvailable: false as const,
    returnAssumptionsBlockedReason: STANCE_RETURN_ASSUMPTIONS_BLOCKED_REASON,
    currentScore: input.stance.score,
    currentLabel: input.stance.bandLabel,
    paths: [] as GoalTradeOffs["stance"]["paths"],
  };

  if (!input.hasSavedGoal || !input.goal) {
    const result: GoalTradeOffs = {
      available: false,
      reason: "Goal trade-offs appear once a goal is saved.",
      trajectory: null,
      pathCopy: "Save a goal to explore contribution and stance trade-offs.",
      contribution: { currentMonthly: null, options: [] },
      stance: blockedStance,
      disclaimer: STANCE_ILLUSTRATIVE_DISCLAIMER,
    };
    assertNoStanceAdvisoryLanguage([result.pathCopy, result.reason ?? ""]);
    return result;
  }

  if (!input.portfolioValueAvailable) {
    const result: GoalTradeOffs = {
      available: false,
      reason: "Goal trade-offs need a valued portfolio.",
      trajectory: null,
      pathCopy: "Portfolio value is unavailable, so goal path illustrations cannot run yet.",
      contribution: {
        currentMonthly: Number.isFinite(input.goal.monthlyContribution)
          ? input.goal.monthlyContribution
          : null,
        options: [],
      },
      stance: blockedStance,
      disclaimer: STANCE_ILLUSTRATIVE_DISCLAIMER,
    };
    assertNoStanceAdvisoryLanguage([result.pathCopy, result.reason ?? ""]);
    return result;
  }

  if (!input.complete) {
    const current = buildGoalProgressEngine({
      currentPortfolioValue: input.currentPortfolioValue,
      portfolioValueAvailable: true,
      goal: input.goal,
      hasSavedGoal: true,
    });
    const result: GoalTradeOffs = {
      available: true,
      reason: null,
      trajectory: current.currentTrajectory,
      pathCopy:
        current.currentTrajectory === "Behind"
          ? "Your current path is behind the target timeline."
          : "You’re currently on track. Complete unlocks contribution and stance trade-off exploration.",
      contribution: {
        currentMonthly: input.goal.monthlyContribution,
        options: [],
      },
      stance: blockedStance,
      disclaimer: STANCE_ILLUSTRATIVE_DISCLAIMER,
    };
    assertNoStanceAdvisoryLanguage([result.pathCopy]);
    return result;
  }

  const current = buildGoalProgressEngine({
    currentPortfolioValue: input.currentPortfolioValue,
    portfolioValueAvailable: true,
    goal: input.goal,
    hasSavedGoal: true,
  });
  const presets = buildContributionWhatIfPresets(input.goal.monthlyContribution);
  const options = presets.presets
    .filter((monthly) => {
      const currentMonthly = presets.savedMonthly ?? 0;
      return monthly === currentMonthly || monthly > currentMonthly;
    })
    .slice(0, 4)
    .map((monthly) => {
      const next = buildGoalProgressEngine({
        currentPortfolioValue: input.currentPortfolioValue,
        portfolioValueAvailable: true,
        goal: { ...input.goal!, monthlyContribution: monthly },
        hasSavedGoal: true,
      });
      return {
        monthly,
        projectedCompletionLabel: usableCompletion(next.estimatedCompletionLabel),
        isCurrent: monthly === (presets.savedMonthly ?? input.goal!.monthlyContribution),
      };
    });

  const behind = current.currentTrajectory === "Behind";
  const onTrack =
    current.currentTrajectory === "On track" ||
    current.currentTrajectory === "Ahead";
  const pathCopy = behind
    ? "Your current path is behind the target timeline."
    : onTrack
      ? "You’re currently on track. You can still explore how different contribution or portfolio assumptions would change the modeled path."
      : "You can explore how different contribution assumptions would change the modeled path.";

  const impact = input.stance.inputs?.modeledImpactPercent ?? null;
  const stanceLabel = input.stance.bandLabel ?? "Current stance";
  blockedStance.paths = [
    {
      id: "current",
      label: "Current path",
      stanceLabel: input.stance.score != null
        ? `${stanceLabel} · ${input.stance.score}`
        : stanceLabel,
      modeledDownsidePercent: impact,
      projectedCompletionLabel: usableCompletion(current.estimatedCompletionLabel),
      completionAvailable: false,
    },
    {
      id: "more_defensive",
      label: "Illustrative more defensive structure",
      stanceLabel: "Lower modeled scenario sensitivity",
      modeledDownsidePercent: scaleImpact(
        impact,
        STANCE_SENSITIVITY_ILLUSTRATION.moreDefensive,
      ),
      projectedCompletionLabel: null,
      completionAvailable: false,
    },
    {
      id: "more_offensive",
      label: "Illustrative more offensive structure",
      stanceLabel: "Higher modeled scenario sensitivity",
      modeledDownsidePercent: scaleImpact(
        impact,
        STANCE_SENSITIVITY_ILLUSTRATION.moreOffensive,
      ),
      projectedCompletionLabel: null,
      completionAvailable: false,
    },
  ];

  const result: GoalTradeOffs = {
    available: true,
    reason: null,
    trajectory: current.currentTrajectory,
    pathCopy,
    contribution: {
      currentMonthly: presets.savedMonthly,
      options,
    },
    stance: blockedStance,
    disclaimer: STANCE_ILLUSTRATIVE_DISCLAIMER,
  };

  assertNoStanceAdvisoryLanguage([
    result.pathCopy,
    result.disclaimer,
    result.stance.returnAssumptionsBlockedReason,
    ...result.stance.paths.map((path) => `${path.label} ${path.stanceLabel}`),
  ]);
  return result;
}
