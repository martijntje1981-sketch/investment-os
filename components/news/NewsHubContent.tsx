"use client";

import { useMemo, useState } from "react";

import {
  NewsBriefingDiscoverLink,
  NewsBriefingFooter,
  NewsBriefingIntelligence,
} from "@/components/news/NewsBriefingIntelligence";
import { NewsBriefingSection } from "@/components/news/NewsBriefingSection";
import { NewsBriefingSkeleton } from "@/components/news/NewsBriefingSkeleton";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import { NewsCompactEventRow } from "@/components/news/NewsCompactEventsList";
import { NewsCompactVideoRow } from "@/components/news/NewsCompactVideoRow";
import { NewsDataStatusBanner, countNewsHubVerifiedItems } from "@/components/news/NewsDataStatusBanner";
import { NewsEmptyState } from "@/components/news/NewsEmptyState";
import { NewsForPortfolioSection } from "@/components/news/NewsForPortfolioSection";
import { NewsMacroGroupsSection } from "@/components/news/NewsMacroGroupsSection";
import { NewsMarketBriefSection } from "@/components/news/NewsMarketBriefSection";
import { NewsMarketsTodaySection } from "@/components/news/NewsMarketsTodaySection";
import { NewsSearchBar } from "@/components/news/NewsSearchBar";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import { buildNewsBriefingLayout } from "@/lib/services/news/newsBriefingLayout";
import { buildRankedSearchResults } from "@/lib/services/news/newsFeedRanking";
import {
  NEWS_SEARCH_EMPTY_MESSAGE,
  collectSearchableNewsItems,
  filterNewsItems,
  isNewsSearchActive,
  type NewsSearchScopeFilter,
} from "@/lib/services/news/newsSearchFilter";
import type { NewsApiResponse } from "@/lib/types/newsContent";

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

  const briefing = useMemo(() => buildNewsBriefingLayout(payload), [payload]);

  const verifiedItemCount = useMemo(
    () => countNewsHubVerifiedItems(payload),
    [payload],
  );

  const hasBriefingContent =
    briefing.marketBriefHeadlines.length > 0 ||
    briefing.portfolioCards.length > 0 ||
    briefing.macroGroups.length > 0 ||
    briefing.marketsToday.length > 0 ||
    briefing.allVideos.length > 0 ||
    briefing.upcomingEvents.totalCount > 0;

  function clearSearch() {
    setSearchQuery("");
    setSearchScope("all");
  }

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      <header className="min-w-0">
        <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950 sm:text-3xl">
          News
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-slate-600 sm:text-base">
          Premium market intelligence — personalized, deduplicated, and ranked for your portfolio.
        </p>
      </header>

      <NewsBriefingIntelligence
        intelligence={intelligence}
        portfolioItems={briefing.allPortfolioItems}
        upcomingEvents={payload.upcomingEvents}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

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
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
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
            item.sourceType === "youtube" ? (
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
          <NewsMarketsTodaySection regions={briefing.marketsToday} />

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

          <NewsBriefingSection
            id="news-upcoming-events"
            title="Upcoming Events"
            description="Earnings, central bank decisions, CPI, and macro catalysts."
            allItems={payload.upcomingEvents}
            previewLimit={5}
            emptyTitle="No upcoming events"
            emptyDescription="Calendar events will appear when verified by the events provider."
            renderItem={(event) => <NewsCompactEventRow event={event} />}
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
