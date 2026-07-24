"use client";

import Link from "next/link";
import { ArrowUpRight, ExternalLink, Radio } from "lucide-react";

import { DiscoverMissedTeaser } from "@/components/discover/DiscoverSections";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { IntelligenceBulletRow } from "@/components/news/IntelligenceArticleLink";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appDashboardFeatureShellClass,
  appDashboardDarkBodyMediumClass,
  appDashboardDarkMetaClass,
  appDashboardDarkMutedClass,
  appHeroMetricLabelClass,
  appTableNameClass,
} from "@/components/layout/appSurface";
import { buildIntelligenceDisplayMessage } from "@/lib/client/todaysDecision";
import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { MissedItem } from "@/lib/services/discover/types";
import { intelligenceBulletKey } from "@/lib/services/news/intelligenceBullets";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "border-white/15 bg-white/10 text-white/85",
  Watching: "border-blue-400/30 bg-blue-500/15 text-blue-100",
  Elevated: "border-violet-400/30 bg-violet-500/15 text-violet-100",
  "High Attention": "border-violet-400/40 bg-violet-500/20 text-violet-50",
};

export function DashboardIntelligencePreview({
  intelligence,
  goalProgress = null,
  marketsClosed,
  intelligenceFromCache = false,
  missedItems = [],
}: {
  intelligence: InvestmentIntelligence;
  goalProgress?: Pick<
    GoalProgress,
    "hasGoal" | "currentTrajectory" | "status" | "goalReached"
  > | null;
  marketsClosed?: boolean;
  intelligenceFromCache?: boolean;
  missedItems?: MissedItem[];
}) {
  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
  });
  const mustWatch = intelligence.mustWatch;
  const secondaryBullets = intelligence.todayMatters
    .filter((bullet) => {
      if (!mustWatch?.canonicalUrl) {
        return true;
      }
      return bullet.canonicalUrl !== mustWatch.canonicalUrl;
    })
    .slice(0, 2);

  return (
    <section className={appDashboardFeatureShellClass}>
      <DashboardSectionHeader
        variant="feature"
        title="Market briefing"
        subtitle="Portfolio-aware context for today"
        icon={<Radio className="h-5 w-5" />}
        trailing={
          <Link
            href="/news"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-[13px] font-semibold text-white transition hover:border-violet-400/30 hover:bg-violet-500/20"
          >
            Open briefing
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        }
      />

      <div className="space-y-4 px-4 py-4 md:space-y-5 md:px-6 md:py-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus]}`}
          >
            {intelligence.portfolioStatus}
          </span>
          <span className={appDashboardDarkMetaClass}>
            Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
          </span>
        </div>

        <div className="rounded-[20px] border border-white/10 bg-white/[0.05] px-4 py-4 md:px-5 md:py-4">
          <p className={appHeroMetricLabelClass}>Lead insight</p>
          {mustWatch && isValidArticleUrl(mustWatch.canonicalUrl) ? (
            <div className="mt-3 min-w-0">
              <a
                href={mustWatch.canonicalUrl.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="group block min-w-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                <p className={`${appTableNameClass} leading-snug text-white group-hover:text-violet-100`}>
                  {mustWatch.title}
                </p>
                <p className={`mt-2 ${appDashboardDarkMutedClass}`}>
                  {mustWatch.reason}
                </p>
                <span className={`mt-3 inline-flex flex-wrap items-center gap-x-2 gap-y-1 ${appDashboardDarkMetaClass}`}>
                  {mustWatch.sourceName ? <span>{mustWatch.sourceName}</span> : null}
                  <span className="inline-flex items-center gap-1 font-semibold text-violet-200 group-hover:text-violet-100">
                    Read featured story
                    <ExternalLink className="h-3 w-3 shrink-0 opacity-80" aria-hidden />
                  </span>
                </span>
              </a>
            </div>
          ) : (
            <p className={`mt-3 ${appDashboardDarkBodyMediumClass}`}>
              {summaryMessage}
            </p>
          )}
        </div>

        {mustWatch && isValidArticleUrl(mustWatch.canonicalUrl) ? (
          <p className={appDashboardDarkMutedClass}>{summaryMessage}</p>
        ) : null}

        {secondaryBullets.length > 0 ? (
          <div className="border-t border-white/10 pt-4">
            <p className={appHeroMetricLabelClass}>Also worth noting</p>
            <ul className="mt-3 space-y-2.5">
              {secondaryBullets.map((bullet) => (
                <li
                  key={intelligenceBulletKey(bullet)}
                  className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2.5"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/80" />
                  <span className="min-w-0 flex-1">
                    <IntelligenceBulletRow
                      bullet={bullet}
                      variant="dark"
                      linkLabel="Read more"
                    />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {missedItems.length > 0 ? (
          <DiscoverMissedTeaser items={missedItems} variant="dark" />
        ) : null}
      </div>
    </section>
  );
}
