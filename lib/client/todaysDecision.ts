import { getMarketStatuses } from "@/lib/client/marketStatus";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";

const NO_MATERIAL_DEVELOPMENTS = "No material developments were detected.";

const FORBIDDEN_DECISION_PATTERN =
  /\b(buy|sell|increase your position|reduce your position|guaranteed|should outperform)\b/i;

export type TodaysDecisionTone = "neutral" | "watch" | "elevated" | "urgent";

export type TodaysDecisionResult = {
  statusLabel: string;
  decision: string;
  reason?: string;
  tone: TodaysDecisionTone;
};

export type TodaysDecisionContext = {
  intelligence: InvestmentIntelligence | null;
  intelligenceFromCache: boolean;
  upcomingEvents?: UpcomingMarketEvent[];
  goalProgress?: Pick<
    GoalProgress,
    "hasGoal" | "currentTrajectory" | "status" | "goalReached"
  > | null;
  marketsClosed?: boolean;
};

export type IntelligenceDisplayContext = {
  intelligence: InvestmentIntelligence | null;
  intelligenceFromCache: boolean;
  goalProgress?: Pick<
    GoalProgress,
    "hasGoal" | "currentTrajectory" | "status" | "goalReached"
  > | null;
  marketsClosed?: boolean;
};

function isGoalHealthy(
  goalProgress: NonNullable<TodaysDecisionContext["goalProgress"]>,
): boolean {
  return (
    goalProgress.goalReached ||
    goalProgress.status === "On track" ||
    goalProgress.status === "Ahead of schedule"
  );
}

function isGoalConcern(
  goalProgress: NonNullable<TodaysDecisionContext["goalProgress"]>,
): boolean {
  return (
    goalProgress.hasGoal &&
    !goalProgress.goalReached &&
    (goalProgress.currentTrajectory === "Behind" ||
      goalProgress.status === "Behind schedule" ||
      goalProgress.status === "Slightly behind")
  );
}

function sanitizeDecisionText(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) {
    return "No urgent portfolio action is required.";
  }
  if (FORBIDDEN_DECISION_PATTERN.test(trimmed)) {
    return "Review today's briefing before making portfolio changes.";
  }
  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}

function countPortfolioDevelopments(intelligence: InvestmentIntelligence): number {
  const unique = new Set<string>();
  for (const item of intelligence.todayMatters) unique.add(item);
  for (const item of intelligence.keyRisks) unique.add(item);
  for (const item of intelligence.opportunities) unique.add(item);
  for (const item of intelligence.macroHighlights) unique.add(item);
  if (intelligence.mustWatch) unique.add(intelligence.mustWatch.itemId);
  return unique.size;
}

function findHighImpactEvent(
  events: UpcomingMarketEvent[] | undefined,
): UpcomingMarketEvent | null {
  if (!events?.length) return null;
  return events.find((event) => event.impact === "High") ?? null;
}

function neutralFallback(reason: string): TodaysDecisionResult {
  return {
    statusLabel: "Stable",
    decision: "No urgent portfolio action is required.",
    reason: `Why: ${reason}`,
    tone: "neutral",
  };
}

export function areMajorMarketsClosed(date = new Date()): boolean {
  const statuses = getMarketStatuses(date);
  const tradable = statuses.filter(
    (market) => market.label === "Europe" || market.label === "United States",
  );
  if (tradable.length === 0) return false;
  return tradable.every(
    (market) => market.status !== "open" && market.status !== "always-open",
  );
}

export function buildTodaysDecision(
  context: TodaysDecisionContext,
): TodaysDecisionResult {
  const intelligence = context.intelligence;
  const marketsClosed = context.marketsClosed ?? areMajorMarketsClosed();

  if (intelligence?.portfolioStatus === "High Attention") {
    const risk = intelligence.keyRisks[0];
    if (risk) {
      return {
        statusLabel: "High attention",
        decision: sanitizeDecisionText(risk),
        reason: "Why: Elevated portfolio attention was detected in the latest briefing.",
        tone: "urgent",
      };
    }
    if (intelligence.holdingInsights.negative.length > 0) {
      const symbol = intelligence.holdingInsights.negative[0];
      return {
        statusLabel: "High attention",
        decision: `Review ${symbol} after negative signals in today's briefing.`,
        reason: "Why: One or more holdings show elevated negative signals.",
        tone: "urgent",
      };
    }
    if (intelligence.todayMatters[0]) {
      return {
        statusLabel: "High attention",
        decision: sanitizeDecisionText(intelligence.todayMatters[0]),
        reason: "Why: Today's briefing flagged high-attention portfolio developments.",
        tone: "urgent",
      };
    }
  }

  if (
    intelligence &&
    intelligence.portfolioStatus === "Elevated" &&
    intelligence.keyRisks[0]
  ) {
    return {
      statusLabel: "Elevated",
      decision: sanitizeDecisionText(intelligence.keyRisks[0]),
      reason: "Why: The latest briefing highlights elevated portfolio risk.",
      tone: "elevated",
    };
  }

  const highImpactEvent = findHighImpactEvent(context.upcomingEvents);
  if (highImpactEvent) {
    return {
      statusLabel: "Upcoming event",
      decision: "Review today's macro events before making changes.",
      reason: `Why: ${highImpactEvent.title} is on the calendar.`,
      tone: "watch",
    };
  }

  if (intelligence?.mustWatch) {
    const mustWatch = intelligence.mustWatch;
    return {
      statusLabel: "Must watch",
      decision: sanitizeDecisionText(`Keep an eye on ${mustWatch.title}`),
      reason: `Why: ${mustWatch.reason}`,
      tone: "watch",
    };
  }

  const opportunity =
    intelligence?.opportunities[0] ?? intelligence?.macroHighlights[0];
  if (opportunity) {
    return {
      statusLabel: "Opportunity",
      decision: sanitizeDecisionText(opportunity),
      reason: "Why: A meaningful opportunity was noted in the latest briefing.",
      tone: "watch",
    };
  }

  if (context.goalProgress && isGoalConcern(context.goalProgress)) {
    return {
      statusLabel: "Goal watch",
      decision: "Your saved goal trajectory needs monitoring.",
      reason:
        context.goalProgress.status === "Slightly behind"
          ? "Why: Progress is slightly behind the saved target date."
          : "Why: Current progress is behind the saved target date.",
      tone: "watch",
    };
  }

  if (
    intelligence &&
    (intelligence.portfolioStatus === "Stable" ||
      intelligence.portfolioStatus === "Watching") &&
    intelligence.keyRisks.length === 0 &&
    !intelligence.mustWatch
  ) {
    if (context.goalProgress?.hasGoal && isGoalHealthy(context.goalProgress)) {
      return {
        statusLabel: intelligence.portfolioStatus,
        decision: "Your portfolio remains on track. Stay with the current plan.",
        reason: "Why: No material risks or events were identified in the latest briefing.",
        tone: "neutral",
      };
    }
    return {
      statusLabel: intelligence.portfolioStatus,
      decision: "No action required today.",
      reason: "Why: No material risks or events were identified in the latest briefing.",
      tone: "neutral",
    };
  }

  if (context.goalProgress?.hasGoal && isGoalHealthy(context.goalProgress)) {
    return {
      statusLabel: "On track",
      decision: "Your portfolio remains on track toward its current goal.",
      reason: marketsClosed
        ? "Why: Goal progress looks healthy while markets are closed."
        : "Why: Goal progress remains aligned with your saved target.",
      tone: "neutral",
    };
  }

  if (!intelligence) {
    return neutralFallback(
      context.intelligenceFromCache
        ? "The latest cached briefing did not surface an urgent signal."
        : "We're still building today's portfolio briefing. Your portfolio and goal data remain up to date.",
    );
  }

  if (intelligence.quietMarket) {
    return neutralFallback(
      "No material risks or events were identified in the latest briefing.",
    );
  }

  if (intelligence.todayMatters[0]) {
    return {
      statusLabel: intelligence.portfolioStatus,
      decision: sanitizeDecisionText(intelligence.todayMatters[0]),
      reason: "Why: This stood out in today's portfolio briefing.",
      tone: "watch",
    };
  }

  return neutralFallback(
    "No material risks or events were identified in the latest briefing.",
  );
}

export function buildIntelligenceDisplayMessage(
  context: IntelligenceDisplayContext,
): string {
  const { intelligence, intelligenceFromCache, goalProgress } = context;
  const marketsClosed = context.marketsClosed ?? areMajorMarketsClosed();

  if (!intelligence) {
    if (goalProgress?.hasGoal && isGoalHealthy(goalProgress)) {
      return "Your portfolio remains on track toward its current goal.";
    }
    return "We're still building today's portfolio briefing. Your portfolio and goal data remain up to date.";
  }

  const developmentCount = countPortfolioDevelopments(intelligence);

  if (marketsClosed && developmentCount > 0) {
    return `Markets are closed, but ${developmentCount} portfolio-relevant development${developmentCount === 1 ? " is" : "s are"} worth watching.`;
  }

  if (
    intelligence.keyRisks.length === 0 &&
    (intelligence.portfolioStatus === "Stable" ||
      intelligence.quietMarket) &&
    intelligence.portfolioSummary !== NO_MATERIAL_DEVELOPMENTS
  ) {
    return intelligence.portfolioSummary;
  }

  if (
    intelligence.keyRisks.length === 0 &&
    (intelligence.portfolioStatus === "Stable" || intelligence.quietMarket)
  ) {
    return "No urgent portfolio risks detected in the latest briefing.";
  }

  if (goalProgress?.hasGoal && isGoalHealthy(goalProgress) && intelligence.quietMarket) {
    return "Your portfolio remains on track toward its current goal.";
  }

  if (intelligenceFromCache && intelligence.portfolioSummary === NO_MATERIAL_DEVELOPMENTS) {
    return "Latest portfolio briefing loaded from the most recent update.";
  }

  if (
    intelligence.portfolioSummary &&
    intelligence.portfolioSummary !== NO_MATERIAL_DEVELOPMENTS
  ) {
    return intelligence.portfolioSummary;
  }

  return "No urgent portfolio risks detected in the latest briefing.";
}
