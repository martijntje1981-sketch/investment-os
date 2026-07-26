"use client";

import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { NEWS_HUB_PATH } from "@/lib/navigation/newsHubRoutes";
import { buildIntelligenceDisplayMessage } from "@/lib/client/todaysDecision";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";

const STATUS_STYLES: Record<
  InvestmentIntelligence["portfolioStatus"],
  string
> = {
  Stable: "border-slate-200 bg-slate-50 text-slate-700",
  Watching: "border-blue-200 bg-blue-50 text-blue-800",
  Elevated: "border-violet-200 bg-violet-50 text-violet-800",
  "High Attention": "border-violet-300 bg-violet-100 text-violet-900",
};

/**
 * Compact Dashboard preview of Market Briefing.
 * Lead insight reuses existing mustWatch ranking / intelligence display message.
 * Full briefing lives on Market Intelligence (`/news`).
 */
export function DashboardIntelligencePreview({
  intelligence,
  goalProgress = null,
  marketsClosed,
  intelligenceFromCache = false,
}: {
  intelligence: InvestmentIntelligence;
  goalProgress?: Pick<
    GoalProgress,
    "hasGoal" | "currentTrajectory" | "status" | "goalReached"
  > | null;
  marketsClosed?: boolean;
  intelligenceFromCache?: boolean;
  /** @deprecated Phase 2: missed-item teasers belong on Discover, not Dashboard. */
  missedItems?: unknown;
}) {
  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
  });
  const mustWatch = intelligence.mustWatch;
  const leadTitle = mustWatch?.title?.trim() || summaryMessage;
  const supportingLine = mustWatch?.reason?.trim() || null;
  const holdingContext = mustWatch?.sourceName?.trim() || null;

  return (
    <section className={appDashboardLightCardClass}>
      <DashboardSectionHeader
        variant="compact"
        title="Market briefing"
        subtitle="One lead insight for today"
        icon={<Radio className="h-5 w-5" />}
        iconToneClassName="bg-violet-50 text-violet-700 ring-1 ring-violet-100"
      />

      <div className={`${appCardPaddingClass} space-y-3.5 pt-0`}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus]}`}
          >
            {intelligence.portfolioStatus}
          </span>
          <span className={appSectionMetaClass}>
            Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
          </span>
        </div>

        <div className="min-w-0">
          <p
            className={`line-clamp-3 ${appSectionBodyClass} font-semibold text-slate-950`}
            title={leadTitle}
          >
            {leadTitle}
          </p>
          {supportingLine && supportingLine !== leadTitle ? (
            <p
              className={`mt-1.5 line-clamp-2 ${appSectionMetaClass}`}
              title={supportingLine}
            >
              {supportingLine}
            </p>
          ) : null}
          {holdingContext ? (
            <p className={`mt-1.5 ${appSectionMetaClass}`}>{holdingContext}</p>
          ) : null}
        </div>

        <Link
          href={NEWS_HUB_PATH}
          className="inline-flex min-h-[40px] items-center gap-1.5 text-sm font-semibold text-violet-700 transition hover:text-violet-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
        >
          Open Market Intelligence
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
