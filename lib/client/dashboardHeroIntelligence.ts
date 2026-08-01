import type { DashboardPortfolioSnapshot } from "@/lib/client/dashboardPortfolioSnapshot";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { PortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

export type HeroTrendDirection = "up" | "down" | "flat" | "unavailable";

export function resolveHeroTrendDirection(
  snapshot: Pick<
    DashboardPortfolioSnapshot,
    "hasDailyData" | "todayChange" | "todayPercent"
  >,
): HeroTrendDirection {
  if (!snapshot.hasDailyData) return "unavailable";
  if (snapshot.todayChange > 0 || snapshot.todayPercent > 0) return "up";
  if (snapshot.todayChange < 0 || snapshot.todayPercent < 0) return "down";
  return "flat";
}

export type HeroHealthPreview = {
  available: boolean;
  /** 0–1 fill for ring — from existing volatility index when valued. */
  ringProgress: number | null;
  label: string;
  detail: string;
};

export function buildHeroHealthPreview(
  profile: PortfolioHealthProfile | null | undefined,
): HeroHealthPreview {
  if (!profile || !profile.hasValuedPortfolio) {
    return {
      available: false,
      ringProgress: null,
      label: "Portfolio Health",
      detail: "Add holdings to unlock",
    };
  }

  return {
    available: true,
    ringProgress: Math.min(1, Math.max(0, profile.expectedVolatility.index)),
    label: "Portfolio Health",
    detail: profile.hero.identity,
  };
}

export type HeroTopStoryPreview = {
  title: string;
  href: string;
  meta: string;
  thumbnailUrl: string | null;
};

function findNewsItemById(
  payload: NewsApiResponse | null | undefined,
  itemId: string,
): NewsContentItem | null {
  if (!payload) return null;
  const pools = [
    payload.portfolioNews,
    payload.macroNews,
    payload.marketVideos ?? [],
  ];
  for (const pool of pools) {
    const match = pool.find((item) => item.id === itemId);
    if (match) return match;
  }
  return null;
}

function pickGeneralStory(
  payload: NewsApiResponse | null | undefined,
): NewsContentItem | null {
  if (!payload) return null;
  return (
    payload.macroNews[0] ??
    payload.portfolioNews[0] ??
    payload.marketVideos?.[0] ??
    null
  );
}

/**
 * Compact top-story preview from existing dashboard intelligence / news payload.
 * Does not trigger a new news request.
 */
export function buildHeroTopStoryPreview(input: {
  intelligence: InvestmentIntelligence | null | undefined;
  payload: NewsApiResponse | null | undefined;
  preferPortfolioRelevant: boolean;
}): HeroTopStoryPreview | null {
  const { intelligence, payload, preferPortfolioRelevant } = input;

  if (preferPortfolioRelevant && intelligence?.mustWatch) {
    const item = findNewsItemById(payload, intelligence.mustWatch.itemId);
    return {
      title: intelligence.mustWatch.title,
      href: intelligence.mustWatch.canonicalUrl || "/news",
      meta: intelligence.mustWatch.sourceName || "Market intelligence",
      thumbnailUrl: item?.thumbnailUrl ?? null,
    };
  }

  const general = pickGeneralStory(payload);
  if (general) {
    return {
      title: general.title,
      href: general.canonicalUrl || "/news",
      meta: general.sourceName || "Markets",
      thumbnailUrl: general.thumbnailUrl ?? null,
    };
  }

  if (intelligence?.mustWatch) {
    return {
      title: intelligence.mustWatch.title,
      href: intelligence.mustWatch.canonicalUrl || "/news",
      meta: intelligence.mustWatch.sourceName || "Market intelligence",
      thumbnailUrl: null,
    };
  }

  return null;
}
