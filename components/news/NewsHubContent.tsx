"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BriefcaseBusiness, Globe2 } from "lucide-react";

import { CollapsibleMarketVideos } from "@/components/news/CollapsibleMarketVideos";
import { MarketCategoryFilters } from "@/components/news/MarketCategoryFilters";
import { NewsArticleCard } from "@/components/news/NewsArticleCard";
import { NewsDataStatusBanner, countNewsHubVerifiedItems } from "@/components/news/NewsDataStatusBanner";
import { NewsEmptyState } from "@/components/news/NewsEmptyState";
import { NewsHubTabs } from "@/components/news/NewsHubTabs";
import { NewsSearchBar } from "@/components/news/NewsSearchBar";
import { NewsSectionHeader } from "@/components/news/NewsSectionHeader";
import { PortfolioNewsPreview } from "@/components/news/PortfolioNewsPreview";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { TodaysMarketBriefHero } from "@/components/news/TodaysMarketBrief";
import { UpcomingEventsStrip } from "@/components/news/UpcomingEventsStrip";
import type { NewsHubTab } from "@/lib/navigation/newsHubRoutes";
import type { MarketNewsCategoryFilter } from "@/lib/navigation/newsHubRoutes";
import {
  filterMarketNewsByCategory,
  mergePortfolioSectionItems,
  selectAboveFoldPortfolioItems,
} from "@/lib/services/news/newsHubModel";
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
  isStale,
  onRefresh,
  isRefreshing,
}: {
  payload: NewsApiResponse;
  isStale: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  const [activeTab, setActiveTab] = useState<NewsHubTab>("market");
  const [marketCategory, setMarketCategory] =
    useState<MarketNewsCategoryFilter>("all");
  const [portfolioExpanded, setPortfolioExpanded] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchScope, setSearchScope] = useState<NewsSearchScopeFilter>("all");
  const portfolioSectionRef = useRef<HTMLElement | null>(null);

  const portfolioItems = useMemo(
    () =>
      mergePortfolioSectionItems({
        portfolioNews: payload.portfolioNews,
        dividendNews: payload.dividendNews,
        analystNews: payload.analystNews,
      }),
    [payload.analystNews, payload.dividendNews, payload.portfolioNews],
  );

  const filteredMarketNews = useMemo(
    () =>
      filterNewsItems(
        filterMarketNewsByCategory(payload.macroNews, marketCategory),
        searchQuery,
        searchScope,
      ),
    [marketCategory, payload.macroNews, searchQuery, searchScope],
  );

  const filteredPortfolioItems = useMemo(
    () => filterNewsItems(portfolioItems, searchQuery, searchScope),
    [portfolioItems, searchQuery, searchScope],
  );

  const filteredMarketVideos = useMemo(
    () => filterNewsItems(payload.marketVideos, searchQuery, searchScope),
    [payload.marketVideos, searchQuery, searchScope],
  );

  const isSearchActive = isNewsSearchActive(searchQuery, searchScope);

  const searchResultCount = useMemo(
    () =>
      filterNewsItems(
        collectSearchableNewsItems(payload),
        searchQuery,
        searchScope,
      ).length,
    [payload, searchQuery, searchScope],
  );

  const previewItems = useMemo(
    () =>
      selectAboveFoldPortfolioItems(
        filteredPortfolioItems,
        MOBILE_PORTFOLIO_PREVIEW_COUNT,
      ),
    [filteredPortfolioItems],
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
    filteredPortfolioItems.length > MOBILE_PORTFOLIO_PREVIEW_COUNT &&
    !portfolioExpanded;

  function clearSearch() {
    setSearchQuery("");
    setSearchScope("all");
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

  return (
    <div className="space-y-6 sm:space-y-8">
      <TodaysMarketBriefHero
        brief={payload.marketBrief}
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

      {showMobilePreview ? (
        <PortfolioNewsPreview
          items={previewItems}
          totalCount={filteredPortfolioItems.length}
          onViewAll={expandPortfolioSection}
        />
      ) : null}

      {isSearchActive && searchResultCount === 0 ? null : (
        <>
          {(filteredPortfolioItems.length > 0 || !isSearchActive) ? (
            <section
              ref={portfolioSectionRef}
              id="portfolio-news"
              className={`scroll-mt-24 space-y-6 ${showMobilePreview ? "hidden lg:block" : ""}`}
            >
              <NewsSectionHeader
                eyebrow="For your portfolio"
                title="Relevant to your holdings"
                description="Matched using confirmed provider symbols and verified instrument mappings wherever available."
                icon={<BriefcaseBusiness className="h-6 w-6" />}
              />
              {filteredPortfolioItems.length > 0 ? (
                <div className="grid gap-6">
                  {filteredPortfolioItems.map((item) => (
                    <NewsArticleCard key={item.id} item={item} variant="portfolio" />
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

          {!isSearchActive ? (
            <div className="space-y-3">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                Explore next
              </p>
              <p className="text-sm text-slate-600">
                Today&apos;s brief and portfolio headlines are above. Choose market news or
                verified upcoming events below.
              </p>
              <NewsHubTabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
          ) : null}

          {(isSearchActive || activeTab === "market") &&
          (filteredMarketNews.length > 0 || !isSearchActive) ? (
            <section className="space-y-6" role="tabpanel">
              <NewsSectionHeader
                eyebrow="Market news"
                title="Broader market context"
                description="Macro, equities, crypto, commodities, and geopolitics from verified sources."
                icon={<Globe2 className="h-6 w-6" />}
              />
              {!isSearchActive ? (
                <MarketCategoryFilters
                  activeCategory={marketCategory}
                  onCategoryChange={setMarketCategory}
                />
              ) : null}
              {filteredMarketNews.length > 0 ? (
                <div className="grid gap-6">
                  {filteredMarketNews.map((item) => (
                    <NewsArticleCard key={item.id} item={item} variant="macro" />
                  ))}
                </div>
              ) : (
                <NewsEmptyState
                  title={
                    marketCategory === "all"
                      ? "No market stories available"
                      : `No ${marketCategory} stories in the current feed`
                  }
                  description="Verified market feeds may be quiet right now, or sources may be temporarily unavailable."
                  actionLabel="Refresh brief"
                  onAction={onRefresh}
                />
              )}
            </section>
          ) : null}

          {!isSearchActive && activeTab === "events" ? (
            <section className="space-y-6" role="tabpanel">
              <UpcomingEventsStrip
                events={payload.upcomingEvents}
                eventsState={payload.dataStatus.eventsState}
              />
            </section>
          ) : null}

          {(filteredMarketVideos.length > 0 || !isSearchActive) ? (
            <CollapsibleMarketVideos videos={filteredMarketVideos} />
          ) : null}
        </>
      )}

      <p className="rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-center text-xs leading-6 text-slate-500 sm:text-sm">
        News summaries and interpretations are for information only and are not
        financial advice.
      </p>
    </div>
  );
}
