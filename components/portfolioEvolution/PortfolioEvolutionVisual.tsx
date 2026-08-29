"use client";

import type { ReactNode } from "react";
import { useState } from "react";

import { PortfolioEvolutionChart } from "@/components/portfolioEvolution/PortfolioEvolutionChart";
import { PortfolioEvolutionMixCheckpoints } from "@/components/portfolioEvolution/PortfolioEvolutionMixCheckpoints";
import {
  appCardValueClass,
  appDarkCardClass,
  appIntelligenceAccentMetricClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import type { PortfolioEvolutionTimeline } from "@/lib/services/portfolioEvolution";

function BeforeNowMetrics({
  metrics,
  layout,
}: {
  metrics: PortfolioEvolutionTimeline["beforeNow"];
  layout: "stack" | "row";
}) {
  if (metrics.length === 0) return null;

  return (
    <div
      className={
        layout === "row"
          ? "grid min-w-0 content-start gap-3 sm:grid-cols-2 lg:grid-cols-3"
          : "grid min-w-0 content-start gap-3 sm:grid-cols-3 lg:grid-cols-1"
      }
      data-testid="evolution-before-now"
    >
      {metrics.map((metric) => (
        <div key={metric.id} className={appIntelligenceAccentMetricClass}>
          <p className={appSectionLabelClass}>{metric.label}</p>
          <p className={`mt-1 ${appCardValueClass} text-[1.15rem]`}>
            {metric.fromLabel} → {metric.toLabel}
          </p>
          <p className={`mt-1 ${appSectionMetaClass}`}>{metric.deltaLabel}</p>
        </div>
      ))}
    </div>
  );
}

export function PortfolioEvolutionVisual({
  timeline,
  variant,
  stance,
}: {
  timeline: PortfolioEvolutionTimeline;
  variant: "dashboard" | "full";
  stance?: ReactNode;
}) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const complete = timeline.intelligenceDepth === "complete";
  const compact = variant === "dashboard";
  const hasValueSeries = timeline.hasValueSeries;
  const beforeNow = compact
    ? timeline.beforeNow.slice(0, complete ? 3 : 1)
    : timeline.beforeNow;
  const showMix = complete && Boolean(timeline.mixCheckpoints);
  const fundingWhileBuilding =
    !hasValueSeries && timeline.fundingEvents.length > 0
      ? "Recorded funding events are available while the value line is still building."
      : null;

  return (
    <div className="min-w-0 overflow-x-clip">
      {hasValueSeries ? (
        <div
          className={`grid min-w-0 gap-5 ${
            compact
              ? "lg:grid-cols-[minmax(0,1.5fr)_minmax(16rem,0.9fr)]"
              : "lg:grid-cols-[minmax(0,1.55fr)_minmax(16rem,0.85fr)]"
          }`}
          data-testid="evolution-value-layout"
        >
          <div className="min-w-0">
            <p className={appSectionLabelClass}>Value evolution</p>
            <div className="mt-2">
              <PortfolioEvolutionChart
                timeline={timeline}
                selectedEventId={selectedEventId}
                onSelectEvent={setSelectedEventId}
                compact={compact}
                showFunding={complete}
              />
            </div>
          </div>
          <BeforeNowMetrics metrics={beforeNow} layout="stack" />
          {showMix ? (
            <div className="min-w-0 lg:col-start-1">
              <PortfolioEvolutionMixCheckpoints
                checkpoints={timeline.mixCheckpoints!}
              />
            </div>
          ) : null}
        </div>
      ) : (
        <div className="min-w-0 space-y-5" data-testid="evolution-evidence-layout">
          {fundingWhileBuilding ? (
            <p className={appSectionMetaClass}>{fundingWhileBuilding}</p>
          ) : null}
          <BeforeNowMetrics metrics={beforeNow} layout="row" />
          {showMix ? (
            <div className="min-w-0">
              <PortfolioEvolutionMixCheckpoints
                checkpoints={timeline.mixCheckpoints!}
              />
            </div>
          ) : null}
        </div>
      )}

      {stance ? <div className="mt-5 min-w-0">{stance}</div> : null}

      <div
        className={`mt-6 ${appDarkCardClass} rounded-[22px] px-5 py-5`}
        data-testid="evolution-conclusion"
      >
        <p className="text-[13px] font-semibold uppercase tracking-[0.18em] text-brand">
          Tobailey conclusion
        </p>
        <p className="mt-2 text-[1.2rem] font-semibold leading-snug sm:text-[1.35rem]">
          {timeline.conclusion.primary}
        </p>
        {timeline.conclusion.supporting.map((line) => (
          <p key={line} className="mt-1.5 text-[15px] text-white/80">
            {line}
          </p>
        ))}
        {timeline.fundingVsMarket ? (
          <p className="mt-3 text-[14px] text-white/85">
            {timeline.fundingVsMarket.copy}
          </p>
        ) : null}
      </div>

      {compact ? null : (
        <details className="mt-4">
          <summary className={`${appSectionTitleClass} cursor-pointer text-[1rem]`}>
            Why am I seeing this?
          </summary>
          <p className={`mt-2 ${appSectionMetaClass}`}>{timeline.methodologyNote}</p>
        </details>
      )}
    </div>
  );
}
