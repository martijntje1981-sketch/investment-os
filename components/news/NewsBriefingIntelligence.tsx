"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, Sparkles } from "lucide-react";

import { TodaysDecisionBlock } from "@/components/investor/TodaysDecisionBlock";
import { NewsCompactArticleRow } from "@/components/news/NewsCompactArticleRow";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import {
  areMajorMarketsClosed,
  buildIntelligenceDisplayMessage,
  buildTodaysDecision,
} from "@/lib/client/todaysDecision";
import { findSupportingBriefingItems } from "@/lib/services/news/newsBriefingLayout";
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
  onRefresh,
  isRefreshing,
}: {
  intelligence: InvestmentIntelligence;
  portfolioItems: NewsContentItem[];
  upcomingEvents: UpcomingMarketEvent[];
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
  const showMustWatchDetail =
    Boolean(mustWatchDetail) &&
    mustWatchDetail !== intelligence.mustWatch?.reason &&
    mustWatchDetail !== intelligence.mustWatch?.title;

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
        <div className="min-w-0">
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <Sparkles className="h-5 w-5" aria-hidden />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-[-0.02em] text-slate-950 sm:text-xl">
                Today&apos;s portfolio intelligence
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus]}`}
                >
                  {intelligence.portfolioStatus}
                </span>
                <span className="text-sm text-slate-500">
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

      <div className="space-y-4 px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
        <div className="rounded-[20px] border border-violet-100 bg-violet-50/70 px-4 py-4 sm:px-5 sm:py-5">
          <p className="text-sm font-semibold text-slate-700">
            Today&apos;s portfolio summary
          </p>
          <p className="mt-3 text-base font-medium leading-relaxed text-slate-950 sm:text-lg">
            {summaryMessage}
          </p>
        </div>

        <TodaysDecisionBlock decision={todaysDecision} variant="light" />

        <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-4">
          <p className="text-sm font-semibold text-slate-700">
            What matters for your portfolio
          </p>
          {topMatters.length > 0 ? (
            <ul className="mt-3 space-y-2.5 text-sm leading-6 text-slate-700">
              {topMatters.map((bullet) => (
                <li key={bullet} className="flex gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" aria-hidden />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              No material developments were detected.
            </p>
          )}
        </div>

        {intelligence.mustWatch ? (
          <div className="rounded-[18px] border border-violet-200 bg-violet-50 px-4 py-4">
            <p className="text-sm font-semibold text-violet-900">Top story</p>
            <p className="mt-3 text-base font-semibold leading-snug text-slate-950">
              {intelligence.mustWatch.title}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-700">
              {intelligence.mustWatch.reason}
            </p>
            {showMustWatchDetail ? (
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                {mustWatchDetail}
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
              <span>{intelligence.mustWatch.sourceName}</span>
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
              className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-violet-200 bg-white px-4 py-2 text-sm font-bold text-violet-800 transition hover:bg-violet-100/60"
            >
              {intelligence.mustWatch.type === "video" ? "Watch" : "Open"}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
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
    <Link
      href="/discover"
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
    >
      Open Discover
      <ArrowUpRight className="h-4 w-4" aria-hidden />
    </Link>
  );
}
