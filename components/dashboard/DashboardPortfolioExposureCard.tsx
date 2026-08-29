"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChartPie, ChevronDown } from "lucide-react";

import { ExpandableDashboardSection } from "@/components/dashboard/ExpandableDashboardSection";
import {
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import { buildAllocationIntelligence } from "@/lib/services/allocationIntelligence";
import {
  EXPOSURE_GROUP_BAR_CLASS,
  EXPOSURE_GROUP_DOT_CLASS,
  formatAllocationPercent,
  type ExposureGroupId,
  type PortfolioExposureAllocation,
} from "@/lib/services/classification";
import type { ScenarioResult } from "@/lib/services/scenarioEngine";

/**
 * Dashboard allocation intelligence — canonical exposure groups with
 * personal conclusion. Whole-instrument classification, not X-Ray.
 */
export function DashboardPortfolioExposureCard({
  allocation,
  scenarioResults = null,
}: {
  allocation: PortfolioExposureAllocation;
  scenarioResults?: ScenarioResult[] | null;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const intelligence = useMemo(
    () => buildAllocationIntelligence({ allocation, scenarioResults }),
    [allocation, scenarioResults],
  );
  const [expandedGroupId, setExpandedGroupId] = useState<ExposureGroupId | null>(
    null,
  );

  return (
    <ExpandableDashboardSection
      sectionKey="portfolio-exposure"
      title="Portfolio exposure"
      titleId="portfolio-exposure-preview-heading"
      subtitle="What your allocation means"
      icon={<ChartPie className="h-5 w-5" />}
      iconToneClassName="bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      deepLink={{
        href: DASHBOARD_DEEP_LINKS.portfolioExposure,
        label: "View allocation",
      }}
      expandable={false}
      preview={
        !allocation.hasAnyValue ? (
          <p className={appSectionBodyClass}>
            {allocation.excludedHoldingCount > 0
              ? "Exposure requires available holding values."
              : "Add valued holdings to see portfolio exposure."}
          </p>
        ) : (
          <div className="min-w-0 space-y-4 overflow-x-clip">
            <div
              className="flex h-3 min-w-0 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={intelligence.groups
                .map(
                  (group) =>
                    `${group.displayLabel} ${formatAllocationPercent(group.rawPercent)}`,
                )
                .join(", ")}
            >
              {intelligence.groups.map((group) => (
                <div
                  key={group.groupId}
                  className={`h-full min-w-0 ${EXPOSURE_GROUP_BAR_CLASS[group.groupId]}`}
                  style={{ width: `${group.displayPercent}%` }}
                  title={`${group.displayLabel}: ${formatAllocationPercent(group.rawPercent)}`}
                />
              ))}
            </div>

            <ul className="min-w-0 space-y-1" data-testid="allocation-group-rows">
              {intelligence.groups.map((group) => {
                const expanded = expandedGroupId === group.groupId;
                const holdingsId = `allocation-holdings-${group.groupId}`;

                return (
                  <li key={group.groupId} className="min-w-0">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={holdingsId}
                      onClick={() =>
                        setExpandedGroupId(expanded ? null : group.groupId)
                      }
                      className="grid min-h-11 w-full min-w-0 grid-cols-[minmax(0,7.5rem)_minmax(0,1fr)_auto] items-center gap-2 rounded-xl px-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_auto] sm:gap-3"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 shrink-0 rounded-full ${EXPOSURE_GROUP_DOT_CLASS[group.groupId]}`}
                          aria-hidden
                        />
                        <span className="truncate text-[15px] font-medium text-slate-800">
                          {group.displayLabel}
                        </span>
                        <ChevronDown
                          className={`h-3.5 w-3.5 shrink-0 text-slate-500 transition ${
                            expanded ? "rotate-180" : ""
                          }`}
                          aria-hidden
                        />
                      </span>
                      <span
                        className="h-2 min-w-0 overflow-hidden rounded-full bg-slate-100"
                        aria-hidden
                      >
                        <span
                          className={`block h-full max-w-full rounded-full ${EXPOSURE_GROUP_BAR_CLASS[group.groupId]}`}
                          style={{
                            width: `${Math.min(Math.max(group.rawPercent, 0), 100)}%`,
                            minWidth: group.rawPercent > 0 ? "2px" : 0,
                          }}
                        />
                      </span>
                      <span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-950">
                        {formatAllocationPercent(group.rawPercent)}
                        <span className="sr-only">
                          {`, ${formatEur(group.value)}`}
                        </span>
                      </span>
                    </button>

                    {expanded ? (
                      <ul
                        id={holdingsId}
                        className="mt-1 space-y-1 pb-1 pl-6 sm:pl-8"
                        data-testid={`allocation-holdings-${group.groupId}`}
                      >
                        {group.holdings.map((holding) => (
                          <li
                            key={holding.id}
                            className="flex min-h-11 min-w-0 items-center justify-between gap-3"
                          >
                            {holding.assetType === "cash" ? (
                              <span className="min-w-0 truncate text-[15px] font-medium text-slate-800">
                                {holding.name}
                              </span>
                            ) : (
                              <Link
                                href={holdingDetailPath(holding.symbol)}
                                className="min-w-0 truncate text-[15px] font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                              >
                                <span className="font-semibold">
                                  {holding.symbol}
                                </span>
                                <span className="font-medium text-slate-600">
                                  {" "}
                                  {holding.name}
                                </span>
                              </Link>
                            )}
                            <span className="shrink-0 text-[15px] font-semibold tabular-nums text-slate-950">
                              {formatAllocationPercent(holding.weightPercent)}
                            </span>
                          </li>
                        ))}
                        {group.isFixedIncome ? (
                          <li>
                            <Link
                              href={intelligence.bondsRatesHref}
                              className="inline-flex min-h-11 items-center text-[15px] font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                              data-testid="allocation-bonds-rates-link"
                            >
                              Understand rates & bonds →
                            </Link>
                          </li>
                        ) : null}
                      </ul>
                    ) : group.isFixedIncome ? (
                      <div className="pl-6 sm:pl-8">
                        <Link
                          href={intelligence.bondsRatesHref}
                          className="inline-flex min-h-11 items-center text-[15px] font-semibold text-slate-800 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2"
                          data-testid="allocation-bonds-rates-link"
                        >
                          Understand rates & bonds →
                        </Link>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>

            <div className="space-y-1.5" data-testid="allocation-intelligence">
              <p className={`${appSectionBodyClass} text-[15px] sm:text-[16px]`}>
                {intelligence.insight.sentence}
              </p>
              {intelligence.scenarioLink ? (
                <p
                  className={`${appSectionBodyClass} text-[15px] sm:text-[16px]`}
                  data-testid="allocation-scenario-link"
                >
                  {intelligence.scenarioLink.sentence}
                </p>
              ) : null}
              {intelligence.coverageSentence ? (
                <p className={appSectionMetaClass}>
                  {intelligence.coverageSentence}
                </p>
              ) : null}
            </div>
          </div>
        )
      }
    />
  );
}

export function DashboardPortfolioExposureSkeleton() {
  return (
    <div
      className="min-w-0 rounded-[28px] border border-slate-200/70 bg-white/95 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
      aria-busy="true"
      aria-label="Loading portfolio exposure"
      data-skeleton="portfolio-exposure"
    >
      <div className="px-4 py-4 md:px-5 md:py-4">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
      </div>
      <div className="space-y-3 px-4 pb-5 md:px-5">
        <div className="h-3 w-full animate-pulse rounded-full bg-slate-100" />
        <div className="space-y-2">
          <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
