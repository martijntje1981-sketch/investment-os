"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";

import { BackButton } from "@/components/layout/BackButton";
import BottomNavigation from "@/components/home/BottomNav";
import { AppPageLoading, PageContainer } from "@/components/layout/PageContainer";
import {
  appCardClass,
  appHeroMetricLabelClass,
  appHeroShellClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  PerspectiveCompactCard,
  PerspectiveFeaturedCard,
} from "@/components/perspectives/PerspectiveCards";
import { MakeTobaileyYoursCard } from "@/components/conversion/MakeTobaileyYoursCard";
import { resolveAudienceState } from "@/lib/auth/routeAccess";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import type { PerspectivesPayload } from "@/lib/services/perspectives/types";

export default function PerspectivesPage() {
  const { userSub, holdings, portfolioReady } = useUserPortfolio();
  const [payload, setPayload] = useState<PerspectivesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const audience = resolveAudienceState({
    authenticated: Boolean(userSub),
    holdingsCount: holdings.length,
  });

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

  if ((!portfolioReady && userSub) || (loading && !payload)) {
    return <AppPageLoading />;
  }

  return (
    <>
      <PageContainer stackClassName="gap-5 md:gap-6">
        <section
          className={`${appHeroShellClass} px-5 py-7 sm:px-8 sm:py-8`}
          aria-labelledby="perspectives-page-heading"
        >
          <div className="mb-4">
            <BackButton />
          </div>
          <p className={appHeroMetricLabelClass}>Investment intelligence</p>
          <h1
            id="perspectives-page-heading"
            className="mt-2 text-3xl font-bold tracking-[-0.03em] text-white"
          >
            Perspectives
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] font-medium leading-relaxed text-white/75">
            High-signal market opinions from a curated set of independent
            creators — macro, bitcoin, investing, and technology.
          </p>
        </section>

        {audience !== "authenticated_holdings" ? (
          <MakeTobaileyYoursCard audience={audience} showSoftLine />
        ) : null}

        {error ? (
          <div className={`${appCardClass} px-5 py-6`}>
            <p className={appSectionTitleClass}>Could not load perspectives</p>
            <p className={`mt-2 ${appSectionSubtitleClass}`}>{error}</p>
          </div>
        ) : payload?.state === "provider_unavailable" ? (
          <div className={`${appCardClass} px-5 py-6`}>
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 text-brand" aria-hidden />
              <div>
                <p className={appSectionTitleClass}>Perspectives unavailable</p>
                <p className={`mt-2 ${appSectionSubtitleClass}`}>
                  Official creator feeds could not be reached right now. Try
                  again shortly.
                </p>
              </div>
            </div>
          </div>
        ) : !payload || payload.videos.length === 0 ? (
          <div className={`${appCardClass} px-5 py-6`}>
            <p className={appSectionTitleClass}>No recent perspectives</p>
            <p className={`mt-2 ${appSectionSubtitleClass}`}>
              No verified uploads matched the current creator window.
            </p>
          </div>
        ) : (
          <div className="space-y-8 md:space-y-10">
            {payload.feedErrors > 0 ? (
              <p className={appSectionMetaClass}>
                Showing available creators
                {payload.feedErrors === 1
                  ? " — 1 feed temporarily unavailable."
                  : ` — ${payload.feedErrors} feeds temporarily unavailable.`}
              </p>
            ) : null}

            <section aria-labelledby="latest-perspectives-heading">
              <div className="mb-4 md:mb-5">
                <h2
                  id="latest-perspectives-heading"
                  className={appSectionTitleClass}
                >
                  Latest Perspectives
                </h2>
                <p className={`mt-1 ${appSectionMetaClass}`}>
                  Newest featured uploads from the curated creator set.
                </p>
              </div>
              <div className="grid auto-rows-fr gap-4 md:grid-cols-2 md:gap-5 xl:grid-cols-3">
                {payload.featured.map((video) => (
                  <PerspectiveFeaturedCard key={video.id} video={video} />
                ))}
              </div>
            </section>

            {payload.byCategory.map((group) => (
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
                      <PerspectiveCompactCard video={video} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
