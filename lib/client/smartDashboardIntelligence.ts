/**
 * Phase 3C — Smart Dashboard Intelligence.
 * Deterministic hero copy, Today's Focus, and emphasis hints.
 * Reuses snapshot / goal / events / intelligence — no AI, no extra network.
 */

import {
  buildDailyPortfolioBriefing,
  resolveTimeAwareGreetingPhrase,
  type DailyPortfolioBriefingResult,
} from "@/lib/client/dailyPortfolioBriefing";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";

const STRONG_MOVE_PERCENT = 1;
const LARGE_MOVE_PERCENT = 1.5;
const CALM_MOVE_PERCENT = 0.35;
const CONCENTRATION_WEIGHT_THRESHOLD = 40;
const MILESTONE_WINDOW = 5;

export type TodaysFocusKind =
  | "goal_milestone"
  | "large_move"
  | "macro_event"
  | "concentration";

export type TodaysFocus = {
  kind: TodaysFocusKind;
  /** Short label for the quiet chip — not a paragraph. */
  label: string;
  href?: string | null;
};

export type DashboardEmphasis = {
  /** Elevate hero shell for large moves. */
  heroElevated: boolean;
  /** Quiet note under Portfolio History preview (optional). */
  historyNote: string | null;
  /** Highlight Goals in Explore when a milestone matters. */
  exploreGoalsHighlight: boolean;
};

export type SmartDashboardScenario =
  | "empty"
  | "insufficient_history"
  | "goal_reached"
  | "goal_milestone"
  | "strong_gain"
  | "large_decline"
  | "calm"
  | "normal";

export type SmartDashboardIntelligence = {
  scenario: SmartDashboardScenario;
  briefing: DailyPortfolioBriefingResult;
  todaysFocus: TodaysFocus | null;
  emphasis: DashboardEmphasis;
};

export type SmartDashboardIntelligenceInput = {
  firstName?: string | null;
  now?: Date;
  holdingCount: number;
  hasDailyData: boolean;
  todayPercent: number;
  usesPreviousClose: boolean;
  previousClosePhrase?: string | null;
  ledByName?: string | null;
  goalProgressPercent?: number | null;
  goalReached?: boolean;
  hasSavedGoal?: boolean;
  goalStatus?: GoalProgress["status"] | null;
  concentrationWeightPercent?: number | null;
  upcomingEvents?: UpcomingMarketEvent[] | null;
  /** Reserved — Market Briefing owns market headlines; hero stays personal. */
  intelligence?: InvestmentIntelligence | null;
};

function formatMovePercent(percent: number): string {
  const abs = formatPortfolioPercent(Math.abs(percent));
  if (percent > 0) return `+${abs}`;
  if (percent < 0) return `−${abs}`;
  return abs;
}

/** Nearest milestone just reached (25 / 50 / 75 / 100), else null. */
export function detectGoalMilestonePercent(
  progressPercent: number | null | undefined,
  goalReached: boolean,
): 25 | 50 | 75 | 100 | null {
  if (goalReached || (progressPercent != null && progressPercent >= 100)) {
    return 100;
  }
  if (progressPercent == null || !Number.isFinite(progressPercent)) {
    return null;
  }
  const milestones = [75, 50, 25] as const;
  for (const milestone of milestones) {
    if (
      progressPercent >= milestone &&
      progressPercent < milestone + MILESTONE_WINDOW
    ) {
      return milestone;
    }
  }
  return null;
}

function goalIsHealthy(
  hasSavedGoal: boolean,
  goalReached: boolean,
  status: GoalProgress["status"] | null | undefined,
): boolean | null {
  if (!hasSavedGoal) return null;
  if (goalReached) return true;
  if (
    status === "On track" ||
    status === "Ahead of schedule"
  ) {
    return true;
  }
  if (
    status === "Behind schedule" ||
    status === "Slightly behind"
  ) {
    return false;
  }
  return null;
}

function focusLabelForEvent(event: UpcomingMarketEvent): string {
  if (event.category === "fed") return "Fed meeting";
  if (event.category === "cpi") return "Inflation release";
  if (event.category === "ecb") return "ECB decision";
  if (event.category === "earnings") return "Earnings on the calendar";
  const title = event.title.trim();
  if (title.length <= 36) return title;
  return `${title.slice(0, 33).trim()}…`;
}

function pickMacroFocus(
  events: UpcomingMarketEvent[] | null | undefined,
): TodaysFocus | null {
  if (!events?.length) return null;
  const high =
    events.find((event) => event.impact === "High") ??
    events.find(
      (event) =>
        event.category === "fed" ||
        event.category === "cpi" ||
        event.category === "ecb",
    );
  if (!high) return null;
  return {
    kind: "macro_event",
    label: focusLabelForEvent(high),
    href: DASHBOARD_DEEP_LINKS.marketBriefing,
  };
}

export function resolveTodaysFocus(
  input: SmartDashboardIntelligenceInput,
): TodaysFocus | null {
  const milestone = detectGoalMilestonePercent(
    input.goalProgressPercent,
    Boolean(input.goalReached),
  );
  if (milestone != null && input.hasSavedGoal) {
    return {
      kind: "goal_milestone",
      label:
        milestone === 100
          ? "Goal reached"
          : `${milestone}% of goal reached`,
      href: DASHBOARD_DEEP_LINKS.goalProgress,
    };
  }

  if (
    input.hasDailyData &&
    Math.abs(input.todayPercent) >= LARGE_MOVE_PERCENT
  ) {
    return {
      kind: "large_move",
      label:
        input.todayPercent > 0
          ? "Large portfolio move"
          : "Large portfolio decline",
      href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
    };
  }

  const macro = pickMacroFocus(input.upcomingEvents);
  if (macro) return macro;

  const weight = input.concentrationWeightPercent;
  if (
    weight != null &&
    Number.isFinite(weight) &&
    weight >= CONCENTRATION_WEIGHT_THRESHOLD
  ) {
    return {
      kind: "concentration",
      label: "Portfolio concentration",
      href: DASHBOARD_DEEP_LINKS.scorecardHealth,
    };
  }

  return null;
}

function resolveScenario(
  input: SmartDashboardIntelligenceInput,
  milestone: ReturnType<typeof detectGoalMilestonePercent>,
): SmartDashboardScenario {
  if (input.holdingCount <= 0) return "empty";
  if (!input.hasDailyData) return "insufficient_history";
  if (milestone === 100) return "goal_reached";
  if (milestone != null && input.hasSavedGoal) return "goal_milestone";
  if (input.todayPercent >= STRONG_MOVE_PERCENT) return "strong_gain";
  if (input.todayPercent <= -STRONG_MOVE_PERCENT) return "large_decline";
  if (Math.abs(input.todayPercent) < CALM_MOVE_PERCENT) return "calm";
  return "normal";
}

function buildScenarioSentences(
  scenario: SmartDashboardScenario,
  input: SmartDashboardIntelligenceInput,
  milestone: ReturnType<typeof detectGoalMilestonePercent>,
): string[] {
  const ledBy = input.ledByName?.trim() || null;
  const pct = formatMovePercent(input.todayPercent);
  const healthy = goalIsHealthy(
    Boolean(input.hasSavedGoal),
    Boolean(input.goalReached),
    input.goalStatus,
  );

  switch (scenario) {
    case "empty":
      return [
        "Add or import your holdings to receive a personalised portfolio briefing.",
      ];
    case "insufficient_history":
      return [
        "Your portfolio is up to date. More performance history is needed for today’s comparison.",
      ];
    case "goal_reached":
      return [
        "Congratulations.",
        "You reached your investment goal.",
      ];
    case "goal_milestone":
      return [
        "Congratulations.",
        `You reached ${milestone}% of your investment goal.`,
      ];
    case "strong_gain": {
      const lines = [`Your portfolio gained ${pct}.`];
      if (ledBy) {
        lines.push(`${ledBy} was the strongest contributor.`);
      }
      return lines;
    }
    case "large_decline": {
      const lines = [`Your portfolio declined ${pct}.`];
      if (ledBy) {
        lines.push(
          input.usesPreviousClose
            ? `${ledBy} led the latest available decline.`
            : `${ledBy} led the decline.`,
        );
      }
      return lines;
    }
    case "calm": {
      if (healthy === false) {
        return ["Nothing material changed for your portfolio overnight."];
      }
      return [
        "Your portfolio remains on track.",
        "Nothing important changed overnight.",
      ];
    }
    case "normal":
    default: {
      // Reuse the shared briefing builder for moderate moves (personal only).
      const base = buildDailyPortfolioBriefing({
        firstName: input.firstName,
        now: input.now,
        holdingCount: input.holdingCount,
        hasDailyData: input.hasDailyData,
        todayPercent: input.todayPercent,
        usesPreviousClose: input.usesPreviousClose,
        previousClosePhrase: input.previousClosePhrase,
        ledByName: ledBy,
        // Market context stays on Market Briefing — never repeat it here.
        marketTopic: null,
      });
      return base.sentences;
    }
  }
}

function buildEmphasis(
  scenario: SmartDashboardScenario,
  focus: TodaysFocus | null,
  todayPercent: number,
): DashboardEmphasis {
  const largeMove =
    Math.abs(todayPercent) >= LARGE_MOVE_PERCENT ||
    scenario === "strong_gain" ||
    scenario === "large_decline";

  let historyNote: string | null = null;
  if (focus?.kind === "macro_event") {
    historyNote = `${focus.label} is on today’s calendar.`;
  } else if (focus?.kind === "goal_milestone") {
    historyNote = null;
  }

  return {
    heroElevated: largeMove,
    historyNote,
    exploreGoalsHighlight:
      focus?.kind === "goal_milestone" ||
      scenario === "goal_reached" ||
      scenario === "goal_milestone",
  };
}

function formatGreeting(
  phrase: DailyPortfolioBriefingResult["greetingPhrase"],
  firstName: string | null | undefined,
): string {
  const name = firstName?.trim();
  return name ? `${phrase}, ${name}.` : `${phrase}.`;
}

/**
 * Single entry for Dashboard hero intelligence + Today's Focus + emphasis.
 */
export function buildSmartDashboardIntelligence(
  input: SmartDashboardIntelligenceInput,
): SmartDashboardIntelligence {
  const milestone = detectGoalMilestonePercent(
    input.goalProgressPercent,
    Boolean(input.goalReached),
  );
  const scenario = resolveScenario(input, milestone);
  const bodySentences = buildScenarioSentences(
    scenario,
    input,
    milestone,
  ).slice(0, 2);

  const greetingPhrase = resolveTimeAwareGreetingPhrase(input.now);
  const greeting = formatGreeting(greetingPhrase, input.firstName);

  const briefing: DailyPortfolioBriefingResult = {
    greetingPhrase,
    greeting,
    sentences: bodySentences,
    text: `${greeting} ${bodySentences.join(" ")}`.trim(),
    deepLink:
      scenario === "empty"
        ? null
        : scenario === "goal_reached" || scenario === "goal_milestone"
          ? {
              href: DASHBOARD_DEEP_LINKS.goalProgress,
              label: "Open Goals",
            }
          : {
              href: DASHBOARD_DEEP_LINKS.portfolioPerformance,
              label: "View portfolio intelligence",
            },
  };

  const todaysFocus = resolveTodaysFocus(input);
  const emphasis = buildEmphasis(scenario, todaysFocus, input.todayPercent);

  return {
    scenario,
    briefing,
    todaysFocus,
    emphasis,
  };
}

/** Normalize text for duplicate detection between hero and market surfaces. */
export function normalizeDashboardCopy(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function copyPhrases(text: string): string[] {
  return normalizeDashboardCopy(text)
    .split(/[.!?]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 18);
}

export function heroAndMarketShareDuplicateSentence(
  heroText: string,
  marketLead: string | null | undefined,
  marketSupport: string | null | undefined,
): boolean {
  const heroPhrases = copyPhrases(heroText);
  if (heroPhrases.length === 0) return false;

  for (const candidate of [marketLead, marketSupport]) {
    const other = candidate ? normalizeDashboardCopy(candidate) : "";
    if (!other || other.length < 12) continue;
    for (const phrase of heroPhrases) {
      if (other.includes(phrase) || phrase.includes(other)) return true;
      // Shared stem — e.g. "remains on track" across personal vs market copy.
      const stem = phrase.replace(/^(your|the)\s+/u, "").slice(0, 28);
      if (stem.length >= 16 && other.includes(stem)) return true;
    }
  }
  return false;
}
