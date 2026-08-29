import {
  formatExpectedReturnAssumptionContext,
  getExpectedReturnAssumption,
} from "@/lib/client/expectedReturnAssumption";
import { buildGoalSensitivityFromScenario } from "@/lib/services/goalSensitivity";
import {
  isMeaningfulRecentPace,
  type GoalRealityCheck,
} from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { ResilienceProfile } from "@/lib/services/resilience";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { IntelligenceTrace, IntelligenceTraceLayer } from "./types";

function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function buildOnTrackTrace(input: {
  insight: string;
  progress: GoalProgress;
  goal: GoalSettings | null;
  realityCheck: GoalRealityCheck | null;
  resilienceProfile?: ResilienceProfile | null;
}): IntelligenceTrace | null {
  const { progress, goal, realityCheck, resilienceProfile, insight } = input;
  if (!progress.hasGoal || !goal) return null;
  const savedAssumption = getExpectedReturnAssumption(goal);

  const evidenceBullets = [
    `Current portfolio value: ${formatMoney(progress.currentValue)}`,
    `Target value: ${formatMoney(progress.targetValue)}`,
    `Current goal progress: ${formatPercent(progress.currentProgressPercent)}`,
    `Remaining gap: ${formatMoney(progress.remainingAmount)}`,
    `Target year: ${goal.targetYear}`,
    `Planned monthly contribution: ${formatMoney(goal.monthlyContribution)}`,
  ];

  const layers: IntelligenceTraceLayer[] = [
    {
      id: "evidence",
      title: "Evidence",
      detail: "Goal status comes directly from your saved target and the current valued portfolio.",
      bullets: evidenceBullets,
      presentation: "expand",
      href: "/goals",
      emphasis: "supporting",
    },
    {
      id: "meaning",
      title: "What it means",
      detail: progress.summary,
      presentation: "expand",
      href: "/goals",
      emphasis: "high",
    },
  ];

  if (
    progress.estimatedCompletionLabel &&
    progress.estimatedCompletionLabel !== "Insufficient history" &&
    progress.estimatedCompletionLabel !== "Unavailable"
  ) {
    layers.push({
      id: "sensitivity",
      title: "Projection",
      detail: `Under your current assumptions, estimated completion is ${progress.estimatedCompletionLabel}.`,
      presentation: "expand",
      href: "/goals",
      emphasis: "high",
    });
  }

  if (resilienceProfile?.mostSensitive) {
    const scenario = resilienceProfile.scenarioResults.find(
      (row) => row.scenarioId === resilienceProfile.mostSensitive?.scenarioId,
    );
    if (scenario) {
      const goalSensitivity = buildGoalSensitivityFromScenario({
        scenarioResult: scenario,
        goal,
        hasSavedGoal: true,
        currentPortfolioValue: progress.currentValue,
      });
      if (
        goalSensitivity.status === "ok" &&
        goalSensitivity.currentProgressPercent != null &&
        goalSensitivity.stressedProgressPercent != null
      ) {
        layers.push({
          id: "goal_impact",
          title: "Sensitivity",
          detail: `Under ${resilienceProfile.mostSensitive.scenarioName}, goal progress would move from approximately ${goalSensitivity.currentProgressPercent.toFixed(1)}% to ${goalSensitivity.stressedProgressPercent.toFixed(1)}%.`,
          presentation: "explore",
          href: DASHBOARD_DEEP_LINKS.whatIf,
          emphasis: "high",
        });
      }
    }
  }

  const calcBullets = [
    "goal progress (%) ≈ current portfolio value ÷ target value × 100",
    `Saved monthly contribution: ${formatMoney(goal.monthlyContribution)}`,
  ];
  if (savedAssumption !== null) {
    calcBullets.splice(
      1,
      0,
      `Saved planning assumption: ${formatExpectedReturnAssumptionContext(savedAssumption)}`,
    );
  }
  layers.push({
    id: "calculation",
    title: "How Tobailey calculated this",
    detail:
      savedAssumption !== null
        ? "Goal progress uses your current valued portfolio against the saved target, then applies your saved planning assumptions for projection views."
        : "Goal progress uses your current valued portfolio against the saved target and omits planning-assumption detail when none is reliably available.",
    bullets: calcBullets,
    presentation: "explore",
    href: "/goals",
    emphasis: "supporting",
  });

  const confidenceBullets: string[] = [];
  if (!progress.portfolioValueAvailable) {
    confidenceBullets.push(
      "Portfolio value is unavailable, so progress cannot be calculated reliably.",
    );
  }
  if (isMeaningfulRecentPace(realityCheck)) {
    confidenceBullets.push(realityCheck.disclaimer);
  } else {
    confidenceBullets.push(
      "Recent portfolio history isn’t yet sufficient for a meaningful pace comparison.",
    );
  }
  if (
    progress.estimatedCompletionLabel === "Insufficient history" ||
    progress.estimatedCompletionLabel === "Unavailable"
  ) {
    confidenceBullets.push(
      "Completion timing is unavailable because the current history basis is insufficient.",
    );
  }
  layers.push({
    id: "confidence",
    title: "Data confidence",
    detail: confidenceBullets[0],
    bullets: confidenceBullets.length > 1 ? confidenceBullets.slice(1) : undefined,
    presentation: "explore",
    emphasis: "low",
  });

  return {
    insight,
    layers,
    omittedLayerIds: ["change"],
  };
}
