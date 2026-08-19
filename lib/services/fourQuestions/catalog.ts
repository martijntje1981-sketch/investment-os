/**
 * Central Four Questions product catalog — single source of truth.
 * Dashboard, Analysis, hubs, and compact nav must derive from here.
 */

import {
  ANALYSIS_PATH,
  GOALS_PATH,
  MARKET_PULSE_PATH,
  NEWS_PATH,
  ON_TRACK_HUB_PATH,
  PORTFOLIO_HEALTH_PATH,
  PORTFOLIO_HISTORY_PATH,
  REVIEW_PATH,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";
import { FOUR_QUESTION_VISUAL, type FourQuestionId } from "@/lib/services/fourQuestions/types";

export {
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  ON_TRACK_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
} from "@/lib/navigation/appRoutes";

/** Authenticated question hub routes. */
export const FOUR_QUESTION_HUB_PATHS = {
  what_happened: WHAT_HAPPENED_HUB_PATH,
  what_matters_now: WHAT_MATTERS_HUB_PATH,
  am_i_on_track: ON_TRACK_HUB_PATH,
  whats_ahead: WHATS_AHEAD_HUB_PATH,
} as const satisfies Record<FourQuestionId, string>;

export type FourQuestionVisual = (typeof FOUR_QUESTION_VISUAL)[FourQuestionId];

export type FourQuestionDefinition = {
  id: FourQuestionId;
  numberLabel: "01" | "02" | "03" | "04";
  /** Exact product question wording. */
  question: string;
  /** Compact nav label. */
  shortNavLabel: string;
  /** Human hub framing. */
  humanQuestion: string;
  /** One-line semantic meaning. */
  meaning: string;
  /** Analysis / hub short hint. */
  navHint: string;
  /** Analysis section intro. */
  analysisIntro: string;
  /** Public marketing promise (not a personal answer). */
  publicPromise: string;
  /** Optional one-line public detail revealed on interaction. */
  publicDetail: string;
  hubPath: string;
  analysisSectionId: "what-happened" | "what-matters" | "on-track" | "whats-ahead";
  visual: FourQuestionVisual;
  /** Specialist deep-dive destinations for hub footers. */
  deepDives: ReadonlyArray<{ label: string; href: string }>;
};

export const FOUR_QUESTIONS: readonly FourQuestionDefinition[] = [
  {
    id: "what_happened",
    numberLabel: "01",
    question: "What happened?",
    shortNavLabel: "Happened",
    humanQuestion: "What happened to my money?",
    meaning: "Past / performance / what changed",
    navHint: "Performance & attribution",
    analysisIntro:
      "See what moved your portfolio and which holdings drove the result.",
    publicPromise:
      "Understand how your portfolio performed and what drove the result.",
    publicDetail:
      "Period performance and the holdings that contributed or detracted — calmly, without trading instructions.",
    hubPath: WHAT_HAPPENED_HUB_PATH,
    analysisSectionId: "what-happened",
    visual: FOUR_QUESTION_VISUAL.what_happened,
    deepDives: [
      { label: "Full performance & attribution", href: `${ANALYSIS_PATH}#portfolio-performance` },
      { label: "Portfolio History", href: PORTFOLIO_HISTORY_PATH },
      { label: "Your Review", href: REVIEW_PATH },
    ],
  },
  {
    id: "what_matters_now",
    numberLabel: "02",
    question: "What matters now?",
    shortNavLabel: "Matters",
    humanQuestion: "What deserves my attention now?",
    meaning: "Present / attention / intelligence",
    navHint: "Exposure & intelligence",
    analysisIntro: "Understand structure and what deserves attention today.",
    publicPromise:
      "See the developments that actually matter to what you own.",
    publicDetail:
      "Personal relevance first — news and signals linked to your holdings, not a generic market dump.",
    hubPath: WHAT_MATTERS_HUB_PATH,
    analysisSectionId: "what-matters",
    visual: FOUR_QUESTION_VISUAL.what_matters_now,
    deepDives: [
      { label: "News", href: NEWS_PATH },
      { label: "Market Pulse", href: MARKET_PULSE_PATH },
      { label: "Exposure & X-Ray", href: `${ANALYSIS_PATH}#portfolio-exposure` },
      { label: "Crypto intelligence", href: `${ANALYSIS_PATH}#crypto-intelligence` },
    ],
  },
  {
    id: "am_i_on_track",
    numberLabel: "03",
    question: "Am I on track?",
    shortNavLabel: "On track",
    humanQuestion: "Am I still on track?",
    meaning: "Plan / goals / progress",
    navHint: "Goals & progress",
    analysisIntro:
      "Check progress against your plan — full goal editing stays on Goals.",
    publicPromise:
      "Understand progress toward your goals and the assumptions behind them.",
    publicDetail:
      "Goal progress, Reality Check assumptions and contribution pace — estimates, not guarantees.",
    hubPath: ON_TRACK_HUB_PATH,
    analysisSectionId: "on-track",
    visual: FOUR_QUESTION_VISUAL.am_i_on_track,
    deepDives: [
      { label: "Goals", href: GOALS_PATH },
      { label: "Goal Reality Check", href: `${GOALS_PATH}#goal-reality-check` },
      { label: "What-if explorer", href: `${GOALS_PATH}#what-if` },
      { label: "Portfolio Scorecard", href: PORTFOLIO_HEALTH_PATH },
      {
        label: "Goal sensitivity in scenarios",
        href: `${ANALYSIS_PATH}#scenario-stress`,
      },
    ],
  },
  {
    id: "whats_ahead",
    numberLabel: "04",
    question: "What’s ahead?",
    shortNavLabel: "Ahead",
    humanQuestion: "What could matter next?",
    meaning: "Future / risk / scenarios",
    navHint: "Scenarios & resilience",
    analysisIntro:
      "See where your portfolio is sensitive — models, not predictions.",
    publicPromise:
      "Understand scenarios, risks and what could matter next.",
    publicDetail:
      "Scenario stress and resilience context — models of sensitivity, not forecasts.",
    hubPath: WHATS_AHEAD_HUB_PATH,
    analysisSectionId: "whats-ahead",
    visual: FOUR_QUESTION_VISUAL.whats_ahead,
    deepDives: [
      { label: "What-if explorer", href: `${GOALS_PATH}#what-if` },
      { label: "Scenario Stress", href: `${ANALYSIS_PATH}#scenario-stress` },
      { label: "Resilience", href: `${ANALYSIS_PATH}#resilience-sleep` },
      { label: "Market Consensus", href: `${ANALYSIS_PATH}#market-consensus` },
      { label: "Upcoming events", href: "/events" },
    ],
  },
] as const;

export function getFourQuestionDefinition(
  id: FourQuestionId,
): FourQuestionDefinition {
  const found = FOUR_QUESTIONS.find((item) => item.id === id);
  if (!found) {
    throw new Error(`Unknown Four Question id: ${id}`);
  }
  return found;
}

export function fourQuestionHubPath(id: FourQuestionId): string {
  return FOUR_QUESTION_HUB_PATHS[id];
}

/**
 * Compact nav placement for authenticated product pages.
 * Neutral = show all four, none active (Dashboard, Portfolio, Analysis).
 */
export type FourQuestionsPagePlacement =
  | { show: false }
  | { show: true; active: null; reason: "neutral_overview" | "neutral_foundation" | "neutral_map" }
  | { show: true; active: FourQuestionId; reason: string };

/**
 * Route → Four Questions nav placement.
 * Documented classifications for ambiguous pages live in reason strings.
 */
export function resolveFourQuestionsPagePlacement(
  pathname: string,
): FourQuestionsPagePlacement {
  const path = pathname.split("?")[0] ?? pathname;

  // Utilities / auth / setup — no nav
  if (
    path.startsWith("/settings") ||
    path.startsWith("/login") ||
    path.startsWith("/signup") ||
    path.startsWith("/forgot-password") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/upload") ||
    path.startsWith("/faq") ||
    path.startsWith("/pricing") ||
    path.startsWith("/contact") ||
    path.startsWith("/privacy") ||
    path.startsWith("/terms") ||
    path.startsWith("/supported-instruments") ||
    path === "/" ||
    path.startsWith("/explore") ||
    path.startsWith("/example-expired")
  ) {
    return { show: false };
  }

  // Hubs — active self
  if (path === WHAT_HAPPENED_HUB_PATH) {
    return { show: true, active: "what_happened", reason: "hub" };
  }
  if (path === WHAT_MATTERS_HUB_PATH) {
    return { show: true, active: "what_matters_now", reason: "hub" };
  }
  if (path === ON_TRACK_HUB_PATH) {
    return { show: true, active: "am_i_on_track", reason: "hub" };
  }
  if (path === WHATS_AHEAD_HUB_PATH) {
    return { show: true, active: "whats_ahead", reason: "hub" };
  }

  if (path === "/dashboard") {
    return { show: true, active: null, reason: "neutral_overview" };
  }
  if (path === "/portfolio" || path.startsWith("/portfolio/")) {
    return { show: true, active: null, reason: "neutral_foundation" };
  }
  if (path.startsWith("/holding/")) {
    return { show: true, active: null, reason: "neutral_foundation" };
  }
  if (path === "/analysis") {
    return { show: true, active: null, reason: "neutral_map" };
  }

  // Q1 — history / performance surfaces
  if (path === PORTFOLIO_HISTORY_PATH) {
    return { show: true, active: "what_happened", reason: "history_primary" };
  }
  // Review = period narrative of what happened (Q1 primary; Q2 secondary in content only)
  if (path === REVIEW_PATH) {
    return { show: true, active: "what_happened", reason: "review_q1_primary" };
  }

  // Q2 — current intelligence
  if (path === NEWS_PATH || path.startsWith("/news")) {
    return { show: true, active: "what_matters_now", reason: "news_q2" };
  }
  if (path === "/perspectives") {
    return { show: true, active: "what_matters_now", reason: "perspectives_q2" };
  }
  // Market Pulse = current linked markets (Q2 primary; forward context secondary)
  if (path === MARKET_PULSE_PATH) {
    return {
      show: true,
      active: "what_matters_now",
      reason: "market_pulse_q2_primary",
    };
  }
  if (path === "/discover") {
    return { show: true, active: "what_matters_now", reason: "discover_q2" };
  }

  // Q3 — goals / plan
  if (path === GOALS_PATH) {
    return { show: true, active: "am_i_on_track", reason: "goals_q3" };
  }
  // Scorecard = goal/momentum/health strengths → Q3 primary (resilience Q4 secondary in tools)
  if (path === PORTFOLIO_HEALTH_PATH) {
    return {
      show: true,
      active: "am_i_on_track",
      reason: "scorecard_q3_primary",
    };
  }

  // Q4 — forward / events
  if (path === "/events") {
    return { show: true, active: "whats_ahead", reason: "events_q4" };
  }

  return { show: false };
}
