"use client";

import Link from "next/link";
import { ChartPie } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { ANALYSIS_PATH } from "@/lib/navigation/newsHubRoutes";
import type {
  ExposureGroupId,
  PortfolioExposureAllocation,
} from "@/lib/services/classification";

const GROUP_BAR_CLASS: Record<ExposureGroupId, string> = {
  technology_communication: "bg-sky-600",
  healthcare: "bg-rose-500",
  consumer: "bg-orange-500",
  financials_real_estate: "bg-indigo-600",
  industrials_resources: "bg-amber-600",
  diversified_equity: "bg-slate-700",
  crypto: "bg-violet-600",
  cash: "bg-emerald-600",
  other_unclassified: "bg-slate-300",
};

const GROUP_DOT_CLASS: Record<ExposureGroupId, string> = {
  technology_communication: "bg-sky-600",
  healthcare: "bg-rose-500",
  consumer: "bg-orange-500",
  financials_real_estate: "bg-indigo-600",
  industrials_resources: "bg-amber-600",
  diversified_equity: "bg-slate-700",
  crypto: "bg-violet-600",
  cash: "bg-emerald-600",
  other_unclassified: "bg-slate-300",
};

/**
 * Compact Dashboard preview of portfolio exposure (whole-instrument classification).
 * Not sector look-through. Full analysis detail may follow later on Analysis.
 */
export function DashboardPortfolioExposureCard({
  allocation,
}: {
  allocation: PortfolioExposureAllocation;
}) {
  const { formatEur } = useBaseCurrencyDisplay();

  return (
    <section className={`min-w-0 ${appDashboardLightCardClass}`}>
      <DashboardSectionHeader
        variant="compact"
        title="Portfolio exposure"
        subtitle="Based on verified instrument classifications. Broad funds are shown as diversified."
        icon={<ChartPie className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700 ring-1 ring-slate-200"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} space-y-4 pt-0`}>
        {!allocation.hasAnyValue ? (
          <p className={appSectionBodyClass}>
            {allocation.excludedHoldingCount > 0
              ? "Exposure requires available holding values."
              : "Add valued holdings to see portfolio exposure."}
          </p>
        ) : (
          <>
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
                  className={`h-full min-w-0 ${GROUP_BAR_CLASS[group.groupId]}`}
                  style={{ width: `${group.displayPercent}%` }}
                  title={`${group.displayLabel}: ${group.displayPercent}%`}
                />
              ))}
            </div>

            <ul className="grid min-w-0 gap-2.5 sm:grid-cols-2">
              {allocation.groups.map((group) => (
                <li
                  key={group.groupId}
                  className="flex min-w-0 items-baseline justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${GROUP_DOT_CLASS[group.groupId]}`}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-slate-800">
                      {group.displayLabel}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                    {group.displayPercent}%
                    <span className="sr-only">
                      {`, ${formatEur(group.value)}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>

            {allocation.coverageLabel ? (
              <p className={appSectionMetaClass}>{allocation.coverageLabel}</p>
            ) : null}
          </>
        )}

        <Link
          href={ANALYSIS_PATH}
          className="inline-flex min-h-[40px] items-center text-sm font-semibold text-slate-700 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
        >
          Open Analysis
        </Link>
      </div>
    </section>
  );
}

export function DashboardPortfolioExposureSkeleton() {
  return (
    <div
      className={`min-w-0 ${appDashboardLightCardClass}`}
      aria-busy="true"
      aria-label="Loading portfolio exposure"
      data-skeleton="portfolio-exposure"
    >
      <div className="px-4 py-4 md:px-5 md:py-4">
        <div className="h-5 w-40 animate-pulse rounded bg-slate-100" />
        <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded bg-slate-100" />
      </div>
      <div className={`${appCardPaddingClass} space-y-3 pt-0`}>
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
