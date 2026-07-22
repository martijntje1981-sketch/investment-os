"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles, TrendingUp } from "lucide-react";

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

export function DashboardIntelligenceSummary({
  intelligence,
}: {
  intelligence: InvestmentIntelligence;
}) {
  const topBullets = intelligence.todayMatters.slice(0, 3);

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-800 bg-slate-950 text-white shadow-xl md:rounded-[28px]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 px-4 py-4 md:px-6">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
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
        <Link
          href="/news"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/15"
        >
          Open full briefing
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-3 px-4 py-4 md:px-6 md:py-5">
        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            Summary
          </p>
          <p className="mt-2 text-base leading-relaxed text-slate-100 line-clamp-3">
            {intelligence.portfolioSummary}
          </p>
        </div>

        <div className="rounded-[18px] border border-white/10 bg-white/[0.04] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">
            <TrendingUp className="h-3.5 w-3.5" />
            What matters today
          </div>
          {topBullets.length > 0 ? (
            <ul className="mt-2 space-y-1.5 text-sm leading-6 text-slate-100">
              {topBullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span className="text-violet-300">•</span>
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
      </div>
    </section>
  );
}
