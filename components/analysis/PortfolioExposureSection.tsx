"use client";

import { useId, useState } from "react";
import { ChartPie } from "lucide-react";

import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appTableNameClass,
  appTableValueClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  EXPOSURE_GROUP_BAR_CLASS,
  EXPOSURE_GROUP_DOT_CLASS,
  type PortfolioExposureAllocation,
  type PortfolioExposureGroupSlice,
  type PortfolioExposureHoldingContribution,
} from "@/lib/services/classification";

const HOLDINGS_PREVIEW_LIMIT = 5;

/**
 * Full Analysis breakdown of portfolio exposure (whole-instrument classification).
 * Uses the same centralized allocation result as the Dashboard card.
 */
export function PortfolioExposureSection({
  allocation,
}: {
  allocation: PortfolioExposureAllocation;
}) {
  const { formatEur } = useBaseCurrencyDisplay();

  return (
    <section
      id="portfolio-exposure"
      aria-labelledby="portfolio-exposure-heading"
      className="mt-7 scroll-mt-24 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <ChartPie className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <h2 id="portfolio-exposure-heading" className={appSectionTitleClass}>
            Portfolio exposure
          </h2>
          <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
            How your portfolio is distributed across verified exposure categories.
          </p>
        </div>
      </div>

      {!allocation.hasAnyValue ? (
        <p className={`mt-6 ${appSectionMetaClass}`}>
          {allocation.excludedHoldingCount > 0
            ? "Exposure requires available holding values."
            : "Add valued holdings to see portfolio exposure."}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          <div
            className="flex h-3 min-w-0 overflow-hidden rounded-full bg-slate-100"
            role="img"
            aria-label={allocation.groups
              .map(
                (group) =>
                  `${group.displayLabel} ${group.displayPercent} percent`,
              )
              .join(", ")}
          >
            {allocation.groups.map((group) => (
              <div
                key={group.groupId}
                className={`h-full min-w-0 ${EXPOSURE_GROUP_BAR_CLASS[group.groupId]}`}
                style={{ width: `${group.displayPercent}%` }}
                title={`${group.displayLabel}: ${group.displayPercent}%`}
              />
            ))}
          </div>

          <ul className="space-y-5">
            {allocation.groups.map((group) => (
              <ExposureCategoryRow
                key={group.groupId}
                group={group}
                formatEur={formatEur}
              />
            ))}
          </ul>

          {allocation.coverageLabel ? (
            <p className={appSectionMetaClass}>{allocation.coverageLabel}</p>
          ) : null}
        </div>
      )}
    </section>
  );
}

function ExposureCategoryRow({
  group,
  formatEur,
}: {
  group: PortfolioExposureGroupSlice;
  formatEur: (value: number) => string;
}) {
  return (
    <li className="min-w-0 border-t border-slate-100 pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${EXPOSURE_GROUP_DOT_CLASS[group.groupId]}`}
            aria-hidden
          />
          <div className="min-w-0">
            <p className={appTableNameClass}>{group.displayLabel}</p>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              {group.holdingCount}{" "}
              {group.holdingCount === 1 ? "position" : "positions"}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className={appTableValueClass}>{group.displayPercent}%</p>
          <p className={`mt-1 ${appCardValueClass}`}>{formatEur(group.value)}</p>
        </div>
      </div>

      <CategoryHoldingsList
        groupId={group.groupId}
        holdings={group.holdings}
        formatEur={formatEur}
      />
    </li>
  );
}

function CategoryHoldingsList({
  groupId,
  holdings,
  formatEur,
}: {
  groupId: string;
  holdings: PortfolioExposureHoldingContribution[];
  formatEur: (value: number) => string;
}) {
  const reactId = useId().replace(/:/g, "");
  const listId = `exposure-holdings-${groupId}-${reactId}`;
  const [expanded, setExpanded] = useState(false);
  const hasMore = holdings.length > HOLDINGS_PREVIEW_LIMIT;
  const visibleHoldings = expanded
    ? holdings
    : holdings.slice(0, HOLDINGS_PREVIEW_LIMIT);

  if (holdings.length === 0) {
    return null;
  }

  return (
    <div className="mt-3">
      <ul id={listId} className="space-y-2">
        {visibleHoldings.map((holding) => (
          <li
            key={holding.id}
            className={`flex min-w-0 items-baseline justify-between gap-3 ${appSectionBodyClass}`}
          >
            <span className="min-w-0 truncate">
              {holding.assetType === "cash" ? (
                holding.name
              ) : (
                <>
                  <span className="font-medium text-slate-800">
                    {holding.symbol}
                  </span>
                  <span aria-hidden="true"> · </span>
                  <span className="text-slate-600">{holding.name}</span>
                </>
              )}
            </span>
            <span className={`shrink-0 tabular-nums ${appSectionLabelClass}`}>
              {formatEur(holding.value)}
            </span>
          </li>
        ))}
      </ul>
      {hasMore ? (
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={listId}
          onClick={() => setExpanded((current) => !current)}
          className="mt-2 inline-flex min-h-[40px] items-center text-sm font-semibold text-slate-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          {expanded
            ? "Show less"
            : `Show all (${holdings.length - HOLDINGS_PREVIEW_LIMIT} more)`}
        </button>
      ) : null}
    </div>
  );
}
