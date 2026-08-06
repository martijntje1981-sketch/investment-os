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
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";
import { heroAndMarketShareDuplicateSentence } from "@/lib/client/smartDashboardIntelligence";

const STATUS_STYLES: Record<string, string> = {
  Stable: "border-slate-200 bg-slate-50 text-slate-700",
  Watching: "border-blue-200 bg-blue-50 text-blue-800",
  Elevated: "border-violet-200 bg-violet-50 text-violet-800",
  "High Attention": "border-violet-300 bg-violet-100 text-violet-900",
};

const PERSONAL_LEAD_PATTERN =
  /on track toward|investment goal|portfolio remains on track/i;

/**
 * Always-compact Today’s Market Briefing — one lead story.
 * Personal portfolio conclusion lives in the hero Daily Portfolio Briefing.
 */
export function DashboardTodaysMarketBriefing(
  context: TodaysDecisionContext & {
    /** Hero briefing text — used only to suppress duplicate wording. */
    heroBriefingText?: string | null;
  },
) {
  const {
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
    heroBriefingText,
  } = context;

  if (!intelligence) return null;

  const decision = buildTodaysDecision(context);
  const summaryMessage = buildIntelligenceDisplayMessage({
    intelligence,
    intelligenceFromCache,
    goalProgress,
    marketsClosed,
  });
  const mustWatch = intelligence.mustWatch;
  const rawLead = mustWatch?.title?.trim() || summaryMessage;
  // Market surface stays market-context — never reuse personal hero goal copy.
  const leadTitle = PERSONAL_LEAD_PATTERN.test(rawLead)
    ? "No standout market development in the latest briefing."
    : rawLead;
  let supportingLine = mustWatch?.reason?.trim() || null;
  if (
    supportingLine &&
    (supportingLine === leadTitle ||
      (heroBriefingText &&
        heroAndMarketShareDuplicateSentence(
          heroBriefingText,
          null,
          supportingLine,
        )))
  ) {
    supportingLine = null;
  }

  return (
    <section
      aria-labelledby="todays-market-briefing-heading"
      className={appDashboardLightCardClass}
      data-testid="todays-market-briefing"
    >
      <DashboardSectionHeader
        titleId="todays-market-briefing-heading"
        variant="compact"
        title="Today’s market briefing"
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
          {supportingLine ? (
            <p
              className={`mt-1.5 line-clamp-2 ${appSectionMetaClass}`}
              title={supportingLine}
            >
              {supportingLine}
            </p>
          ) : null}
        </div>

        <Link
          href={
            decision.destinationHref || DASHBOARD_DEEP_LINKS.marketBriefing
          }
          className={appTextLinkClass}
        >
          {decision.destinationLabel || "Open News"}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}
