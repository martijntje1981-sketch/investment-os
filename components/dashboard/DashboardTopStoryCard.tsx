"use client";

import { useState } from "react";
import { ArrowUpRight, Newspaper } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import {
  buildHeroTopStoryPreview,
  type HeroTopStoryPreview,
} from "@/lib/client/dashboardHeroIntelligence";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { NewsApiResponse } from "@/lib/types/newsContent";

function StoryThumb({ url }: { url: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!url || failed) {
    return (
      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand-navy">
        <Newspaper className="h-5 w-5" aria-hidden />
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      className="h-14 w-14 shrink-0 rounded-xl object-cover"
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Supporting Dashboard Top Story summary — outside the portfolio hero.
 */
export function DashboardTopStoryCard({
  intelligence,
  newsPayload,
  preferPortfolioRelevant = true,
}: {
  intelligence: InvestmentIntelligence | null;
  newsPayload: NewsApiResponse | null;
  preferPortfolioRelevant?: boolean;
}) {
  const story: HeroTopStoryPreview | null = buildHeroTopStoryPreview({
    intelligence,
    payload: newsPayload,
    preferPortfolioRelevant,
  });

  return (
    <section
      className={appDashboardLightCardClass}
      aria-labelledby="dashboard-top-story-heading"
    >
      <DashboardSectionHeader
        variant="compact"
        titleId="dashboard-top-story-heading"
        title="Top Story"
        subtitle="Lead market context"
        icon={<Newspaper className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700"
      />
      <div className={`${appCardPaddingClass} pt-0`}>
        {story ? (
          <div className="flex min-w-0 items-start gap-3">
            <StoryThumb url={story.thumbnailUrl} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-950">
                {story.title}
              </p>
              <p className={`mt-1 ${appSectionMetaClass}`}>{story.meta}</p>
              <a
                href={
                  story.href.startsWith("http")
                    ? story.href
                    : DASHBOARD_DEEP_LINKS.portfolioNews
                }
                {...(story.href.startsWith("http")
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
                className={`mt-2 ${appTextLinkClass}`}
              >
                Read story
                <ArrowUpRight className="h-4 w-4" aria-hidden />
              </a>
            </div>
          </div>
        ) : (
          <div>
            <p className={appSectionMetaClass}>No story available right now.</p>
            <a
              href={DASHBOARD_DEEP_LINKS.marketBriefing}
              className={`mt-2 ${appTextLinkClass}`}
            >
              View all news
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        )}
      </div>
    </section>
  );
}
