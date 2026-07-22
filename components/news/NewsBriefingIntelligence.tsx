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
  Stable: "bg-emerald-500/15 text-emerald-100 border-emerald-400/20",
  Watching: "bg-blue-500/15 text-blue-100 border-blue-400/20",
  Elevated: "bg-amber-500/15 text-amber-100 border-amber-400/20",
  "High Attention": "bg-rose-500/15 text-rose-100 border-rose-400/20",
};

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

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 text-white shadow-xl">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-violet-200">
            <Sparkles className="h-3.5 w-3.5" aria-hidden />
            Today&apos;s Portfolio Intelligence
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] ${STATUS_STYLES[intelligence.portfolioStatus]}`}
            >
              {intelligence.portfolioStatus}
            </span>
            <span className="text-xs text-slate-400">
              Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
            </span>
          </div>
        </div>
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15 disabled:opacity-50"
          >
            <Clock3 className={`h-4 w-4 ${isRefreshing ? "animate-pulse" : ""}`} aria-hidden />
            Refresh
          </button>
        ) : null}
      </div>

      <div className="space-y-3 px-4 py-4 sm:px-5">
        <TodaysDecisionBlock decision={todaysDecision} variant="dark" />

        <div className="rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Today&apos;s Summary
          </p>
          <p className="mt-2 text-base leading-relaxed text-slate-100">{summaryMessage}</p>
        </div>

        <div className="rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            What Matters Today
          </p>
          {topMatters.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-100">
              {topMatters.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-violet-300" aria-hidden>
                    •
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-slate-400">
              No material developments were detected.
            </p>
          )}
        </div>

        {intelligence.mustWatch ? (
          <div className="rounded-[16px] border border-violet-400/20 bg-violet-500/10 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-violet-200">
              Must Watch
            </p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-violet-50">
              {intelligence.mustWatch.title}
            </p>
            <p className="mt-1 text-sm text-violet-100/80">{intelligence.mustWatch.reason}</p>
            <a
              href={intelligence.mustWatch.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-bold text-white"
            >
              {intelligence.mustWatch.type === "video" ? "Watch" : "Open"}
              <ArrowUpRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        ) : null}

        {supportingItems.length > 0 ? (
          <div className="rounded-[16px] border border-white/10 bg-white/[0.04] px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
              Supporting coverage
            </p>
            <ul className="mt-2 space-y-1">
              {supportingItems.map((item) => (
                <li key={item.id}>
                  <NewsCompactArticleRow item={item} variant="dark" compact />
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
