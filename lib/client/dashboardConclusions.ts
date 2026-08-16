/**
 * Dashboard conclusion-first presentation selectors.
 * Pure — reuses existing engine outputs; does not recalculate business logic.
 */

import { REVIEW_PATH } from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { MarketCalmerResult } from "@/lib/services/marketCalmer";
import type { PersonalActionPlan } from "@/lib/services/personalIntelligence/buildPersonalActionPlan";
import type { ThirtySecondsBriefingView } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence/types";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores/types";

export const DASHBOARD_ACTION_PLAN_MAX_ITEMS = 2;

export type DashboardConclusionCard = {
  eyebrow: string;
  status: string;
  conclusion: string;
  ctaLabel: string;
  ctaHref: string;
};

function clipWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

/**
 * Cap Action Plan rows for Dashboard: 0 on quiet, 1 when one dominates, else ≤2.
 */
export function selectDashboardActionPlanItems(
  plan: PersonalActionPlan,
  input: { isQuiet: boolean; calmerActive: boolean },
): PersonalActionPlan["items"] {
  if (plan.isNoAction || input.isQuiet) {
    return [];
  }

  const items = plan.items.filter(
    (item) => item.category !== "no_action_required",
  );
  if (items.length === 0) return [];

  if (items.length === 1) return items.slice(0, 1);

  // Prefer distinct categories; keep at most 2.
  const selected: typeof items = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.category)) continue;
    seen.add(item.category);
    selected.push(item);
    if (selected.length >= DASHBOARD_ACTION_PLAN_MAX_ITEMS) break;
  }

  // On calmer-active days allow the full 2-item cap; otherwise still max 2.
  void input.calmerActive;
  return selected;
}

export function buildPersonalIntelligenceConclusion(input: {
  intelligence: PersonalIntelligenceToday;
  view: ThirtySecondsBriefingView;
  calmer: MarketCalmerResult;
  actionPlan: PersonalActionPlan;
  /** When set, suppress attention lines that repeat the same structural theme. */
  resilienceSensitivityName?: string | null;
}): {
  isQuiet: boolean;
  primaryConclusion: string;
  attentionLine: string | null;
  /** Contextual destination for the primary conclusion itself. */
  ctaLabel: string;
  ctaHref: string;
  /**
   * When false, UI should omit the footer CTA — primary/action rows already
   * carry destinations (avoids duplicate “See why”).
   */
  showFooterCta: boolean;
} {
  const { view, calmer } = input;
  const mainDriver = view.drivers[0] ?? null;

  if (view.isQuiet && calmer.activation === "inactive") {
    return {
      isQuiet: true,
      primaryConclusion: "You’re up to date.",
      attentionLine:
        view.supportingQuietLine?.trim() ||
        "Nothing material requires your attention today.",
      ctaLabel: "View review",
      ctaHref: REVIEW_PATH,
      showFooterCta: true,
    };
  }

  let primaryConclusion: string;
  if (calmer.activation !== "inactive" && calmer.headline) {
    primaryConclusion = clipWords(calmer.headline, 16);
  } else if (mainDriver) {
    primaryConclusion = clipWords(
      `${mainDriver.name} is today’s main driver.`,
      12,
    );
  } else {
    primaryConclusion = clipWords(view.headline, 18);
  }

  // Prefer Action Plan rows as the actionable conclusions — avoid duplicating
  // the same headline under “1 thing worth your attention”.
  const attentionLine: string | null = null;
  void input.actionPlan;
  void input.resilienceSensitivityName;

  let ctaLabel: string;
  let ctaHref: string;
  if (calmer.activation !== "inactive") {
    ctaLabel = "Explore scenarios";
    ctaHref = DASHBOARD_DEEP_LINKS.scenarioStress;
  } else if (mainDriver) {
    ctaLabel = "View today’s performance";
    ctaHref = DASHBOARD_DEEP_LINKS.portfolioPerformance;
  } else {
    ctaLabel = "View review";
    ctaHref = REVIEW_PATH;
  }

  // Active days: conclusion link sits with the primary line; omit footer “See why”.
  const showFooterCta = false;

  return {
    isQuiet: false,
    primaryConclusion,
    attentionLine,
    ctaLabel,
    ctaHref,
    showFooterCta,
  };
}

export function buildResilienceConclusion(
  profile: ResilienceProfile,
): DashboardConclusionCard | null {
  if (profile.status !== "ok" || profile.score === null) return null;

  const status = `${profile.score} / 100${profile.bandLabel ? ` · ${profile.bandLabel}` : ""}`;
  let conclusion: string;
  if (profile.mostSensitive) {
    conclusion = clipWords(
      `${profile.mostSensitive.scenarioName} remains your largest modeled sensitivity.`,
      14,
    );
  } else if (profile.primaryDriverExplanation) {
    conclusion = clipWords(profile.primaryDriverExplanation, 18);
  } else {
    conclusion = clipWords(profile.summary, 18);
  }

  return {
    eyebrow: "Portfolio resilience",
    status,
    conclusion,
    ctaLabel: "Explore scenarios & resilience",
    ctaHref: DASHBOARD_DEEP_LINKS.scenarioStress,
  };
}

function formatGoalTargetShort(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const rounded =
      Math.abs(millions - Math.round(millions)) < 0.05
        ? Math.round(millions).toString()
        : millions.toFixed(1);
    return `€${rounded}M`;
  }
  if (value >= 1_000) {
    return `€${Math.round(value / 1_000)}k`;
  }
  return `€${Math.round(value)}`;
}

export function buildGoalConclusion(
  progress: GoalProgress,
): DashboardConclusionCard | null {
  if (!progress.hasGoal) return null;

  const needsAttention =
    progress.status === "Slightly behind" ||
    progress.status === "Behind schedule";
  const targetLabel = formatGoalTargetShort(progress.targetValue);

  const status = needsAttention
    ? "Goal needs attention"
    : progress.goalReached
      ? "Goal reached"
      : targetLabel
        ? `On track for ${targetLabel}`
        : progress.status;

  let conclusion: string;
  if (progress.goalReached) {
    conclusion = "Your portfolio has reached the saved target value.";
  } else if (needsAttention) {
    conclusion = clipWords(
      "Current trajectory is behind your saved target assumptions.",
      14,
    );
  } else {
    const datePart =
      progress.estimatedCompletionLabel &&
      progress.estimatedCompletionLabel !== "Insufficient history"
        ? `Current projection: ${progress.estimatedCompletionLabel}.`
        : `${Math.round(progress.currentProgressPercent)}% of target so far.`;
    conclusion = clipWords(datePart, 12);
  }

  return {
    eyebrow: "Goal",
    status,
    conclusion,
    ctaLabel: needsAttention ? "Review goal" : "View goal",
    ctaHref: DASHBOARD_DEEP_LINKS.goalProgress,
  };
}

export function buildMarketConclusion(input: {
  portfolioStatus: string | null;
  leadTitle: string | null;
  quietMarket?: boolean;
}): DashboardConclusionCard | null {
  if (!input.leadTitle?.trim()) return null;

  const status = input.portfolioStatus ?? "Markets today";
  const conclusion = clipWords(input.leadTitle, 18);

  return {
    eyebrow: "Markets today",
    status,
    conclusion,
    ctaLabel: "Markets today",
    ctaHref: DASHBOARD_DEEP_LINKS.marketBriefing,
  };
}

export function buildHoldingsConclusion(
  snapshot: DashboardPortfolioSnapshot,
): { summaryLine: string } | null {
  const holdings = snapshot.marketHoldings;
  if (holdings.length === 0) return null;

  const largest = [...holdings]
    .filter((row) => row.portfolioWeightPercent !== null)
    .sort(
      (left, right) =>
        (right.portfolioWeightPercent ?? 0) - (left.portfolioWeightPercent ?? 0),
    )[0];

  const withMove = holdings
    .map((row) => ({
      row,
      move: row.dailyChangePercent,
    }))
    .filter((entry) => entry.move !== null && Number.isFinite(entry.move));

  const strongest = [...withMove].sort(
    (left, right) => (right.move as number) - (left.move as number),
  )[0];

  const countLabel = `${holdings.length} holding${holdings.length === 1 ? "" : "s"}`;
  const largestLabel =
    largest && largest.portfolioWeightPercent !== null
      ? `largest: ${largest.symbol} ${Math.round(largest.portfolioWeightPercent)}%`
      : null;

  let strongestLabel: string | null = null;
  if (strongest && (strongest.move as number) > 0) {
    const move = strongest.move as number;
    const sign = move > 0 ? "+" : "";
    strongestLabel = `Strongest today: ${strongest.row.symbol} ${sign}${move.toFixed(1)}%`;
  }

  const parts = [countLabel, largestLabel, strongestLabel].filter(Boolean);
  return { summaryLine: parts.join(" · ") };
}

export function buildReviewConclusion(input: {
  pulse: PortfolioPulseResult | null;
  isQuietDay: boolean;
}): DashboardConclusionCard {
  let conclusion =
    "Open your full review for the latest portfolio narrative.";

  const combined = input.pulse?.combinedSummary?.trim();
  const weekly = input.pulse?.weekly?.summary?.trim();
  const monthly = input.pulse?.monthly?.summary?.trim();
  const source = combined || weekly || monthly;
  if (source) {
    conclusion = clipWords(source, 18);
  } else if (input.isQuietDay) {
    conclusion = "Nothing material stood out for a deeper follow-up today.";
  }

  return {
    eyebrow: "Your review",
    status: input.isQuietDay ? "Quiet" : "Available",
    conclusion,
    ctaLabel: "View full review",
    ctaHref: REVIEW_PATH,
  };
}
