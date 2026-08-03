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
import {
  buildIntelligenceDisplayMessage,
  buildTodaysDecision,
  shouldShowTodaysDecisionSubsection,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";

const STATUS_STYLES: Record<string, string> = {
  Stable: "border-slate-200 bg-slate-50 text-slate-700",
  Watching: "border-blue-200 bg-blue-50 text-blue-800",
  Elevated: "border-violet-200 bg-violet-50 text-violet-800",
  "High Attention": "border-violet-300 bg-violet-100 text-violet-900",
};

/**
 * Combined Today’s Decision + Market Briefing in one Dashboard card.
 * Non-advisory: lead market insight + concise portfolio implication.
 */
export function DashboardTodaysMarketBriefing(context: TodaysDecisionContext) {
  const { intelligence, intelligenceFromCache, goalProgress, marketsClosed } =
    context;

  if (!intelligence) return null;

  const decision = buildTodaysDecision(context);
  const showDecision = shouldShowTodaysDecisionSubsection(
    decision,
    intelligence,
  );
  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
  });
  const mustWatch = intelligence.mustWatch;
  const leadTitle = mustWatch?.title?.trim() || summaryMessage;
  const supportingLine = mustWatch?.reason?.trim() || null;
  const implication = showDecision ? decision.decision : null;

  return (
    <section
      aria-labelledby="todays-market-briefing-heading"
      className={appDashboardLightCardClass}
    >
      <DashboardSectionHeader
        titleId="todays-market-briefing-heading"
        variant="compact"
        title="Today’s market briefing"
        subtitle="Lead insight and portfolio context"
        icon={<Radio className="h-5 w-5" />}
        iconToneClassName="bg-violet-50 text-violet-700 ring-1 ring-violet-100"
      />

      <div className={`${appCardPaddingClass} space-y-3 pt-0`}>
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[intelligence.portfolioStatus] ?? STATUS_STYLES.Stable}`}
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
        </div>

        {implication ? (
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500">
              Portfolio context
            </p>
            <p className={`mt-1 line-clamp-3 ${appSectionBodyClass}`}>
              {implication}
            </p>
          </div>
        ) : null}

        <Link
          href={
            decision.destinationHref || DASHBOARD_DEEP_LINKS.marketBriefing
          }
          className={appTextLinkClass}
        >
          {decision.destinationLabel || "Open Market Intelligence"}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
