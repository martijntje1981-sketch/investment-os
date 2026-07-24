"use client";

import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

import { DiscoverMissedTeaser } from "@/components/discover/DiscoverSections";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { IntelligenceBulletRow } from "@/components/news/IntelligenceArticleLink";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionEyebrowClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { buildIntelligenceDisplayMessage } from "@/lib/client/todaysDecision";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";
import type { MissedItem } from "@/lib/services/discover/types";
import { intelligenceBulletKey } from "@/lib/services/news/intelligenceBullets";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "border-slate-200 bg-slate-50 text-slate-700",
  Watching: "border-blue-200/80 bg-blue-50/80 text-blue-800",
  Elevated: "border-amber-200/80 bg-amber-50/80 text-amber-900",
  "High Attention": "border-amber-200/80 bg-amber-50/90 text-amber-950",
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
        className={`flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 ${appCardPaddingClass}`}
      >
        <div className="min-w-0">
          <div className={`inline-flex items-center gap-2 ${appSectionEyebrowClass}`}>
            <Radio className="h-3.5 w-3.5" />
            Intelligence
          </div>
          <h2 className={`mt-1 ${appSectionTitleClass}`}>Market briefing</h2>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[intelligence.portfolioStatus]}`}
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
          className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:border-slate-300 hover:bg-slate-50"
        >
          Open briefing
          <ArrowUpRight className="h-4 w-4" />
        </Link>
      </div>

      <div className={`space-y-4 ${appCardPaddingClass}`}>
        <p className="text-sm leading-relaxed text-slate-700">{summaryMessage}</p>

        {previewBullets.length > 0 ? (
          <ul className="space-y-2 text-sm leading-6 text-slate-700">
            {previewBullets.map((bullet) => (
              <li key={intelligenceBulletKey(bullet)} className="flex gap-2.5">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" />
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
