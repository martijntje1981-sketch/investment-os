import { getMarketStatuses } from "@/lib/client/marketStatus";
import { ANALYSIS_PATH, NEWS_HUB_PATH } from "@/lib/navigation/newsHubRoutes";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type {
  IntelligenceBullet,
  InvestmentIntelligence,
  MustWatchRecommendation,
} from "@/lib/services/news/investmentIntelligence";
import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";

const NO_MATERIAL_DEVELOPMENTS = "No material developments were detected.";

const FORBIDDEN_DECISION_PATTERN =
  /\b(buy|sell|increase your position|reduce your position|guaranteed|should outperform)\b/i;

export type TodaysDecisionTone = "neutral" | "positive" | "attention" | "critical";

export type TodaysDecisionResult = {
  statusLabel: string;
  decision: string;
  reason?: string;
  tone: TodaysDecisionTone;
  sourceUrl?: string | null;
  sourceName?: string | null;
  sourceLinkLabel?: "Read article" | "Open source" | "Watch video";
  destinationHref?: string | null;
  destinationLabel?: string | null;
  destinationExternal?: boolean;
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
  for (const item of intelligence.todayMatters) unique.add(item.text);
  for (const item of intelligence.keyRisks) unique.add(item.text);
  for (const item of intelligence.opportunities) unique.add(item.text);
  for (const item of intelligence.macroHighlights) unique.add(item.text);
  if (intelligence.mustWatch) unique.add(intelligence.mustWatch.itemId);
  return unique.size;
}

function sourceFromBullet(
  bullet: IntelligenceBullet | undefined,
): Pick<TodaysDecisionResult, "sourceUrl" | "sourceName" | "sourceLinkLabel"> {
  if (!bullet || !isValidArticleUrl(bullet.canonicalUrl)) {
    return {};
  }

  return {
    sourceUrl: bullet.canonicalUrl,
    sourceName: bullet.sourceName ?? null,
    sourceLinkLabel: "Read article",
  };
}

function sourceFromMustWatch(
  mustWatch: MustWatchRecommendation,
): Pick<TodaysDecisionResult, "sourceUrl" | "sourceName" | "sourceLinkLabel"> {
  if (!isValidArticleUrl(mustWatch.canonicalUrl)) {
    return {};
  }

  return {
    sourceUrl: mustWatch.canonicalUrl,
    sourceName: mustWatch.sourceName,
    sourceLinkLabel:
      mustWatch.type === "video" ? "Watch video" : "Read article",
  };
}

function withSource(
  result: TodaysDecisionResult,
  source: Pick<
    TodaysDecisionResult,
    "sourceUrl" | "sourceName" | "sourceLinkLabel"
  >,
): TodaysDecisionResult {
  if (!source.sourceUrl) {
    return result;
  }
  return { ...result, ...source };
}

const REVIEW_SYMBOL_PATTERN = /\bReview ([A-Z0-9]{1,12})\b/;

function extractReviewSymbol(decision: string): string | null {
  const match = decision.match(REVIEW_SYMBOL_PATTERN);
  return match?.[1] ?? null;
}

function shouldLinkToBriefing(
  result: TodaysDecisionResult,
  intelligence: InvestmentIntelligence | null | undefined,
): boolean {
  if (!intelligence) {
    return false;
  }

  if (
    result.statusLabel === "High attention" ||
    result.statusLabel === "Elevated" ||
    result.statusLabel === "Must watch" ||
    result.statusLabel === "Opportunity" ||
    result.statusLabel === "Upcoming event"
  ) {
    return true;
  }

  if (
    result.reason?.includes("today's portfolio briefing") ||
    result.reason?.includes("latest briefing")
  ) {
    return true;
  }

  if (
    intelligence.portfolioStatus === result.statusLabel &&
    result.decision !== "No action required today." &&
    result.decision !== "No urgent portfolio action is required."
  ) {
    return true;
  }

  return false;
}

export function resolveTodaysDecisionDestination(
  result: TodaysDecisionResult,
  context: Pick<TodaysDecisionContext, "intelligence"> = { intelligence: null },
): Pick<
  TodaysDecisionResult,
  "destinationHref" | "destinationLabel" | "destinationExternal"
> {
  if (isValidArticleUrl(result.sourceUrl)) {
    return {
      destinationHref: result.sourceUrl!.trim(),
      destinationLabel: result.sourceLinkLabel ?? "View insight",
      destinationExternal: true,
    };
  }

  const reviewSymbol = extractReviewSymbol(result.decision);
  if (reviewSymbol) {
    return {
      destinationHref: `/portfolio/${encodeURIComponent(reviewSymbol)}`,
      destinationLabel: "View holding",
      destinationExternal: false,
    };
  }

  if (result.statusLabel === "Goal watch") {
    return {
      destinationHref: "/goals",
      destinationLabel: "View goal",
      destinationExternal: false,
    };
  }

  if (shouldLinkToBriefing(result, context.intelligence)) {
    return {
      destinationHref: NEWS_HUB_PATH,
      destinationLabel: "View briefing",
      destinationExternal: false,
    };
  }

  if (
    result.reason?.includes("Market consensus") ||
    result.reason?.includes("analyst coverage")
  ) {
    return {
      destinationHref: `${ANALYSIS_PATH}#market-consensus`,
      destinationLabel: "View analysis",
      destinationExternal: false,
    };
  }

  return {
    destinationHref: null,
    destinationLabel: null,
    destinationExternal: false,
  };
}

function applyDecisionDestination(
  result: TodaysDecisionResult,
  context: TodaysDecisionContext,
): TodaysDecisionResult {
  return {
    ...result,
    ...resolveTodaysDecisionDestination(result, context),
  };
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
  let result: TodaysDecisionResult;

  if (intelligence?.portfolioStatus === "High Attention") {
    const risk = intelligence.keyRisks[0];
    if (risk) {
      result = withSource(
        {
          statusLabel: "High attention",
          decision: sanitizeDecisionText(risk.text),
          reason: "Why: Elevated portfolio attention was detected in the latest briefing.",
          tone: "critical",
        },
        sourceFromBullet(risk),
      );
      return applyDecisionDestination(result, context);
    }
    if (intelligence.holdingInsights.negative.length > 0) {
      const symbol = intelligence.holdingInsights.negative[0];
      result = {
        statusLabel: "High attention",
        decision: `Review ${symbol} after negative signals in today's briefing.`,
        reason: "Why: One or more holdings show elevated negative signals.",
        tone: "critical",
      };
      return applyDecisionDestination(result, context);
    }
    if (intelligence.todayMatters[0]) {
      result = withSource(
        {
          statusLabel: "High attention",
          decision: sanitizeDecisionText(intelligence.todayMatters[0].text),
          reason: "Why: Today's briefing flagged high-attention portfolio developments.",
          tone: "critical",
        },
        sourceFromBullet(intelligence.todayMatters[0]),
      );
      return applyDecisionDestination(result, context);
    }
  }

  if (
    intelligence &&
    intelligence.portfolioStatus === "Elevated" &&
    intelligence.keyRisks[0]
  ) {
    result = withSource(
      {
        statusLabel: "Elevated",
        decision: sanitizeDecisionText(intelligence.keyRisks[0].text),
        reason: "Why: The latest briefing highlights elevated portfolio risk.",
        tone: "attention",
      },
      sourceFromBullet(intelligence.keyRisks[0]),
    );
    return applyDecisionDestination(result, context);
  }

  const highImpactEvent = findHighImpactEvent(context.upcomingEvents);
  if (highImpactEvent) {
    result = {
      statusLabel: "Upcoming event",
      decision: "Review today's macro events before making changes.",
      reason: `Why: ${highImpactEvent.title} is on the calendar.`,
      tone: "attention",
    };
    return applyDecisionDestination(result, context);
  }

  if (intelligence?.mustWatch) {
    const mustWatch = intelligence.mustWatch;
    result = withSource(
      {
        statusLabel: "Must watch",
        decision: sanitizeDecisionText(`Keep an eye on ${mustWatch.title}`),
        reason: `Why: ${mustWatch.reason}`,
        tone: "attention",
      },
      sourceFromMustWatch(mustWatch),
    );
    return applyDecisionDestination(result, context);
  }

  const opportunity =
    intelligence?.opportunities[0] ?? intelligence?.macroHighlights[0];
  if (opportunity) {
    result = withSource(
      {
        statusLabel: "Opportunity",
        decision: sanitizeDecisionText(opportunity.text),
        reason: "Why: A meaningful opportunity was noted in the latest briefing.",
        tone: "positive",
      },
      sourceFromBullet(opportunity),
    );
    return applyDecisionDestination(result, context);
  }

  if (context.goalProgress && isGoalConcern(context.goalProgress)) {
    result = {
      statusLabel: "Goal watch",
      decision: "Your saved goal trajectory needs monitoring.",
      reason:
        context.goalProgress.status === "Slightly behind"
          ? "Why: Progress is slightly behind the saved target date."
          : "Why: Current progress is behind the saved target date.",
      tone: "attention",
    };
    return applyDecisionDestination(result, context);
  }

  if (
    intelligence &&
    (intelligence.portfolioStatus === "Stable" ||
      intelligence.portfolioStatus === "Watching") &&
    intelligence.keyRisks.length === 0 &&
    !intelligence.mustWatch
  ) {
    if (context.goalProgress?.hasGoal && isGoalHealthy(context.goalProgress)) {
      result = {
        statusLabel: intelligence.portfolioStatus,
        decision: "Your portfolio remains on track. Stay with the current plan.",
        reason: "Why: No material risks or events were identified in the latest briefing.",
        tone: "positive",
      };
      return applyDecisionDestination(result, context);
    }
    result = {
      statusLabel: intelligence.portfolioStatus,
      decision: "No action required today.",
      reason: "Why: No material risks or events were identified in the latest briefing.",
      tone: "positive",
    };
    return applyDecisionDestination(result, context);
  }

  if (context.goalProgress?.hasGoal && isGoalHealthy(context.goalProgress)) {
    result = {
      statusLabel: "On track",
      decision: "Your portfolio remains on track toward its current goal.",
      reason: marketsClosed
        ? "Why: Goal progress looks healthy while markets are closed."
        : "Why: Goal progress remains aligned with your saved target.",
      tone: "positive",
    };
    return applyDecisionDestination(result, context);
  }

  if (!intelligence) {
    result = neutralFallback(
      context.intelligenceFromCache
        ? "The latest cached briefing did not surface an urgent signal."
        : "We're still building today's portfolio briefing. Your portfolio and goal data remain up to date.",
    );
    return applyDecisionDestination(result, context);
  }

  if (intelligence.quietMarket) {
    result = neutralFallback(
      "No material risks or events were identified in the latest briefing.",
    );
    return applyDecisionDestination(result, context);
  }

  if (intelligence.todayMatters[0]) {
    result = withSource(
      {
        statusLabel: intelligence.portfolioStatus,
        decision: sanitizeDecisionText(intelligence.todayMatters[0].text),
        reason: "Why: This stood out in today's portfolio briefing.",
        tone: "attention",
      },
      sourceFromBullet(intelligence.todayMatters[0]),
    );
    return applyDecisionDestination(result, context);
  }

  result = neutralFallback(
    "No material risks or events were identified in the latest briefing.",
  );
  return applyDecisionDestination(result, context);
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
