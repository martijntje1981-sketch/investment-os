import { Clock3, Sparkles, Target, TrendingUp } from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import type { TodaysMarketBrief } from "@/lib/types/newsContent";

const KIND_LABELS = {
  macro: "Macro",
  portfolio: "Portfolio",
  general: "Signal",
} as const;

export function TodaysMarketBriefHero({
  brief,
  onRefresh,
  isRefreshing,
}: {
  brief: TodaysMarketBrief;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-800 bg-slate-950 text-white shadow-2xl sm:rounded-[32px]">
      <div className="border-b border-white/10 px-4 py-4 sm:px-8 sm:py-6">
        <div className="flex flex-wrap items-start justify-between gap-3 sm:gap-4">
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-violet-200">
              <Sparkles className="h-3.5 w-3.5" />
              Daily intelligence
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-[-0.05em] sm:mt-4 sm:text-4xl lg:text-5xl">
              {brief.title}
            </h1>
            <p className="mt-2 hidden max-w-2xl text-sm leading-6 text-slate-300 sm:block sm:text-base">
              Your opening read for macro moves, portfolio headlines, and what to
              watch before the session unfolds.
            </p>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/15 disabled:opacity-50 sm:px-4 sm:py-2.5 sm:text-sm"
          >
            <Clock3 className={`h-4 w-4 ${isRefreshing ? "animate-pulse" : ""}`} />
            Refresh
          </button>
        </div>

        <p className="mt-3 text-[11px] font-semibold text-slate-400 sm:mt-4 sm:text-xs">
          Last updated: {formatNewsRefreshedAt(brief.updatedAt)}
        </p>
      </div>

      <div className="border-b border-white/10 px-4 py-4 sm:px-8 sm:py-5">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          At a glance
        </p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:gap-4 sm:overflow-visible">
          <div className="min-w-[240px] shrink-0 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 sm:min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-blue-300">
              <TrendingUp className="h-3.5 w-3.5" />
              Macro
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-100">
              {brief.biggestMacroDevelopment}
            </p>
          </div>

          <div className="min-w-[240px] shrink-0 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 sm:min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-emerald-300">
              <Sparkles className="h-3.5 w-3.5" />
              Portfolio
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-100">
              {brief.biggestPortfolioDevelopment ??
                "Add holdings to unlock personalised portfolio read-through."}
            </p>
          </div>

          <div className="min-w-[240px] shrink-0 rounded-[20px] border border-violet-400/20 bg-violet-500/10 p-4 sm:min-w-0">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-violet-200">
              <Target className="h-3.5 w-3.5" />
              Watch today
            </div>
            <p className="mt-2 line-clamp-3 text-sm leading-6 text-violet-50">
              {brief.whatToWatchToday}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-8 sm:py-6">
        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
          Key insights
        </p>
        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible xl:grid-cols-3">
          {brief.keyInsights.map((insight) => (
            <article
              key={insight.id}
              className="min-w-[240px] shrink-0 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 sm:min-w-0 sm:p-5"
            >
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
                {KIND_LABELS[insight.kind]}
              </span>
              <p className="mt-3 text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">
                {insight.label}
              </p>
              <p className="mt-2 line-clamp-4 text-sm leading-6 text-slate-100">
                {insight.text}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
