/**
 * Phase 1C — Personal Action Plan selection.
 * Deterministic categories from PersonalIntelligenceToday. No advice, no fetch.
 */

import {
  GOALS_PATH,
  REVIEW_PATH,
} from "@/lib/navigation/appRoutes";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  isNavigableNewsUrl,
  sanitizeNewsUrl,
} from "@/lib/services/news/sanitizeNewsUrl";
import {
  ATTRIBUTION_CONCENTRATION_WEIGHT,
  ATTRIBUTION_DOMINANT_SHARE,
  ATTRIBUTION_MATERIAL_MIN_PP,
  dominantMaterialDriverShare,
} from "@/lib/services/personalIntelligence/attribution";
import { selectThirtySecondsDrivers } from "@/lib/services/personalIntelligence/thirtySecondsBriefing";
import type { PersonalIntelligenceToday } from "@/lib/services/personalIntelligence/types";

export const ACTION_PLAN_MAX_ITEMS = 3;
/** @deprecated Prefer ATTRIBUTION_CONCENTRATION_WEIGHT */
export const ACTION_PLAN_CONCENTRATION_WEIGHT = ATTRIBUTION_CONCENTRATION_WEIGHT;
/** @deprecated Prefer ATTRIBUTION_DOMINANT_SHARE */
export const ACTION_PLAN_DOMINANT_DRIVER_SHARE = ATTRIBUTION_DOMINANT_SHARE;

export type ActionPlanCategory =
  | "watch"
  | "understand"
  | "look_ahead"
  | "goal"
  | "review"
  | "no_action_required";

export type PersonalActionPlanVisualKind = "holding" | "news" | "none";

export type PersonalActionPlanItem = {
  id: string;
  category: ActionPlanCategory;
  categoryLabel: string;
  headline: string;
  detail: string;
  href?: string | null;
  hrefLabel?: string | null;
  /** When true, href is a verified external article URL (open in new tab). */
  hrefExternal?: boolean;
  /** Optional entity for contextual visuals — never invented. */
  entitySymbol?: string | null;
  entityName?: string | null;
  thumbnailUrl?: string | null;
  mediaType?: "article" | "video" | null;
  sourceName?: string | null;
  visualKind?: PersonalActionPlanVisualKind;
  /** Verified mustWatch item id when WATCH is story-backed. */
  storyId?: string | null;
};

export type PersonalActionPlan = {
  version: "pi-action-v1";
  items: PersonalActionPlanItem[];
  isNoAction: boolean;
};

const CATEGORY_LABEL: Record<ActionPlanCategory, string> = {
  watch: "Watch",
  understand: "Understand",
  look_ahead: "Look ahead",
  goal: "Goal",
  review: "Review",
  no_action_required: "No action required",
};

const CATEGORY_PRIORITY: Record<ActionPlanCategory, number> = {
  watch: 0,
  understand: 1,
  review: 2,
  goal: 3,
  look_ahead: 4,
  no_action_required: 5,
};

/** Phrases that must never appear in Action Plan copy (advisory / trade language). */
export const ACTION_PLAN_PROHIBITED_PATTERNS: RegExp[] = [
  /\bbuy\b/i,
  /\bsell\b/i,
  /\bhold\b(?!ing)/i,
  /\brebalance\b/i,
  /\bincrease (this |your |the )?position\b/i,
  /\bdecrease (this |your |the )?position\b/i,
  /\bshould (buy|sell|hold|trade)\b/i,
  /\bbest strategy\b/i,
  /\bdo nothing is the best\b/i,
  /\bguaranteed\b/i,
  /\bwill (rise|fall|rally|crash)\b/i,
];

function categoryLabel(category: ActionPlanCategory): string {
  return CATEGORY_LABEL[category];
}

function item(
  partial: Omit<PersonalActionPlanItem, "categoryLabel">,
): PersonalActionPlanItem {
  return {
    ...partial,
    categoryLabel: categoryLabel(partial.category),
    visualKind: partial.visualKind ?? "none",
  };
}

function clipWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return text.trim();
  return `${words.slice(0, maxWords).join(" ")}…`;
}

function largestHoldingWeight(
  intelligence: PersonalIntelligenceToday,
): { name: string; symbol: string; weightPercent: number } | null {
  let best: { name: string; symbol: string; weightPercent: number } | null =
    null;
  for (const row of intelligence.holdingsWeights) {
    if (!Number.isFinite(row.weightPercent)) continue;
    if (!best || row.weightPercent > best.weightPercent) {
      best = {
        name: row.name || row.symbol,
        symbol: row.symbol,
        weightPercent: row.weightPercent,
      };
    }
  }
  return best;
}

function buildWatchCandidate(
  intelligence: PersonalIntelligenceToday,
): PersonalActionPlanItem | null {
  const news = intelligence.news;
  if (!news || news.quietMarket || !news.mustWatch) {
    return null;
  }

  const mustWatch = news.mustWatch;
  const linked = [
    ...(news.holdingInsights.negative ?? []),
    ...(news.holdingInsights.positive ?? []),
  ]
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .slice(0, 2);

  const verifiedTitle = mustWatch.title?.trim() ?? "";
  const headline = verifiedTitle
    ? clipWords(verifiedTitle, 12)
    : "A portfolio-linked development is worth monitoring";

  const leadSymbol = linked[0] ?? null;
  const storyUrl = isNavigableNewsUrl(mustWatch.canonicalUrl)
    ? sanitizeNewsUrl(mustWatch.canonicalUrl)
    : null;

  return item({
    id: "action-watch-news",
    category: "watch",
    headline,
    detail:
      linked.length > 0
        ? `A development connected to holdings such as ${linked.join(" and ")} is flagged for monitoring.`
        : "A development connected to your holdings is flagged for monitoring.",
    href: storyUrl ?? DASHBOARD_DEEP_LINKS.portfolioNews,
    hrefLabel: storyUrl ? "Open story" : "Open News",
    hrefExternal: Boolean(storyUrl),
    storyId: mustWatch.itemId || null,
    entitySymbol: leadSymbol,
    entityName: leadSymbol,
    thumbnailUrl: mustWatch.thumbnailUrl ?? null,
    mediaType: mustWatch.type,
    sourceName: mustWatch.sourceName || null,
    visualKind: mustWatch.thumbnailUrl
      ? "news"
      : leadSymbol
        ? "holding"
        : "none",
  });
}

function buildUnderstandCandidate(
  intelligence: PersonalIntelligenceToday,
  options?: BuildPersonalActionPlanOptions,
): PersonalActionPlanItem | null {
  const ranked = [
    ...intelligence.topContributors,
    ...intelligence.topDetractors,
  ];
  const dominant = dominantMaterialDriverShare(ranked);
  if (
    !dominant ||
    dominant.shareOfMaterialAbs < ATTRIBUTION_DOMINANT_SHARE ||
    Math.abs(dominant.contributionPp) < ATTRIBUTION_MATERIAL_MIN_PP
  ) {
    return null;
  }

  const suppressSymbols = new Set(
    (options?.suppressUnderstandForSymbols ?? []).map((symbol) =>
      symbol.trim().toUpperCase(),
    ),
  );
  if (suppressSymbols.has(dominant.symbol.trim().toUpperCase())) {
    // Market Calmer already explained this driver on a notable/high-stress day.
    return null;
  }

  const driversShown = selectThirtySecondsDrivers(intelligence);
  const topAlreadyNamed = driversShown.some(
    (driver) =>
      driver.symbol.trim().toUpperCase() ===
      dominant.symbol.trim().toUpperCase(),
  );

  const label = dominant.symbol || dominant.name;

  return item({
    id: "action-understand-driver",
    category: "understand",
    headline: topAlreadyNamed
      ? `${label} still accounts for most of today’s move`
      : `${label} drove most of today’s portfolio move`,
    detail: topAlreadyNamed
      ? `${dominant.name} accounts for most of today’s material portfolio movement, concentrating short-term results in fewer drivers.`
      : `Most of today’s material change is coming from ${dominant.name}, rather than a broad portfolio move.`,
    href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    hrefLabel: "View performance",
    entitySymbol: dominant.symbol,
    entityName: dominant.name,
    visualKind: "holding",
  });
}

function buildReviewConcentrationCandidate(
  intelligence: PersonalIntelligenceToday,
): PersonalActionPlanItem | null {
  // Single-holding portfolios are concentrated by definition — not a new signal.
  if (intelligence.holdingsWeights.length < 2) {
    return null;
  }

  const largest = largestHoldingWeight(intelligence);
  if (
    !largest ||
    largest.weightPercent < ATTRIBUTION_CONCENTRATION_WEIGHT
  ) {
    return null;
  }

  const weight = Math.round(largest.weightPercent);

  return item({
    id: "action-review-concentration",
    category: "review",
    headline: `${largest.symbol} represents ${weight}% of your portfolio`,
    detail: `${largest.name} is about ${weight}% of portfolio value. You may want to review whether that still matches the portfolio structure you intended.`,
    href: DASHBOARD_DEEP_LINKS.portfolioExposure,
    hrefLabel: "View exposure",
    entitySymbol: largest.symbol,
    entityName: largest.name,
    visualKind: "holding",
  });
}

function buildReviewCoverageCandidate(
  intelligence: PersonalIntelligenceToday,
): PersonalActionPlanItem | null {
  const move = intelligence.portfolioMove;
  if (!move?.hasDailyData || move.coverageComplete) return null;
  if (move.eligibleMarketHoldingCount <= 0) return null;
  const missing =
    move.eligibleMarketHoldingCount - move.validPerformanceCount;
  if (missing <= 0) return null;

  return item({
    id: "action-review-coverage",
    category: "review",
    headline: "Today’s move uses partial holding coverage",
    detail: `${move.validPerformanceCount} of ${move.eligibleMarketHoldingCount} market holdings have usable daily performance. Treat the day move as incomplete until coverage improves.`,
    href: REVIEW_PATH,
    hrefLabel: "Open Your Review",
    visualKind: "none",
  });
}

function buildGoalCandidate(
  intelligence: PersonalIntelligenceToday,
): PersonalActionPlanItem | null {
  const goals = intelligence.goals;
  if (!goals?.hasGoal || !goals.status) return null;

  if (goals.goalReached) {
    return item({
      id: "action-goal-reached",
      category: "goal",
      headline: "Your goal model shows the target as reached",
      detail:
        "Based on your saved goal inputs and available portfolio value.",
      href: GOALS_PATH,
      hrefLabel: "Open Goals",
      visualKind: "none",
    });
  }

  if (
    goals.status === "Behind schedule" ||
    goals.status === "Slightly behind"
  ) {
    const progress =
      goals.currentProgressPercent != null
        ? ` Current progress is about ${Math.round(goals.currentProgressPercent)}% of target.`
        : "";
    return item({
      id: "action-goal-behind",
      category: "goal",
      headline: `Goal status: ${goals.status.toLowerCase()}`,
      detail: `Your long-term goal model shows a behind-schedule reading based on current inputs.${progress}`,
      href: GOALS_PATH,
      hrefLabel: "Open Goals",
      visualKind: "none",
    });
  }

  // Do not manufacture “on track” noise on quiet days.
  return null;
}

/**
 * LOOK AHEAD is omitted in Phase 1C — EODHD calendar/events are not trusted.
 */
export function buildLookAheadCandidate(): PersonalActionPlanItem | null {
  return null;
}

function noActionItem(): PersonalActionPlanItem {
  return item({
    id: "action-no-action",
    category: "no_action_required",
    headline: "Nothing materially requires your attention today",
    detail:
      "No material portfolio, news, or goal signals need a follow-up right now.",
    visualKind: "none",
  });
}

function assertNonAdvisory(items: PersonalActionPlanItem[]): void {
  for (const entry of items) {
    // Watch headlines are verified external news titles and may contain words like
    // "hold" / "sell" (e.g. "Fed to hold rates") without being product advice.
    // Assert only our generated copy for Watch; assert full copy elsewhere.
    const blob =
      entry.category === "watch"
        ? `${entry.detail} ${entry.hrefLabel ?? ""}`
        : `${entry.headline} ${entry.detail} ${entry.hrefLabel ?? ""}`;
    for (const pattern of ACTION_PLAN_PROHIBITED_PATTERNS) {
      if (pattern.test(blob)) {
        throw new Error(
          `Action Plan advisory language detected (${pattern}): ${blob}`,
        );
      }
    }
  }
}

/**
 * Build 1–3 Action Plan items (or a single NO ACTION REQUIRED state).
 */
export type BuildPersonalActionPlanOptions = {
  /** Skip Understand when Market Calmer already named these symbols. */
  suppressUnderstandForSymbols?: string[];
};

export function buildPersonalActionPlan(
  intelligence: PersonalIntelligenceToday,
  options?: BuildPersonalActionPlanOptions,
): PersonalActionPlan {
  const candidates = [
    buildWatchCandidate(intelligence),
    buildUnderstandCandidate(intelligence, options),
    buildReviewConcentrationCandidate(intelligence),
    buildReviewCoverageCandidate(intelligence),
    buildGoalCandidate(intelligence),
    buildLookAheadCandidate(),
  ].filter((entry): entry is PersonalActionPlanItem => entry != null);

  candidates.sort(
    (a, b) => CATEGORY_PRIORITY[a.category] - CATEGORY_PRIORITY[b.category],
  );

  const selected = candidates.slice(0, ACTION_PLAN_MAX_ITEMS);

  if (selected.length === 0) {
    const quiet = [noActionItem()];
    assertNonAdvisory(quiet);
    return {
      version: "pi-action-v1",
      items: quiet,
      isNoAction: true,
    };
  }

  assertNonAdvisory(selected);
  return {
    version: "pi-action-v1",
    items: selected,
    isNoAction: false,
  };
}
