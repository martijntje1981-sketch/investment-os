"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { buildIntelligenceDisplayMessage } from "@/lib/client/todaysDecision";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "bg-emerald-50 text-emerald-800 border-emerald-200",
  Watching: "bg-blue-50 text-blue-800 border-blue-200",
  Elevated: "bg-amber-50 text-amber-800 border-amber-200",
  "High Attention": "bg-rose-50 text-rose-800 border-rose-200",
};

export function HomeIntelligenceSummary({
  intelligence,
  intelligenceFromCache,
  goalProgress = null,
  marketsClosed,
  embedded = false,
}: {
  intelligence: InvestmentIntelligence | null;
  intelligenceFromCache: boolean;
  goalProgress?: Pick<
    GoalProgress,
    "hasGoal" | "currentTrajectory" | "status" | "goalReached"
  > | null;
  marketsClosed?: boolean;
  embedded?: boolean;
}) {
  const wrapperClass = embedded
    ? "min-w-0"
    : "rounded-[20px] border border-slate-200 bg-white px-4 py-4 sm:px-5";

  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
  });

  return (
    <section className={wrapperClass}>
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Portfolio intelligence
            </p>
            {intelligence ? (
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus]}`}
              >
                {intelligence.portfolioStatus}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 text-base leading-relaxed text-slate-700">
            {summaryMessage}
          </p>
          {intelligence ? (
            <p className="mt-1 text-sm text-slate-500">
              Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
            </p>
          ) : null}
        </div>
        <Link
          href="/news"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
        >
          {intelligence ? "Open briefing" : "Briefing"}
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
