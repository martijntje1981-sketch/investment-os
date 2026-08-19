"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";

import {
  appSectionBodyClass,
  appSectionBodyMediumClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTableNameClass,
} from "@/components/layout/appSurface";
import {
  appIdentityMattersCardClass,
  appIdentityMattersIconClass,
  appIdentityMattersMetricClass,
} from "@/components/layout/semanticIdentity";
import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
import { IntelligenceBulletRow } from "@/components/news/IntelligenceArticleLink";
import { intelligenceBulletKey } from "@/lib/services/news/intelligenceBullets";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import {
  areMajorMarketsClosed,
  buildIntelligenceDisplayMessage,
  buildTodaysDecision,
} from "@/lib/client/todaysDecision";
import { findSupportingBriefingItems } from "@/lib/services/news/newsBriefingLayout";
import { selectTrustedNewsThumbnailFromUrl } from "@/lib/services/news/newsThumbnail";
import { renderPortfolioSummaryMessage } from "@/components/news/PortfolioHoldingsMentionedLink";
import type { PortfolioNewsNavTarget } from "@/components/news/PortfolioHoldingsMentionedLink";
import {
  buildNewsMediaPresentation,
  getNewsMediaCtaLabel,
} from "@/lib/services/news/newsMediaType";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { NewsContentItem, UpcomingMarketEvent } from "@/lib/types/newsContent";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Watching: "border-blue-200 bg-blue-50 text-blue-800",
  Elevated: "border-amber-200 bg-amber-50 text-amber-900",
  "High Attention": "border-rose-200 bg-rose-50 text-rose-800",
};

function itemSupportingText(item: NewsContentItem): string | null {
  if (item.interpretation?.trim()) {
    return item.interpretation.trim();
  }
  if (item.summary?.trim()) {
    return item.summary.trim();
  }
  if (item.description?.trim()) {
    return item.description.trim();
  }
  if (item.relevanceLabel?.trim()) {
    return item.relevanceLabel.trim();
  }
  return null;
}

export function NewsBriefingIntelligence({
  intelligence,
  portfolioItems,
  upcomingEvents,
  portfolioNewsNav = null,
  onRefresh,
  isRefreshing,
}: {
  intelligence: InvestmentIntelligence;
  portfolioItems: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
  portfolioNewsNav?: PortfolioNewsNavTarget | null;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  const marketsClosed = areMajorMarketsClosed();
  const todaysDecision = buildTodaysDecision({
    intelligence,
    intelligenceFromCache: true,
    upcomingEvents,
    marketsClosed,
  });
  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache: true,
    marketsClosed,
  });
  const topMatters = intelligence.todayMatters.slice(0, 5);
  const supportingItems = findSupportingBriefingItems({
    items: portfolioItems,
    decisionText: todaysDecision.decision,
    mustWatchId: intelligence.mustWatch?.itemId ?? null,
    relatedSymbols: [
      ...intelligence.holdingInsights.positive,
      ...intelligence.holdingInsights.negative,
      ...intelligence.holdingInsights.neutral,
    ],
  });
  const mustWatchItem = intelligence.mustWatch
    ? portfolioItems.find((item) => item.id === intelligence.mustWatch?.itemId) ?? null
    : null;
  const mustWatchDetail = mustWatchItem ? itemSupportingText(mustWatchItem) : null;
  const mustWatchPresentation = mustWatchItem
    ? buildNewsMediaPresentation(mustWatchItem)
    : null;
  const mustWatchThumbnailUrl = mustWatchItem
    ? selectTrustedNewsThumbnailFromUrl(
        mustWatchItem.thumbnailUrl,
        mustWatchItem.sourceType,
      )
    : null;
  const showMustWatchDetail =
    Boolean(mustWatchDetail) &&
    mustWatchDetail !== intelligence.mustWatch?.reason &&
    mustWatchDetail !== intelligence.mustWatch?.title;

  return (
    <section className={appIdentityMattersCardClass}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-violet-200/80 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className={appIdentityMattersIconClass}>
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className={appSectionTitleClass}>
                Today&apos;s portfolio intelligence
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus]}`}
                >
                  {intelligence.portfolioStatus}
                </span>
                <span className={appSectionMetaClass}>
                  Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
                </span>
              </div>
            </div>
          </div>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            <Clock3
              className={`h-4 w-4 ${isRefreshing ? "animate-pulse" : ""}`}
              aria-hidden
            />
            Refresh
          </button>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
        <div className="rounded-[20px] border-2 border-cyan-200 bg-gradient-to-br from-cyan-50 to-white px-4 py-4 sm:px-5 sm:py-5">
          <p className={`${appSectionBodyMediumClass} text-cyan-900`}>
            Today&apos;s portfolio summary
          </p>
          <p className={`mt-3 text-[1.125rem] font-semibold leading-snug text-slate-950`}>
            {renderPortfolioSummaryMessage(summaryMessage, portfolioNewsNav)}
          </p>
        </div>

        <TodaysDecisionBlock decision={todaysDecision} variant="light" />

        <div className={appIdentityMattersMetricClass}>
          <p className={`${appSectionBodyMediumClass} text-violet-900`}>
            What matters for your portfolio
          </p>
          {topMatters.length > 0 ? (
            <ul className={`mt-3 space-y-2.5 ${appSectionBodyClass} text-slate-700`}>
              {topMatters.map((bullet) => (
                <li key={intelligenceBulletKey(bullet)} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <IntelligenceBulletRow bullet={bullet} variant="light" />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={`mt-3 ${appSectionBodyClass} text-slate-500`}>
              No material developments were detected.
            </p>
          )}
        </div>

        {intelligence.mustWatch ? (
          <div className="overflow-hidden rounded-[20px] border border-brand/25 bg-brand-soft px-4 py-4">
            <p className={`${appSectionBodyMediumClass} text-brand-navy`}>Top story</p>
            <div className="mt-3 flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
              {mustWatchItem && mustWatchPresentation && mustWatchThumbnailUrl ? (
                <NewsMediaThumbnail
                  thumbnailUrl={mustWatchItem.thumbnailUrl}
                  sourceType={mustWatchItem.sourceType}
                  fallbackCategory={mustWatchPresentation.thumbnailFallbackCategory}
                  size="editorial"
                  showPlayIndicator={mustWatchPresentation.showPlayIndicator}
                  priority
                  alt={intelligence.mustWatch.title}
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className={`${appTableNameClass} break-words`}>{intelligence.mustWatch.title}</p>
                <p className={`mt-2 ${appSectionBodyClass} text-slate-700`}>
                  {intelligence.mustWatch.reason}
                </p>
                {showMustWatchDetail ? (
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    {mustWatchDetail}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                  <span>{intelligence.mustWatch.sourceName}</span>
                  {mustWatchItem && mustWatchPresentation ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{mustWatchPresentation.subjectLabel}</span>
                    </>
                  ) : null}
                  {mustWatchItem?.relevanceLabel ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{mustWatchItem.relevanceLabel}</span>
                    </>
                  ) : null}
                </div>
                <a
                  href={intelligence.mustWatch.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-1.5 rounded-xl border border-brand/25 bg-white px-4 py-2 text-sm font-bold text-brand-navy transition hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 motion-reduce:transition-none sm:mt-4 sm:w-auto sm:justify-start"
                >
                  {getNewsMediaCtaLabel(intelligence.mustWatch.type)}
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {supportingItems.length > 0 ? (
          <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-4">
            <p className="text-sm font-semibold text-slate-700">
              Supporting coverage
            </p>
            <ul className="mt-3 space-y-2">
              {supportingItems.map((item) => (
                <li key={item.id}>
                  <NewsCompactArticleRow item={item} variant="light" />
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function NewsBriefingFooter() {
  return (
    <p className="rounded-[18px] border border-slate-200 bg-white/80 px-4 py-3 text-center text-sm leading-relaxed text-slate-500">
      News summaries and interpretations are for information only and are not financial
      advice.
    </p>
  );
}

export function NewsBriefingDiscoverLink() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="/perspectives"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        Perspectives
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
      <Link
        href="/discover"
        className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
      >
        Open Ideas
        <ArrowUpRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
