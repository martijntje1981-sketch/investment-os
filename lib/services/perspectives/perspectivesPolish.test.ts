import { describe, expect, it } from "vitest";

import { mapPerspectiveTopicTags } from "@/lib/services/perspectives/topicTags";
import {
  formatRelativePublicationTime,
  formatUpdatedMinutesAgo,
} from "@/lib/services/perspectives/relativeTime";
import {
  buildPerspectiveRelevance,
  derivePerspectivePortfolioSignals,
  orderPerspectivesForAudience,
  selectDashboardPerspectivesForAudience,
  selectTodaysPerspective,
  type PerspectivePortfolioSignals,
} from "@/lib/services/perspectives/relevance";
import { buildPerspectiveWhyItMatters } from "@/lib/services/perspectives/whyItMatters";
import type { PerspectiveVideo } from "@/lib/services/perspectives/types";
import {
  buildHeroHealthPreview,
  buildHeroTopStoryPreview,
  resolveHeroTrendDirection,
} from "@/lib/client/dashboardHeroIntelligence";
import { createEmptyInvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { createEmptyMarketBrief } from "@/lib/services/news/marketBrief";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";
import type { PortfolioHealthProfile } from "@/lib/services/portfolio/portfolioHealthProfile";
import { readFileSync } from "node:fs";
import path from "node:path";

function video(
  overrides: Partial<PerspectiveVideo> &
    Pick<PerspectiveVideo, "id" | "title" | "publishedAt" | "category">,
): PerspectiveVideo {
  const channelId = overrides.channelId ?? `UC${overrides.id}`;
  const owner =
    overrides.channelOwnerName ?? overrides.creatorName ?? "Creator";
  return {
    videoId: overrides.videoId ?? overrides.id,
    url: overrides.url ?? `https://www.youtube.com/watch?v=${overrides.id}`,
    thumbnailUrl: null,
    description: null,
    channelId,
    channelTitle: overrides.channelTitle ?? owner,
    channelOwnerName: owner,
    creatorId: overrides.creatorId ?? "creator",
    creatorName: overrides.creatorName ?? owner,
    creatorAvatarUrl: null,
    trustedCreatorId: overrides.trustedCreatorId ?? null,
    trustedCreatorName: overrides.trustedCreatorName ?? null,
    featuredPersonName: overrides.featuredPersonName ?? null,
    isTrustedSource: overrides.isTrustedSource ?? false,
    categoryLabel: overrides.categoryLabel ?? "Macro & Economy",
    source: "youtube-rss",
    schemaVersion: overrides.schemaVersion ?? "perspectives-identity-v2",
    ...overrides,
  };
}

const emptySignals: PerspectivePortfolioSignals = {
  hasHoldings: false,
  cryptoWeight: 0,
  technologyWeight: 0,
  equityWeight: 0,
};

const cryptoSignals: PerspectivePortfolioSignals = {
  hasHoldings: true,
  cryptoWeight: 40,
  technologyWeight: 0,
  equityWeight: 10,
};

describe("perspective topic tags", () => {
  it("maps titles to 2–4 restrained tags", () => {
    const tags = mapPerspectiveTopicTags(
      "Bitcoin, Fed rates and liquidity — what it means for markets",
    );
    expect(tags.length).toBeGreaterThanOrEqual(2);
    expect(tags.length).toBeLessThanOrEqual(4);
    expect(tags).toContain("Bitcoin");
    expect(tags).toContain("Federal Reserve");
  });

  it("avoids over-tagging sparse titles", () => {
    const tags = mapPerspectiveTopicTags("Weekly market update");
    expect(tags.length).toBeLessThanOrEqual(2);
  });

  it("recognises AI and NVIDIA without inventing unrelated tags", () => {
    const tags = mapPerspectiveTopicTags("NVIDIA AI earnings preview");
    expect(tags).toEqual(expect.arrayContaining(["NVIDIA", "AI", "Earnings"]));
    expect(tags).not.toContain("Bitcoin");
  });
});

describe("relative publication time", () => {
  const now = Date.parse("2026-08-01T15:00:00.000Z");

  it("formats recent, yesterday and multi-day labels", () => {
    expect(
      formatRelativePublicationTime("2026-08-01T12:00:00.000Z", now),
    ).toMatch(/3h ago|New today/);
    expect(formatRelativePublicationTime("2026-07-31T15:00:00.000Z", now)).toBe(
      "Yesterday",
    );
    expect(formatRelativePublicationTime("2026-07-30T15:00:00.000Z", now)).toBe(
      "2 days ago",
    );
  });

  it("formats updated minutes ago", () => {
    expect(formatUpdatedMinutesAgo("2026-08-01T14:45:00.000Z", now)).toBe(
      "Updated 15 minutes ago",
    );
    expect(formatUpdatedMinutesAgo("2026-08-01T15:00:00.000Z", now)).toBe(
      "Updated just now",
    );
  });
});

describe("featured selection and relevance", () => {
  const now = Date.parse("2026-08-01T18:00:00.000Z");
  const videos = [
    video({
      id: "btc",
      title: "Bitcoin liquidity outlook",
      publishedAt: "2026-08-01T10:00:00.000Z",
      category: "bitcoin",
      categoryLabel: "Bitcoin & Digital Assets",
    }),
    video({
      id: "macro",
      title: "Fed interest rates and inflation update",
      publishedAt: "2026-08-01T16:00:00.000Z",
      category: "macro",
    }),
    video({
      id: "tech",
      title: "AI and NVIDIA demand",
      publishedAt: "2026-08-01T12:00:00.000Z",
      category: "technology",
      categoryLabel: "Technology & AI",
    }),
  ];

  it("uses freshness for guests and zero-holdings users", () => {
    const featured = selectTodaysPerspective(videos, emptySignals, now);
    expect(featured?.id).toBe("macro");
  });

  it("boosts portfolio-relevant videos for holdings users", () => {
    const featured = selectTodaysPerspective(videos, cryptoSignals, now);
    expect(featured?.id).toBe("btc");
    const relevance = buildPerspectiveRelevance(featured!, cryptoSignals);
    expect(relevance.relevant).toBe(true);
    expect(relevance.reasons[0]).toMatch(/Bitcoin or digital-asset/i);
  });

  it("does not invent personalization for guests", () => {
    const relevance = buildPerspectiveRelevance(videos[0]!, emptySignals);
    expect(relevance.relevant).toBe(false);
    expect(relevance.reasons).toEqual([]);
  });

  it("reorders without dropping non-relevant categories", () => {
    const ordered = orderPerspectivesForAudience(videos, cryptoSignals, now);
    expect(ordered.map((item) => item.id)).toContain("macro");
    expect(ordered.map((item) => item.id)).toContain("tech");
    expect(ordered[0]?.id).toBe("btc");
  });

  it("limits dashboard selection to two items with relevance ordering", () => {
    const selected = selectDashboardPerspectivesForAudience(
      videos,
      cryptoSignals,
      2,
      now,
    );
    expect(selected).toHaveLength(2);
    expect(selected[0]?.id).toBe("btc");
  });

  it("builds neutral why-it-matters copy from tags", () => {
    const copy = buildPerspectiveWhyItMatters({
      title: "Fed rates and liquidity",
      category: "macro",
      tags: ["Interest Rates", "Liquidity", "Federal Reserve"],
    });
    expect(copy.toLowerCase()).toContain("interest rates");
    expect(copy.split(".").filter(Boolean).length).toBeLessThanOrEqual(2);
  });
});

describe("empty holdings signals", () => {
  it("marks empty portfolios as having no holdings signal", () => {
    expect(derivePerspectivePortfolioSignals([])).toEqual(emptySignals);
  });
});

describe("dashboard hero intelligence helpers", () => {
  it("resolves positive, negative, flat and unavailable trend states", () => {
    expect(
      resolveHeroTrendDirection({
        hasDailyData: true,
        todayChange: 120,
        todayPercent: 1.2,
      }),
    ).toBe("up");
    expect(
      resolveHeroTrendDirection({
        hasDailyData: true,
        todayChange: -50,
        todayPercent: -0.4,
      }),
    ).toBe("down");
    expect(
      resolveHeroTrendDirection({
        hasDailyData: true,
        todayChange: 0,
        todayPercent: 0,
      }),
    ).toBe("flat");
    expect(
      resolveHeroTrendDirection({
        hasDailyData: false,
        todayChange: 0,
        todayPercent: 0,
      }),
    ).toBe("unavailable");
  });

  it("falls back when portfolio health is unavailable", () => {
    const preview = buildHeroHealthPreview(null);
    expect(preview.available).toBe(false);
    expect(preview.ringProgress).toBeNull();
    expect(preview.detail).toMatch(/add holdings/i);
  });

  it("uses profile identity when health is available", () => {
    const preview = buildHeroHealthPreview({
      hasValuedPortfolio: true,
      expectedVolatility: { index: 0.42, level: "Moderate", summary: "" },
      hero: { identity: "Balanced Growth Portfolio" },
    } as PortfolioHealthProfile);
    expect(preview.available).toBe(true);
    expect(preview.ringProgress).toBeCloseTo(0.42);
    expect(preview.detail).toContain("Balanced Growth");
  });

  it("builds top story from mustWatch without fabricating content", () => {
    const item: NewsContentItem = {
      id: "story-1",
      title: "ECB holds rates steady",
      description: null,
      summary: "",
      interpretation: "",
      canonicalUrl: "https://example.com/ecb",
      sourceId: "src",
      sourceName: "Reuters",
      sourceType: "news",
      publishedAt: "2026-08-01T10:00:00.000Z",
      contentTypeLabel: "News",
      category: "macro",
      marketCategory: "macro",
      matchedHoldingIds: [],
      matchedSymbols: [],
      matchedHoldings: [],
      relevanceLabel: null,
      relevanceScore: 80,
      impactLevel: "Medium Impact",
      thumbnailUrl: "https://example.com/thumb.jpg",
      fetchedAt: "2026-08-01T10:00:00.000Z",
    };

    const payload: NewsApiResponse = {
      success: true,
      marketBrief: createEmptyMarketBrief("2026-08-01T10:00:00.000Z"),
      portfolioNews: [],
      macroNews: [item],
      marketVideos: [],
      upcomingEvents: [],
      dataStatus: {
        feedsState: "live",
        eventsState: "live",
        eodhdNewsAvailable: true,
        eodhdLastUpdated: null,
        sourceCount: 1,
        activeSourceNames: ["Reuters"],
        unavailableSourceCount: 0,
      },
      sourceErrors: [],
      fetchedAt: "2026-08-01T10:00:00.000Z",
    };

    const intelligence = {
      ...createEmptyInvestmentIntelligence("2026-08-01T10:00:00.000Z"),
      mustWatch: {
        type: "article" as const,
        itemId: "story-1",
        title: "ECB holds rates steady",
        sourceName: "Reuters",
        canonicalUrl: "https://example.com/ecb",
        reason: "Macro",
      },
    };

    const story = buildHeroTopStoryPreview({
      intelligence,
      payload,
      preferPortfolioRelevant: true,
    });
    expect(story?.title).toBe("ECB holds rates steady");
    expect(story?.thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });
});

describe("perspectives polish wiring", () => {
  it("keeps thumbnail and avatar fallbacks in cards", () => {
    const cards = readFileSync(
      path.resolve(
        process.cwd(),
        "components/perspectives/PerspectiveCards.tsx",
      ),
      "utf8",
    );
    expect(cards).toContain("perspectiveThumbnailCandidates");
    expect(cards).toContain("creatorInitials");
    expect(cards).toContain("onError");
    expect(cards).toContain("PerspectiveTodaysCard");
    expect(cards).toContain("Why it matters");
  });

  it("keeps compact hero trend visual and Perspectives disclaimer", () => {
    const hero = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/PortfolioValueCard.tsx",
      ),
      "utf8",
    );
    const page = readFileSync(
      path.resolve(
        process.cwd(),
        "components/perspectives/PerspectivesPage.tsx",
      ),
      "utf8",
    );
    const dashboard = readFileSync(
      path.resolve(process.cwd(), "app/dashboard/page.tsx"),
      "utf8",
    );
    expect(hero).toContain("HeroTrendMicroVisual");
    expect(hero).toContain("appHeroPaddingCompactClass");
    expect(hero).not.toContain("HeroHealthRing");
    expect(hero).not.toContain("HeroTopStoryPreviewCard");
    expect(dashboard).toContain("pulse={portfolioPulse}");
    expect(dashboard).not.toContain("DashboardPortfolioScorecard");
    expect(dashboard).not.toContain("DashboardPortfolioHealthCard");
    expect(dashboard).not.toContain("DashboardTopStoryCard");
    expect(dashboard).toContain("DashboardCashIntelligenceCard");
    expect(page).toContain(
      "External views are presented for informational purposes",
    );
    expect(page).toContain("PerspectivesSkeleton");
  });

  it("does not invent fake chart history for the hero trend", () => {
    const source = readFileSync(
      path.resolve(
        process.cwd(),
        "components/dashboard/DashboardHeroIntelligence.tsx",
      ),
      "utf8",
    );
    expect(source).toContain("HeroTrendMicroVisual");
    expect(source).not.toMatch(/fakeHistory|Math\.random/i);
    expect(source).toContain("no invented sparkline points");
  });
});
