"use client";

import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";

import {
  appCardPaddingCompactClass,
  appDashboardLightCardClass,
  appIntelligenceAccentIconWellClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { NewsMediaThumbnail } from "@/components/news/NewsMediaThumbnail";
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
  const storyThumb = mustWatch?.thumbnailUrl ?? null;
  const showStoryThumb =
    Boolean(storyThumb) &&
    Boolean(mustWatch?.title?.trim()) &&
    !/no standout market development/i.test(leadTitle);

  return (
    <section
      aria-labelledby="todays-market-briefing-heading"
      className={`${appDashboardLightCardClass} ${appCardPaddingCompactClass}`}
      data-testid="todays-market-briefing"
    >
      <div className="flex items-start gap-3">
        {showStoryThumb ? (
          <span className="mt-0.5 hidden shrink-0 sm:inline-flex" aria-hidden>
            <NewsMediaThumbnail
              thumbnailUrl={storyThumb}
              sourceType={mustWatch?.type === "video" ? "youtube" : "news"}
              fallbackCategory={
                mustWatch?.type === "video" ? "video" : "portfolio"
              }
              size="micro"
              showPlayIndicator={mustWatch?.type === "video"}
              alt=""
            />
          </span>
        ) : (
          <span
            className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${appIntelligenceAccentIconWellClass}`}
            aria-hidden
          >
            <Radio className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p
            className={appSectionLabelClass}
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
            {mustWatch?.sourceName ? ` · ${mustWatch.sourceName}` : ""}
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
