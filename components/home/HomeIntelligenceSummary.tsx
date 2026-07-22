"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
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
  embedded = false,
}: {
  intelligence: InvestmentIntelligence | null;
  embedded?: boolean;
}) {
  const wrapperClass = embedded
    ? "min-w-0"
    : "rounded-[20px] border border-slate-200 bg-white px-4 py-4 sm:px-5";

  if (!intelligence) {
    return (
      <section className={wrapperClass}>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Portfolio intelligence
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-600">
              Open today&apos;s briefing for verified news matched to your holdings.
            </p>
          </div>
          <Link
            href="/news"
            className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            Briefing
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={wrapperClass}>
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-600" aria-hidden />
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              Portfolio intelligence
            </p>
            <span
              className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus]}`}
            >
              {intelligence.portfolioStatus}
            </span>
          </div>
          <p className="mt-2 line-clamp-2 text-base leading-relaxed text-slate-700">
            {intelligence.portfolioSummary}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
          </p>
        </div>
        <Link
          href="/news"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Open briefing
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
