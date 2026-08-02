/**
 * Stable Dashboard → destination deep links (hash anchors).
 * Keep IDs in sync with section `id` attributes on destination pages.
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
  marketConsensus: "market-consensus",
  portfolioPerformance: "portfolio-performance",
  goalProgress: "goal-progress",
  newsMarketBrief: "news-market-brief",
  portfolioNews: "portfolio-news",
} as const;

export type SectionId = (typeof SECTION_IDS)[keyof typeof SECTION_IDS];

export const DASHBOARD_DEEP_LINKS = {
  cashIntelligence: `${ANALYSIS_PATH}#${SECTION_IDS.cashIntelligence}`,
  dividendIntelligence: `${ANALYSIS_PATH}#${SECTION_IDS.dividendIntelligence}`,
  portfolioAllocation: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioAllocation}`,
  portfolioExposure: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioExposure}`,
  marketConsensus: `${ANALYSIS_PATH}#${SECTION_IDS.marketConsensus}`,
  portfolioPerformance: `${ANALYSIS_PATH}#${SECTION_IDS.portfolioPerformance}`,
  goalProgress: `${GOALS_PATH}#${SECTION_IDS.goalProgress}`,
  goals: GOALS_PATH,
  portfolioHealth: PORTFOLIO_HEALTH_PATH,
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
