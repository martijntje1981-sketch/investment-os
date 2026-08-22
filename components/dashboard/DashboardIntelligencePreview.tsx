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
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { buildIntelligenceDisplayMessage } from "@/lib/client/todaysDecision";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { InvestmentIntelligence } from "@/lib/services/news/investmentIntelligence";

const STATUS_STYLES: Record<InvestmentIntelligence["portfolioStatus"], string> =
  {
    Stable: "border-slate-200 bg-slate-50 text-slate-700",
    Watching: "border-q1/30 bg-q1-soft text-q1-deep",
    Elevated: "border-amber-200 bg-amber-50 text-amber-900",
    "High Attention": "border-rose-200 bg-rose-50 text-rose-900",
  };

/**
 * Compact Market Briefing card — one lead insight for the intelligence row.
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
    <section className={`${appDashboardLightCardClass} h-full`}>
      <DashboardSectionHeader
        variant="compact"
        title="Market Briefing"
        subtitle="One lead insight for today"
        icon={<Radio className="h-5 w-5" />}
        iconToneClassName="bg-q4-soft text-q4-strong ring-1 ring-q4/20"
      />

      <div
        className={`${appCardPaddingClass} flex h-full flex-col space-y-3 pt-0`}
      >
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

        <div className="min-w-0 flex-1">
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
          href={DASHBOARD_DEEP_LINKS.marketBriefing}
          className={appTextLinkClass}
        >
          Open Market Intelligence
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
