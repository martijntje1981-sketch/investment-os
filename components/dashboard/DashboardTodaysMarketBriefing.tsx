"use client";

import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { buildMarketConclusion } from "@/lib/client/dashboardConclusions";
import { formatNewsRefreshedAt } from "@/components/news/newsFormatting";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  buildIntelligenceDisplayMessage,
  buildTodaysDecision,
  type TodaysDecisionContext,
} from "@/lib/client/todaysDecision";
import { heroAndMarketShareDuplicateSentence } from "@/lib/client/smartDashboardIntelligence";

const PERSONAL_LEAD_PATTERN =
  /on track toward|investment goal|portfolio remains on track/i;

/**
 * One portfolio-relevant market conclusion — full Markets Today stays on News.
 */
export function DashboardTodaysMarketBriefing(
  context: TodaysDecisionContext & {
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

  const conclusionLead =
    supportingLine &&
    !PERSONAL_LEAD_PATTERN.test(supportingLine) &&
    supportingLine.length <= 140
      ? supportingLine
      : leadTitle;

  const card = buildMarketConclusion({
    portfolioStatus: intelligence.portfolioStatus,
    leadTitle: conclusionLead,
    quietMarket: /no standout market development/i.test(leadTitle),
  });

  if (!card) return null;

  const href =
    decision.destinationHref || DASHBOARD_DEEP_LINKS.marketBriefing;

  return (
    <section
      aria-labelledby="todays-market-briefing-heading"
      className={`min-w-0 overflow-hidden rounded-[24px] border border-violet-200/70 border-l-[3px] border-l-violet-500 bg-gradient-to-br from-violet-50/80 via-white to-[#f7f5fb] shadow-[var(--shadow-card)] md:rounded-[28px] ${appCardPaddingCompactClass}`}
      data-testid="todays-market-briefing"
    >
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-800 ring-1 ring-violet-100"
          aria-hidden
        >
          <Radio className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={`${appSectionLabelClass} text-violet-900/80`}
            id="todays-market-briefing-heading"
          >
            Markets today
          </p>
          <p className="mt-1 text-[1.05rem] font-bold tracking-[-0.02em] text-slate-950">
            {card.status}
          </p>
          <p
            className={`mt-1.5 line-clamp-2 ${appSectionMetaClass} text-[14px] leading-snug text-slate-700`}
            title={card.conclusion}
          >
            {card.conclusion}
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Updated {formatNewsRefreshedAt(intelligence.generatedAt)}
          </p>
          <Link
            href={href}
            className={`mt-3 inline-flex min-h-11 items-center gap-1.5 ${appTextLinkClass}`}
          >
            Markets today
            <ArrowUpRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
