"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Globe2 } from "lucide-react";

import { PortfolioIntelligencePanel } from "@/components/intelligence/PortfolioIntelligencePanel";
import { NewsDataStatusBanner, countNewsHubVerifiedItems } from "@/components/news/NewsDataStatusBanner";
import { NewsEmptyState } from "@/components/news/NewsEmptyState";
import { NewsFeedItem } from "@/components/news/NewsFeedItem";
import { NewsHubTabs } from "@/components/news/NewsHubTabs";
import { NewsSearchBar } from "@/components/news/NewsSearchBar";
import { NewsSectionHeader } from "@/components/news/NewsSectionHeader";
import { PortfolioNewsPreview } from "@/components/news/PortfolioNewsPreview";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { UpcomingEventsStrip } from "@/components/news/UpcomingEventsStrip";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { NewsHubTab } from "@/lib/navigation/newsHubRoutes";
import {
  buildNewsHubLayout,
  buildRankedSearchResults,
} from "@/lib/services/news/newsFeedRanking";
import {
  NEWS_SEARCH_EMPTY_MESSAGE,
  collectSearchableNewsItems,
  filterNewsItems,
  isNewsSearchActive,
  type NewsSearchScopeFilter,
} from "@/lib/services/news/newsSearchFilter";
import type { NewsApiResponse } from "@/lib/types/newsContent";

const MOBILE_PORTFOLIO_PREVIEW_COUNT = 2;

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
  const [activeTab, setActiveTab] = useState<NewsHubTab>("market");
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<NewsSearchScopeFilter>("all");
  const [showMoreVideos, setShowMoreVideos] = useState(false);
  const portfolioSectionRef = useRef<HTMLElement | null>(null);

  const allItems = useMemo(() => collectSearchableNewsItems(payload), [payload]);

  const filteredItems = useMemo(
    () => filterNewsItems(allItems, searchQuery, searchScope),
    [allItems, searchQuery, searchScope],
  );

  const isSearchActive = isNewsSearchActive(searchQuery, searchScope);

  const layout = useMemo(
    () => buildNewsHubLayout(filteredItems),
    [filteredItems],
  );

  const searchResults = useMemo(
    () => buildRankedSearchResults(filteredItems),
    [filteredItems],
  );

  const searchResultCount = filteredItems.length;

  const previewItems = useMemo(
    () => layout.topPortfolioStories.slice(0, MOBILE_PORTFOLIO_PREVIEW_COUNT),
    [layout.topPortfolioStories],
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const updateViewport = () => setIsMobileViewport(media.matches);
    updateViewport();
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  const showMobilePreview =
    isMobileViewport &&
    !isSearchActive &&
    layout.topPortfolioStories.length > MOBILE_PORTFOLIO_PREVIEW_COUNT &&
    !portfolioExpanded;

  function clearSearch() {
    setSearchQuery("");
    setSearchScope("all");
    setShowMoreVideos(false);
  }

  function expandPortfolioSection() {
    setPortfolioExpanded(true);
    window.requestAnimationFrame(() => {
      portfolioSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  const verifiedItemCount = useMemo(
    () => countNewsHubVerifiedItems(payload),
    [payload],
  );

  const hasVisibleContent =
    !isSearchActive &&
    (layout.topPortfolioStories.length > 0 ||
      layout.marketsMacro.length > 0 ||
      layout.latestRelevantFeed.length > 0);

  return (
    <div className="space-y-6 sm:space-y-8">
      <PortfolioIntelligencePanel
        intelligence={intelligence}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      <NewsSearchBar
        query={searchQuery}
        scopeFilter={searchScope}
        resultCount={searchResultCount}
        isActive={isSearchActive}
        onQueryChange={setSearchQuery}
        onScopeFilterChange={setSearchScope}
        onClear={clearSearch}
      />

      {!isSearchActive ? (
        <NewsDataStatusBanner
          dataStatus={payload.dataStatus}
          fetchedAt={payload.fetchedAt}
          isStale={isStale}
          verifiedItemCount={verifiedItemCount}
          sourceErrorCount={payload.dataStatus.unavailableSourceCount}
        />
      ) : null}

      {!isSearchActive ? (
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 sm:text-sm">
          Last refreshed: {formatNewsRefreshedAt(payload.fetchedAt)}
        </p>
      ) : null}

      {isSearchActive && searchResultCount === 0 ? (
        <NewsEmptyState
          title={NEWS_SEARCH_EMPTY_MESSAGE}
          description="Try a different keyword, ticker, or filter."
          actionLabel="Clear search"
          onAction={clearSearch}
        />
      ) : null}

      {isSearchActive && searchResultCount > 0 ? (
        <section className="space-y-6">
          <NewsSectionHeader
            eyebrow="Search results"
            title="Matching verified content"
            description="Articles and videos from your loaded brief, ranked by relevance."
            icon={<Globe2 className="h-6 w-6" />}
          />
          <div className="grid gap-6">
            {searchResults.map((item) => (
              <NewsFeedItem key={item.id} item={item} />
            ))}
          </div>
        </section>
      ) : null}

      {!isSearchActive && hasVisibleContent ? (
        <>
          {showMobilePreview ? (
            <PortfolioNewsPreview
              items={previewItems}
              totalCount={layout.topPortfolioStories.length}
              onViewAll={expandPortfolioSection}
            />
          ) : null}

          {(layout.topPortfolioStories.length > 0 || !isSearchActive) ? (
            <section
              ref={portfolioSectionRef}
              id="portfolio-news"
              className={`scroll-mt-24 space-y-6 ${showMobilePreview ? "hidden lg:block" : ""}`}
            >
              <NewsSectionHeader
                eyebrow="For your portfolio"
                title="Top stories for your portfolio"
                description="Verified headlines and videos matched to your holdings."
                icon={<BriefcaseBusiness className="h-6 w-6" />}
              />
              {layout.topPortfolioStories.length > 0 ? (
                <div className="grid gap-6">
                  {layout.topPortfolioStories.map((item) => (
                    <NewsFeedItem key={item.id} item={item} />
                  ))}
                </div>
              ) : (
                <NewsEmptyState
                  title="No portfolio matches yet"
                  description="Add holdings with confirmed instrument mappings to unlock verified portfolio headlines."
                  actionHref="/portfolio"
                  actionLabel="Review portfolio"
                />
              )}
            </section>
          ) : null}

          {layout.marketsMacro.length > 0 ? (
            <section className="space-y-6">
              <NewsSectionHeader
                eyebrow="Market context"
                title="Markets & macro"
                description="Broader developments likely to affect multiple holdings."
                icon={<Globe2 className="h-6 w-6" />}
              />
              <div className="grid gap-6">
                {layout.marketsMacro.map((item) => (
                  <NewsFeedItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {layout.latestRelevantFeed.length > 0 ? (
            <section className="space-y-6">
              <NewsSectionHeader
                eyebrow="Ranked feed"
                title="Latest relevant news"
                description="Mixed verified articles and videos, ordered by portfolio relevance."
                icon={<Globe2 className="h-6 w-6" />}
              />
              <div className="grid gap-6">
                {layout.latestRelevantFeed.map((item) => (
                  <NewsFeedItem key={item.id} item={item} />
                ))}
              </div>
            </section>
          ) : null}

          {layout.moreVideos.length > 0 ? (
            <section className="space-y-4">
              <button
                type="button"
                onClick={() => setShowMoreVideos((value) => !value)}
                className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
              >
                {showMoreVideos
                  ? "Hide additional videos"
                  : `More videos (${layout.moreVideos.length})`}
              </button>
              {showMoreVideos ? (
                <div className="grid gap-6 sm:grid-cols-2">
                  {layout.moreVideos.map((item) => (
                    <NewsFeedItem key={item.id} item={item} />
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
              Explore next
            </p>
            <p className="text-sm text-slate-600">
              Upcoming events and calendar data below.
            </p>
            <NewsHubTabs activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {activeTab === "events" ? (
            <section className="space-y-6" role="tabpanel">
              <UpcomingEventsStrip
                events={payload.upcomingEvents}
                eventsState={payload.dataStatus.eventsState}
              />
            </section>
          ) : null}
        </>
      ) : null}

      {!isSearchActive && !hasVisibleContent ? (
        <NewsEmptyState
          title="No verified news available"
          description="Verified news feeds may be quiet right now, or sources may be temporarily unavailable."
          actionLabel="Refresh brief"
          onAction={onRefresh}
        />
      ) : null}

      <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-xs leading-6 text-slate-500 sm:text-sm">
        News summaries and interpretations are for information only and are not
        financial advice.
      </p>
    </div>
  );
}
