/**
 * Stable Dashboard → destination deep links (hash anchors).
 * Keep IDs in sync with section `id` attributes on destination pages.
 *
 * Route strategy: `/portfolio-health` is the canonical Portfolio Scorecard
 * page (Health, Goal, Momentum, Readiness). Legacy path kept so existing
 * links remain valid without a second overlapping destination.
 */

import {
  ANALYSIS_PATH,
  GOALS_PATH,
  PORTFOLIO_HEALTH_PATH,
} from "@/lib/navigation/appRoutes";
import { NEWS_HUB_PATH } from "@/lib/navigation/newsHubRoutes";

export const SECTION_IDS = {
  cashIntelligence: "cash-intelligence",
  dividendIntelligence: "dividend-intelligence",
  portfolioAllocation: "portfolio-allocation",
  portfolioExposure: "portfolio-exposure",
  portfolioXray: "portfolio-xray",
  scenarioStress: "scenario-stress",
  resilienceSleep: "resilience-sleep",
  marketConsensus: "market-consensus",
  portfolioPerformance: "portfolio-performance",
  /** Analysis Four Questions section bands. */
  whatHappened: "what-happened",
  whatMatters: "what-matters",
  onTrack: "on-track",
  whatsAhead: "whats-ahead",
  /** @deprecated Prefer scorecardMomentum — Analysis keeps performance only. */
  portfolioMomentum: "portfolio-momentum",
  /** @deprecated Prefer scorecardReadiness */
  portfolioReadiness: "portfolio-readiness",
  goalProgress: "goal-progress",
  /** @deprecated Prefer scorecardGoal */
  goalScore: "goal-score",
  newsMarketBrief: "news-market-brief",
  portfolioNews: "portfolio-news",
  /** Central Scorecard page sections (`/portfolio-health`). */
  scorecardHealth: "health",
  scorecardGoal: "goal",
  scorecardMomentum: "momentum",
  scorecardReadiness: "readiness",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

/** Canonical Portfolio Scorecard route (repurposed `/portfolio-health`). */
export const SCORECARD_PATH = PORTFOLIO_HEALTH_PATH;

export const DASHBOARD_DEEP_LINKS = {
  cashIntelligence: `${ANALYSIS_PATH}#${SECTION_IDS.cashIntelligence}`,
  dividendIntelligence: `${ANALYSIS_PATH}#${SECTION_IDS.dividendIntelligence}`,
  portfolioAllocation: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioAllocation}`,
  portfolioExposure: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioExposure}`,
  portfolioXray: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioXray}`,
  scenarioStress: `${ANALYSIS_PATH}#${SECTION_IDS.scenarioStress}`,
  resilienceSleep: `${ANALYSIS_PATH}#${SECTION_IDS.resilienceSleep}`,
  marketConsensus: `${ANALYSIS_PATH}#${SECTION_IDS.marketConsensus}`,
  portfolioPerformance: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioPerformance}`,
  whatHappened: `${ANALYSIS_PATH}#${SECTION_IDS.whatHappened}`,
  whatMatters: `${ANALYSIS_PATH}#${SECTION_IDS.whatMatters}`,
  onTrack: `${ANALYSIS_PATH}#${SECTION_IDS.onTrack}`,
  whatsAhead: `${ANALYSIS_PATH}#${SECTION_IDS.whatsAhead}`,
  portfolioMomentum: `${SCORECARD_PATH}#${SECTION_IDS.scorecardMomentum}`,
  portfolioReadiness: `${SCORECARD_PATH}#${SECTION_IDS.scorecardReadiness}`,
  goalProgress: `${GOALS_PATH}#${SECTION_IDS.goalProgress}`,
  goalScore: `${SCORECARD_PATH}#${SECTION_IDS.scorecardGoal}`,
  goals: GOALS_PATH,
  portfolioHealth: `${SCORECARD_PATH}#${SECTION_IDS.scorecardHealth}`,
  scorecard: SCORECARD_PATH,
  scorecardHealth: `${SCORECARD_PATH}#${SECTION_IDS.scorecardHealth}`,
  scorecardGoal: `${SCORECARD_PATH}#${SECTION_IDS.scorecardGoal}`,
  scorecardMomentum: `${SCORECARD_PATH}#${SECTION_IDS.scorecardMomentum}`,
  scorecardReadiness: `${SCORECARD_PATH}#${SECTION_IDS.scorecardReadiness}`,
  marketBriefing: `${NEWS_HUB_PATH}#${SECTION_IDS.newsMarketBrief}`,
  portfolioNews: `${NEWS_HUB_PATH}#${SECTION_IDS.portfolioNews}`,
  newsHub: NEWS_HUB_PATH,
} as const;

/** CSS class applied briefly after a successful deep-link scroll. */
export const SECTION_DEEP_LINK_HIGHLIGHT_CLASS = "section-deep-link-highlight";

export const SECTION_DEEP_LINK_HIGHLIGHT_MS = 1800;

export function parseSectionHash(hash: string): string | null {
  const raw = hash.startsWith("#") ? hash.slice(1) : hash;
  const id = raw.trim();
  return id.length > 0 ? id : null;
}

export function isKnownSectionId(id: string): id is SectionId {
  return (Object.values(SECTION_IDS) as string[]).includes(id);
}
