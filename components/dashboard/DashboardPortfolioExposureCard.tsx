"use client";

import { ChartPie } from "lucide-react";

import { ExpandableDashboardSection } from "@/components/dashboard/ExpandableDashboardSection";
import {
  appSectionBodyClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import {
  EXPOSURE_GROUP_BAR_CLASS,
  EXPOSURE_GROUP_DOT_CLASS,
  formatAllocationPercent,
  type PortfolioExposureAllocation,
} from "@/lib/services/classification";

const PREVIEW_CATEGORY_COUNT = 3;

/**
 * Compact Dashboard preview of portfolio exposure (whole-instrument classification).
 * Not sector look-through. Detail lives on Analysis `#portfolio-exposure`.
 */
export function DashboardPortfolioExposureCard({
  allocation,
}: {
  allocation: PortfolioExposureAllocation;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const previewGroups = allocation.groups.slice(0, PREVIEW_CATEGORY_COUNT);
  const remainingGroups = allocation.groups.slice(PREVIEW_CATEGORY_COUNT);
  const canExpand = remainingGroups.length > 0;

  return (
    <ExpandableDashboardSection
      sectionKey="portfolio-exposure"
      title="Portfolio exposure"
      titleId="portfolio-exposure-preview-heading"
      subtitle="Largest allocation groups"
      icon={<ChartPie className="h-5 w-5" />}
      iconToneClassName="bg-slate-100 text-slate-700 ring-1 ring-slate-200"
      deepLink={{
        href: DASHBOARD_DEEP_LINKS.portfolioExposure,
        label: "View allocation",
      }}
      expandable={canExpand}
      preview={
        !allocation.hasAnyValue ? (
          <p className={appSectionBodyClass}>
            {allocation.excludedHoldingCount > 0
              ? "Exposure requires available holding values."
              : "Add valued holdings to see portfolio exposure."}
          </p>
        ) : (
          <div className="space-y-4">
            <div
              className="flex h-3 min-w-0 overflow-hidden rounded-full bg-slate-100"
              role="img"
              aria-label={allocation.groups
                .map(
                  (group) =>
                    `${group.displayLabel} ${formatAllocationPercent(group.rawPercent)}`,
                )
                .join(", ")}
            >
              {allocation.groups.map((group) => (
                <div
                  key={group.groupId}
                  className={`h-full min-w-0 ${EXPOSURE_GROUP_BAR_CLASS[group.groupId]}`}
                  style={{ width: `${group.displayPercent}%` }}
                  title={`${group.displayLabel}: ${formatAllocationPercent(group.rawPercent)}`}
                />
              ))}
            </div>

            <ul className="grid min-w-0 gap-2.5">
              {previewGroups.map((group) => (
                <li
                  key={group.groupId}
                  className="flex min-w-0 items-baseline justify-between gap-3"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${EXPOSURE_GROUP_DOT_CLASS[group.groupId]}`}
                      aria-hidden
                    />
                    <span className="truncate text-sm font-medium text-slate-800">
                      {group.displayLabel}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                    {formatAllocationPercent(group.rawPercent)}
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
          </div>
        )
      }
      expandedContent={
        canExpand ? (
          <ul className="grid min-w-0 gap-2.5 sm:grid-cols-2">
            {remainingGroups.map((group) => (
              <li
                key={group.groupId}
                className="flex min-w-0 items-baseline justify-between gap-3"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${EXPOSURE_GROUP_DOT_CLASS[group.groupId]}`}
                    aria-hidden
                  />
                  <span className="truncate text-sm font-medium text-slate-800">
                    {group.displayLabel}
                  </span>
                </span>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-950">
                  {formatAllocationPercent(group.rawPercent)}
                  <span className="sr-only">
                    {`, ${formatEur(group.value)}`}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null
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
