"use client";

import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

import { DiscoverMissedTeaser } from "@/components/discover/DiscoverSections";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { IntelligenceBulletRow } from "@/components/news/IntelligenceArticleLink";
import { appCardClass, appCardPaddingClass } from "@/components/layout/appSurface";
import { buildIntelligenceDisplayMessage } from "@/lib/client/todaysDecision";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { MissedItem } from "@/lib/services/discover/types";
import { intelligenceBulletKey } from "@/lib/services/news/intelligenceBullets";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "border-emerald-200 bg-emerald-50 text-emerald-800",
  Watching: "border-blue-200 bg-blue-50 text-blue-800",
  Elevated: "border-amber-200 bg-amber-50 text-amber-900",
  "High Attention": "border-rose-200 bg-rose-50 text-rose-900",
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
  const previewBullets = intelligence.todayMatters.slice(0, 2);
  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
  });

  return (
    <section className={appCardClass}>
      <div
        className={`flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 ${appCardPaddingClass}`}
      >
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">
            <Radio className="h-3.5 w-3.5" />
            Market intelligence
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] ${STATUS_STYLES[intelligence.portfolioStatus]}`}
            >
              {intelligence.portfolioStatus}
            </span>
            <span className="text-xs text-slate-500">
              Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
            </span>
          </div>
        </div>
        <Link
          href="/news"
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-slate-50"
        >
          Open briefing
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className={`space-y-3 ${appCardPaddingClass} pt-0`}>
        <p className="text-sm leading-relaxed text-slate-700">{summaryMessage}</p>

        {previewBullets.length > 0 ? (
          <ul className="space-y-1.5 text-sm leading-6 text-slate-700">
            {previewBullets.map((bullet) => (
              <li key={intelligenceBulletKey(bullet)} className="flex gap-2">
                <span className="text-slate-400">•</span>
                <span className="min-w-0 flex-1">
                  <IntelligenceBulletRow bullet={bullet} variant="light" />
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {missedItems.length > 0 ? (
          <DiscoverMissedTeaser items={missedItems} variant="light" />
        ) : null}
      </div>
    </section>
  );
}
