"use client";

import {
  AlertTriangle,
  ArrowUpRight,
  BriefcaseBusiness,
  Clock3,
  PlayCircle,
  Sparkles,
  TrendingUp,
} from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "bg-emerald-500/15 text-emerald-100 border-emerald-400/20",
  Watching: "bg-blue-500/15 text-blue-100 border-blue-400/20",
  Elevated: "bg-amber-500/15 text-amber-100 border-amber-400/20",
  "High Attention": "bg-rose-500/15 text-rose-100 border-rose-400/20",
};

export function PortfolioIntelligencePanel({
  intelligence,
  onRefresh,
  isRefreshing,
  compact = false,
}: {
  intelligence: InvestmentIntelligence;
  onRefresh?: () => void;
  isRefreshing?: boolean;
  compact?: boolean;
}) {
  const hasImpactEvidence =
    intelligence.holdingInsights.positive.length > 0 ||
    intelligence.holdingInsights.neutral.length > 0 ||
    intelligence.holdingInsights.negative.length > 0;

  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 text-white shadow-2xl sm:rounded-[32px]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Investment intelligence
            </div>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.05em] sm:text-3xl">
              Today&apos;s Portfolio Intelligence
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Derived from verified news already loaded for your portfolio. Context only — not advice.
            </p>
          </div>

          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
            >
              <Clock3 className={`h-4 w-4 ${isRefreshing ? "animate-pulse" : ""}`} />
              Refresh
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full border px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] ${STATUS_STYLES[intelligence.portfolioStatus]}`}
          >
            {intelligence.portfolioStatus}
          </span>
          <span className="text-xs font-semibold text-slate-400">
            Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
          </span>
        </div>
      </div>

      <div className={`grid gap-4 px-4 py-4 sm:px-8 sm:py-6 ${compact ? "" : "lg:grid-cols-2"}`}>
        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              Today&apos;s summary
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-100">
              {intelligence.portfolioSummary}
            </p>
          </div>

          {hasImpactEvidence ? (
            <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                <BriefcaseBusiness className="h-3.5 w-3.5" />
                Portfolio impact
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <ImpactColumn
                  label="Positive"
                  symbols={intelligence.holdingInsights.positive}
                  tone="positive"
                />
                <ImpactColumn
                  label="Neutral"
                  symbols={intelligence.holdingInsights.neutral}
                  tone="neutral"
                />
                <ImpactColumn
                  label="Negative"
                  symbols={intelligence.holdingInsights.negative}
                  tone="negative"
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
              <TrendingUp className="h-3.5 w-3.5" />
              What matters today
            </div>
            {intelligence.todayMatters.length > 0 ? (
              <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-100">
                {intelligence.todayMatters.map((bullet) => (
                  <li key={bullet} className="flex gap-2">
                    <span className="text-violet-300">•</span>
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm leading-6 text-slate-400">
                No material developments were detected.
              </p>
            )}
          </div>

          {intelligence.mustWatch ? (
            <div className="rounded-[22px] border border-violet-400/20 bg-violet-500/10 p-4 sm:p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-200">
                {intelligence.mustWatch.type === "video" ? (
                  <PlayCircle className="h-3.5 w-3.5" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5" />
                )}
                Must watch
              </div>
              <p className="mt-3 text-sm font-semibold leading-7 text-violet-50">
                {intelligence.mustWatch.title}
              </p>
              <p className="mt-2 text-xs leading-6 text-violet-100/80">
                {intelligence.mustWatch.reason} Source: {intelligence.mustWatch.sourceName}
              </p>
              <a
                href={intelligence.mustWatch.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-950 transition hover:bg-slate-100"
              >
                {intelligence.mustWatch.type === "video" ? "Watch video" : "Read article"}
                <ArrowUpRight className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ImpactColumn({
  label,
  symbols,
  tone,
}: {
  label: string;
  symbols: string[];
  tone: "positive" | "neutral" | "negative";
}) {
  const toneClass =
    tone === "positive"
      ? "text-emerald-200"
      : tone === "negative"
        ? "text-rose-200"
        : "text-slate-300";

  return (
    <div>
      <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${toneClass}`}>
        {label}
      </p>
      {symbols.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {symbols.map((symbol) => (
            <span
              key={symbol}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-bold text-white"
            >
              {symbol}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-xs text-slate-500">—</p>
      )}
    </div>
  );
}
