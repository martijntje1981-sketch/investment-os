"use client";

import { useMemo, useState } from "react";

import { appSectionLabelClass } from "@/components/layout/appSurface";
import {
  NewsBriefingDiscoverLink,
  NewsBriefingFooter,
  NewsBriefingIntelligence,
} from "@/components/news/NewsBriefingIntelligence";
import { NewsBriefingSection } from "@/components/news/NewsBriefingSection";
import { NewsBriefingSkeleton } from "@/components/news/NewsBriefingSkeleton";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import { NewsCompactVideoRow } from "@/components/news/NewsCompactVideoRow";
import { NewsDataStatusBanner, countNewsHubVerifiedItems } from "@/components/news/NewsDataStatusBanner";
import { resolveNewsMediaTypeFromItem } from "@/lib/services/news/newsMediaType";
import { NewsEmptyState } from "@/components/news/NewsEmptyState";
import { NewsForPortfolioSection } from "@/components/news/NewsForPortfolioSection";
import { NewsMacroGroupsSection } from "@/components/news/NewsMacroGroupsSection";
import { NewsMarketBriefSection } from "@/components/news/NewsMarketBriefSection";
import { NewsMarketsTodaySection } from "@/components/news/NewsMarketsTodaySection";
import { NewsSearchBar } from "@/components/news/NewsSearchBar";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import {
  areMajorMarketsClosed,
  buildTodaysDecision,
} from "@/lib/client/todaysDecision";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import {
  buildNewsBriefingLayout,
  findSupportingBriefingItems,
} from "@/lib/services/news/newsBriefingLayout";
import { buildRankedSearchResults } from "@/lib/services/news/newsFeedRanking";
import {
  NEWS_SEARCH_EMPTY_MESSAGE,
  collectSearchableNewsItems,
  filterNewsItems,
  isNewsSearchActive,
  type NewsSearchScopeFilter,
} from "@/lib/services/news/newsSearchFilter";
import {
  countHoldingsMentionedInPortfolioCards,
  PORTFOLIO_NEWS_SECTION_ID,
} from "@/lib/services/news/portfolioNewsNav";
import type { NewsApiResponse, NewsContentItem } from "@/lib/types/newsContent";

export function NewsHubContent({
  payload,
  intelligence,
  isStale,
  onRefresh,
  isRefreshing,
}: {
  payload: NewsApiResponse;
  intelligence: InvestmentIntelligence;
  isStale: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<NewsSearchScopeFilter>("all");

  const allItems = useMemo(() => collectSearchableNewsItems(payload), [payload]);
  const filteredItems = useMemo(
    () => filterNewsItems(allItems, searchQuery, searchScope),
    [allItems, searchQuery, searchScope],
  );
  const isSearchActive = isNewsSearchActive(searchQuery, searchScope);
  const searchResults = useMemo(
    () => buildRankedSearchResults(filteredItems),
    [filteredItems],
  );

  const preliminaryBriefing = useMemo(
    () => buildNewsBriefingLayout(payload),
    [payload],
  );

  const pageDedupSeed = useMemo(() => {
    const seed: NewsContentItem[] = [];
    const searchable = collectSearchableNewsItems(payload);

    if (intelligence.mustWatch?.itemId) {
      const mustWatchItem =
        searchable.find((item) => item.id === intelligence.mustWatch?.itemId) ??
        preliminaryBriefing.allPortfolioItems.find(
          (item) => item.id === intelligence.mustWatch?.itemId,
        );
      if (mustWatchItem) {
        seed.push(mustWatchItem);
      }
    }

    const todaysDecision = buildTodaysDecision({
      intelligence,
      intelligenceFromCache: true,
      upcomingEvents: payload.upcomingEvents,
      marketsClosed: areMajorMarketsClosed(),
    });

    const supporting = findSupportingBriefingItems({
      items: preliminaryBriefing.allPortfolioItems,
      decisionText: todaysDecision.decision,
      mustWatchId: intelligence.mustWatch?.itemId ?? null,
      relatedSymbols: [
        ...intelligence.holdingInsights.positive,
        ...intelligence.holdingInsights.negative,
        ...intelligence.holdingInsights.neutral,
      ],
    });

    seed.push(...supporting);

    const seen = new Set<string>();
    return seed.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [payload, intelligence, preliminaryBriefing.allPortfolioItems]);

  const briefing = useMemo(
    () => buildNewsBriefingLayout(payload, { pageDedupSeed }),
    [payload, pageDedupSeed],
  );

  const portfolioNewsNav = useMemo(() => {
    if (briefing.portfolioCards.length === 0) {
      return null;
    }
    const count = countHoldingsMentionedInPortfolioCards(briefing.portfolioCards);
    if (count <= 0) {
      return null;
    }
    return { count, sectionId: PORTFOLIO_NEWS_SECTION_ID };
  }, [briefing.portfolioCards]);

  const verifiedItemCount = useMemo(
    () => countNewsHubVerifiedItems(payload),
    [payload],
  );

  const hasBriefingContent =
    briefing.marketBriefHeadlines.length > 0 ||
    briefing.portfolioCards.length > 0 ||
    briefing.macroGroups.length > 0 ||
    briefing.marketsToday.length > 0 ||
    briefing.allVideos.length > 0;

  function clearSearch() {
    setSearchQuery("");
    setSearchScope("all");
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <NewsBriefingIntelligence
        intelligence={intelligence}
        portfolioItems={preliminaryBriefing.allPortfolioItems}
        upcomingEvents={payload.upcomingEvents}
        portfolioNewsNav={portfolioNewsNav}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {!isSearchActive && hasBriefingContent && !isRefreshing ? (
        <NewsMarketsTodaySection regions={briefing.marketsToday} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <NewsSearchBar
          query={searchQuery}
          scopeFilter={searchScope}
          resultCount={filteredItems.length}
          isActive={isSearchActive}
          onQueryChange={setSearchQuery}
          onScopeFilterChange={setSearchScope}
          onClear={clearSearch}
        />
        <NewsBriefingDiscoverLink />
      </div>

      {!isSearchActive ? (
        <>
          <NewsDataStatusBanner
            dataStatus={payload.dataStatus}
            fetchedAt={payload.fetchedAt}
            isStale={isStale}
            verifiedItemCount={verifiedItemCount}
            sourceErrorCount={payload.dataStatus.unavailableSourceCount}
          />
          <p className={appSectionLabelClass}>
            Last refreshed: {formatNewsRefreshedAt(payload.fetchedAt)}
          </p>
        </>
      ) : null}

      {isRefreshing && !isSearchActive ? <NewsBriefingSkeleton /> : null}

      {isSearchActive && filteredItems.length === 0 ? (
        <NewsEmptyState
          title={NEWS_SEARCH_EMPTY_MESSAGE}
          description="Try a different keyword, ticker, or filter."
          actionLabel="Clear search"
          onAction={clearSearch}
        />
      ) : null}

      {isSearchActive && filteredItems.length > 0 ? (
        <NewsBriefingSection
          id="news-search-results"
          title="Search results"
          description="Matching verified content from your loaded brief."
          allItems={searchResults}
          previewLimit={10}
          emptyTitle="No matches"
          emptyDescription="Try another query."
          renderItem={(item) =>
            resolveNewsMediaTypeFromItem(item) === "video" ? (
              <NewsCompactVideoRow item={item} />
            ) : (
              <NewsCompactArticleRow item={item} />
            )
          }
        />
      ) : null}

      {!isSearchActive && hasBriefingContent && !isRefreshing ? (
        <div className="min-w-0 space-y-6 sm:space-y-7">
          <NewsMarketBriefSection headlines={briefing.marketBriefHeadlines} />
          <NewsForPortfolioSection cards={briefing.portfolioCards} />
          <NewsMacroGroupsSection groups={briefing.macroGroups} />

          <NewsBriefingSection
            id="news-videos"
            title="Videos"
            description="Trusted market channels only — Bloomberg TV, CNBC, Coin Bureau."
            allItems={briefing.allVideos}
            previewLimit={5}
            emptyTitle="No videos"
            emptyDescription="Verified market videos will appear here when available."
            renderItem={(item) => <NewsCompactVideoRow item={item} />}
          />
        </div>
      ) : null}

      {!isSearchActive && !hasBriefingContent && !isRefreshing ? (
        <NewsEmptyState
          title="No verified news available"
          description="Verified news feeds may be quiet right now, or sources may be temporarily unavailable."
          actionLabel="Refresh brief"
          onAction={onRefresh}
        />
      ) : null}

      <NewsBriefingFooter />
    </div>
  );
}
