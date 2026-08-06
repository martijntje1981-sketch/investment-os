"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

import BottomNavigation from "@/components/home/BottomNav";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import {
  MARKET_PULSE_PATH,
  NEWS_PATH,
} from "@/lib/navigation/appRoutes";
import { PAGE_PURPOSE } from "@/lib/navigation/productArchitecture";
import {
  appCardClass,
  appCardPaddingClass,
  appDashboardDarkMetaClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  PerspectiveCompactCard,
  PerspectiveTodaysCard,
} from "@/components/perspectives/PerspectiveCards";
import {
  perspectiveCategoryChipClass,
  perspectiveCategoryLabel,
} from "@/components/perspectives/perspectiveStyles";
import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import { resolveAudienceState } from "@/lib/auth/routeAccess";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  PERSPECTIVE_CATEGORY_ORDER,
  type PerspectiveCategoryId,
} from "@/lib/services/perspectives/creators";
import {
  buildPerspectiveRelevance,
  derivePerspectivePortfolioSignals,
  orderPerspectivesForAudience,
  selectTodaysPerspective,
} from "@/lib/services/perspectives/relevance";
import { formatUpdatedMinutesAgo } from "@/lib/services/perspectives/relativeTime";
import type { PerspectivesPayload } from "@/lib/services/perspectives/types";

type CategoryFilter = "all" | PerspectiveCategoryId;

function PerspectivesSkeleton() {
  return (
    <div className="space-y-6" aria-hidden>
      <div className={`${appCardClass} overflow-hidden`}>
        <div className="aspect-video animate-pulse bg-slate-100 lg:hidden" />
        <div className="grid lg:grid-cols-2">
          <div className="hidden aspect-video animate-pulse bg-slate-100 lg:block" />
          <div className="space-y-3 px-5 py-6">
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-8 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-28 animate-pulse rounded-[20px] border border-slate-200/80 bg-white"
          />
        ))}
      </div>
    </div>
  );
}

export default function PerspectivesPage() {
  const { userSub, holdings, portfolioReady } = useUserPortfolio();
  const [payload, setPayload] = useState<PerspectivesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");

  const audience = resolveAudienceState({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
  });

  const signals = useMemo(
    () => derivePerspectivePortfolioSignals(holdings),
    [holdings],
  );

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/perspectives");
        const data = (await response.json()) as PerspectivesPayload & {
          success?: boolean;
          error?: string;
        };
        if (!response.ok || data.success === false) {
          throw new Error(data.error ?? "Unable to load perspectives.");
        }
        if (!cancelled) setPayload(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Unable to load perspectives.",
          );
          setPayload(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const todaysPerspective = useMemo(() => {
    if (!payload?.videos.length) return null;
    return selectTodaysPerspective(payload.videos, signals);
  }, [payload, signals]);

  const orderedVideos = useMemo(() => {
    if (!payload?.videos.length) return [];
    return orderPerspectivesForAudience(payload.videos, signals).filter(
      (video) => video.id !== todaysPerspective?.id,
    );
  }, [payload, signals, todaysPerspective?.id]);

  const filteredByCategory = useMemo(() => {
    const groups = PERSPECTIVE_CATEGORY_ORDER.map((category) => ({
      category,
      label: perspectiveCategoryLabel(category),
      videos: orderedVideos.filter((video) => video.category === category),
    })).filter((group) => group.videos.length > 0);

    if (categoryFilter === "all") return groups;
    return groups.filter((group) => group.category === categoryFilter);
  }, [orderedVideos, categoryFilter]);

  if ((!portfolioReady && userSub) || (loading && !payload && !error)) {
    return (
      <>
        <PageContainer stackClassName="gap-5 md:gap-6">
          <PageHero
            title="Perspectives"
            subtitle="Curated market viewpoints — open detail when you want it."
            backToDashboard={Boolean(userSub)}
          />
          <PerspectivesSkeleton />
        </PageContainer>
        <BottomNavigation />
      </>
    );
  }

  return (
    <>
      <PageContainer stackClassName="gap-5 md:gap-6">
        <PageHero
          title="Perspectives"
          subtitle="Why today’s news matters — curated viewpoints on macro, investing and technology."
          backToDashboard={Boolean(userSub)}
          stats={
            payload?.fetchedAt ? (
              <p className={`${appDashboardDarkMetaClass} mt-0`}>
                {formatUpdatedMinutesAgo(payload.fetchedAt)}
              </p>
            ) : null
          }
        />

        <PageRelatedLinks
          purpose={PAGE_PURPOSE.perspectives}
          links={[
            { href: NEWS_PATH, label: "Open News" },
            { href: MARKET_PULSE_PATH, label: "Market Pulse" },
          ]}
        />

        {audience !== "authenticated_holdings" ? (
          <MakeTobaileyYoursCard audience={audience} showSoftLine />
        ) : null}

        {error ? (
          <div className={`${appCardClass} ${appCardPaddingClass}`}>
            <p className={appSectionTitleClass}>Could not load perspectives</p>
            <p className={`mt-2 ${appSectionSubtitleClass}`}>{error}</p>
          </div>
        ) : payload?.state === "provider_unavailable" ? (
          <div className={`${appCardClass} ${appCardPaddingClass}`}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-brand" aria-hidden />
              <div>
                <p className={appSectionTitleClass}>Perspectives unavailable</p>
                <p className={`mt-2 ${appSectionSubtitleClass}`}>
                  Creator feeds could not be reached. Try again shortly.
                </p>
                {payload.unavailableCreatorIds.length > 0 ? (
                  <p className={`mt-2 ${appSectionMetaClass}`}>
                    Failed feeds: {payload.unavailableCreatorIds.length} of{" "}
                    {payload.creatorCount}.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        ) : !payload || payload.videos.length === 0 ? (
          <div className={`${appCardClass} ${appCardPaddingClass}`}>
            <p className={appSectionTitleClass}>No recent perspectives</p>
            <p className={`mt-2 ${appSectionSubtitleClass}`}>
              No verified uploads matched the current creator window.
            </p>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-10">
            {payload.servedFromLastSuccess ? (
              <p className={appSectionMetaClass}>
                Showing the last successful Perspectives snapshot while live
                creator feeds refresh.
              </p>
            ) : null}
            {payload.feedErrors > 0 ? (
              <p className={appSectionMetaClass}>
                Showing available creators
                {payload.feedErrors === 1
                  ? " — 1 feed temporarily unavailable."
                  : ` — ${payload.feedErrors} feeds temporarily unavailable.`}
              </p>
            ) : null}

            {todaysPerspective ? (
              <section aria-labelledby="todays-perspective-heading">
                <h2 id="todays-perspective-heading" className="sr-only">
                  Today’s Perspective
                </h2>
                <PerspectiveTodaysCard
                  video={todaysPerspective}
                  relevance={buildPerspectiveRelevance(
                    todaysPerspective,
                    signals,
                  )}
                />
              </section>
            ) : null}

            <div
              className="flex flex-wrap gap-2"
              role="toolbar"
              aria-label="Perspective categories"
            >
              <button
                type="button"
                onClick={() => setCategoryFilter("all")}
                className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                  categoryFilter === "all"
                    ? "bg-navy-hero text-white"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                All
              </button>
              {PERSPECTIVE_CATEGORY_ORDER.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setCategoryFilter(category)}
                  className={`rounded-full px-3 py-1.5 text-[12px] font-bold transition ${
                    categoryFilter === category
                      ? perspectiveCategoryChipClass(category)
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {perspectiveCategoryLabel(category)}
                </button>
              ))}
            </div>

            {filteredByCategory.map((group) => (
              <section
                key={group.category}
                aria-labelledby={`perspectives-${group.category}`}
                className="space-y-3 md:space-y-3.5"
              >
                <h2
                  id={`perspectives-${group.category}`}
                  className={appSectionTitleClass}
                >
                  {group.label}
                </h2>
                <ul className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                  {group.videos.map((video) => (
                    <li key={video.id}>
                      <PerspectiveCompactCard
                        video={video}
                        relevance={buildPerspectiveRelevance(video, signals)}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}

            {filteredByCategory.length === 0 ? (
              <div className={`${appCardClass} px-5 py-6`}>
                <p className={appSectionTitleClass}>
                  No videos in this category
                </p>
                <p className={`mt-2 ${appSectionSubtitleClass}`}>
                  Try another category filter or check back after feeds refresh.
                </p>
              </div>
            ) : null}

            <p className={`${appSectionMetaClass} max-w-3xl`}>
              External views are presented for informational purposes. Inclusion
              does not imply endorsement by Tobailey.
            </p>
          </div>
        )}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
