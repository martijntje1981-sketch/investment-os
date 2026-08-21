"use client";

import { useMemo, useState } from "react";

import { PortfolioEvolutionVisual } from "@/components/portfolioEvolution/PortfolioEvolutionVisual";
import { PortfolioStanceSection } from "@/components/portfolioStance/PortfolioStanceSection";
import {
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { useAfterFirstPaint } from "@/lib/client/useAfterFirstPaint";
import { useChangeIntelligence } from "@/lib/client/useChangeIntelligence";
import { usePortfolioPerformanceHistory } from "@/lib/client/usePortfolioPerformanceHistory";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useUserGoal } from "@/lib/client/useUserGoal";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import type { PortfolioContributionEntry } from "@/lib/services/contributions/types";
import {
  EVOLUTION_BUILDING_BODY,
  EVOLUTION_BUILDING_HEADLINE,
  EVOLUTION_TIMEFRAME_IDS,
  buildEvolutionNowState,
  buildPortfolioEvolutionTimeline,
  type EvolutionTimeframeId,
} from "@/lib/services/portfolioEvolution";
import {
  buildPortfolioStance,
  buildPortfolioStanceHistory,
} from "@/lib/services/portfolioStance";
import { formatContributionEntryDate } from "@/lib/client/contributionsFormat";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const TIMEFRAME_LABEL: Record<EvolutionTimeframeId, string> = {
  "30D": "30D",
  "90D": "90D",
  "1Y": "1Y",
  ALL: "ALL",
};

export function PortfolioEvolutionSection({
  holdings,
  entries,
  contributionBasisReliable,
  yearChartPoints,
}: {
  holdings: StoredPortfolioHolding[];
  entries: PortfolioContributionEntry[];
  contributionBasisReliable: boolean;
  yearChartPoints: Array<{
    date: string;
    portfolioValue: number;
    netContributions: number | null;
    investmentReturn: number | null;
  }> | null;
}) {
  const { userSub, portfolioReady } = useUserPortfolio();
  const { goal, hasSavedGoal } = useUserGoal();
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));
  const complete = productAccess.intelligenceDepth === "complete";
  const [timeframe, setTimeframe] = useState<EvolutionTimeframeId>(
    complete ? "90D" : "30D",
  );
  const historyEnabled = useAfterFirstPaint(
    portfolioReady && holdings.length > 0,
  );
  const allHistory = usePortfolioPerformanceHistory(
    holdings,
    "ALL",
    historyEnabled && complete && timeframe === "ALL",
  );
  const changeIntelligence = useChangeIntelligence({
    enabled: portfolioReady && Boolean(userSub) && holdings.length > 0,
    isDemo: productAccess.isDemo,
  });

  const now = useMemo(
    () =>
      buildEvolutionNowState({
        holdings,
        goal,
        hasSavedGoal,
      }),
    [goal, hasSavedGoal, holdings],
  );

  const timeline = useMemo(
    () =>
      buildPortfolioEvolutionTimeline({
        timeframe,
        chartPoints: yearChartPoints,
        allTimeChartPoints: allHistory.data?.chartPoints ?? null,
        entries,
        snapshots: changeIntelligence.snapshots,
        now,
        contributionBasisReliable,
        intelligenceDepth: productAccess.intelligenceDepth,
      }),
    [
      allHistory.data?.chartPoints,
      changeIntelligence.snapshots,
      contributionBasisReliable,
      entries,
      now,
      productAccess.intelligenceDepth,
      timeframe,
      yearChartPoints,
    ],
  );

  const stanceHistory = useMemo(
    () =>
      buildPortfolioStanceHistory({
        snapshots: changeIntelligence.snapshots,
        current: buildPortfolioStance({ holdings }),
        intelligenceDepth: productAccess.intelligenceDepth,
      }),
    [changeIntelligence.snapshots, holdings, productAccess.intelligenceDepth],
  );

  const enabledIds = EVOLUTION_TIMEFRAME_IDS.filter((id) =>
    complete ? timeline.timeframeEnabled[id] || id === "30D" : id === "30D",
  );

  return (
    <>
    <section
      id="portfolio-evolution"
      aria-labelledby="portfolio-evolution-heading"
      className={`${appCardClass} ${appCardPaddingClass} min-w-0 scroll-mt-24 overflow-x-clip`}
    >
      <p className={appSectionLabelClass}>Portfolio Evolution</p>
      <h2 id="portfolio-evolution-heading" className={appSectionTitleClass}>
        See how your portfolio changed
      </h2>

      <div className="mt-4 flex flex-wrap gap-2">
        {enabledIds.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTimeframe(id)}
            disabled={!timeline.timeframeEnabled[id] && id !== timeline.timeframe}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-4 text-[15px] font-semibold ${
              timeline.timeframe === id
                ? "bg-cyan-700 text-white"
                : "bg-slate-100 text-slate-800"
            } disabled:opacity-40`}
          >
            {TIMEFRAME_LABEL[id]}
          </button>
        ))}
      </div>

      {timeline.emptyState === "building" &&
      !timeline.hasValueSeries &&
      timeline.beforeNow.length === 0 &&
      !timeline.mixCheckpoints ? (
        <div className="mt-5 rounded-2xl bg-slate-50 px-4 py-5">
          <p className={appCardValueClass}>{EVOLUTION_BUILDING_HEADLINE}</p>
          <p className={`mt-2 ${appSectionBodyClass}`}>{EVOLUTION_BUILDING_BODY}</p>
        </div>
      ) : (
        <div className="mt-5">
          <PortfolioEvolutionVisual timeline={timeline} variant="full" />
        </div>
      )}

      {complete && timeline.fundingEvents.length > 0 ? (
        <div className="mt-6">
          <h3 className={appSectionTitleClass}>Your contributions and their effect</h3>
          <ul className="mt-3 space-y-3">
            {timeline.fundingEvents.map((event) => (
              <li
                key={event.id}
                className="rounded-2xl border border-slate-200/80 px-4 py-3"
              >
                <p className={appSectionLabelClass}>
                  {formatContributionEntryDate(event.date)} · {event.title}
                </p>
                <p className={`mt-1 ${appCardValueClass}`}>
                  {event.amount >= 0 ? "+" : "−"}
                  {Math.round(Math.abs(event.amount)).toLocaleString("en-GB")}
                </p>
                <p className={`mt-1 ${appSectionBodyClass}`}>{event.immediateEffectLabel}</p>
                {event.recordedDestinationLabel ? (
                  <p className={appSectionMetaClass}>{event.recordedDestinationLabel}</p>
                ) : null}
                {event.allocationCoincidence ? (
                  <p className={appSectionMetaClass}>
                    Coincided with {event.allocationCoincidence.groupLabel}{" "}
                    {event.allocationCoincidence.fromPercent}% →{" "}
                    {event.allocationCoincidence.toPercent}%
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
    {holdings.length > 0 ? (
      <PortfolioStanceSection history={stanceHistory} />
    ) : null}
    </>
  );
}
