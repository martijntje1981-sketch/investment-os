"use client";

import { useMemo, useState } from "react";
import { ScanSearch } from "lucide-react";

import {
  appAnalysisDarkHeaderCopyClass,
  appAnalysisDarkTitleClass,
  appDashboardDarkBodyMediumClass,
  appDashboardDarkMetaClass,
  appDashboardFeatureShellClass,
  appSectionBodyClass,
} from "@/components/layout/appSurface";
import {
  buildPortfolioLookThrough,
  resolveLookThroughEligibility,
} from "@/lib/services/portfolioXRay";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

/**
 * Portfolio X-Ray — look-through + hidden overlap.
 * Honest unavailable state until constituent holdings are connected.
 */
export function PortfolioXRaySection({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const [showEligibility, setShowEligibility] = useState(false);

  const lookThrough = useMemo(
    () => buildPortfolioLookThrough({ holdings }),
    [holdings],
  );

  const eligibilityRows = useMemo(
    () =>
      holdings.map((holding) => ({
        symbol: holding.symbol,
        name: holding.name || holding.symbol,
        eligibility: resolveLookThroughEligibility(holding),
      })),
    [holdings],
  );

  const primary = lookThrough.conclusions[0]?.text ?? null;

  return (
    <section
      id="portfolio-xray"
      className={`${appDashboardFeatureShellClass} mt-6 scroll-mt-24`}
      aria-labelledby="portfolio-xray-heading"
      data-testid="portfolio-xray-section"
    >
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-4 md:px-5 md:py-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-100 ring-1 ring-sky-400/25">
            <ScanSearch className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h2
              id="portfolio-xray-heading"
              className={appAnalysisDarkTitleClass}
            >
              Portfolio X-Ray
            </h2>
            <p className={`mt-1 ${appAnalysisDarkHeaderCopyClass}`}>
              What you own beneath the surface — look-through and hidden
              overlap when reliable fund holdings are available.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3.5 px-4 py-4 md:space-y-4 md:px-5 md:py-5">
        {primary ? (
          <p className="text-[15px] font-semibold leading-snug text-white">
            {primary}
          </p>
        ) : null}

        {lookThrough.conclusions.slice(1).map((row) => (
          <p key={row.id} className={appDashboardDarkMetaClass}>
            {row.text}
          </p>
        ))}

        {lookThrough.status === "provider_not_connected" ? (
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] px-3.5 py-3">
            <p className={`${appSectionBodyClass} text-sm text-white/75`}>
              Hidden company overlap and true sector/country look-through need
              verified ETF/fund constituent weights. That data is not connected
              in Tobailey yet — so we do not invent exposures from fund names.
            </p>
            <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
              {lookThrough.providerStatus.detail}
            </p>
          </div>
        ) : null}

        {lookThrough.topExposures.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
              Top hidden exposures
            </p>
            {lookThrough.topExposures.map((row) => (
              <div
                key={row.key}
                className="flex min-w-0 items-baseline justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-white">
                    {row.name}
                  </p>
                  <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                    Direct {row.directWeightPercent.toFixed(1)}% · Indirect{" "}
                    {row.indirectWeightPercent.toFixed(1)}%
                    {row.sourceHoldingCount > 1
                      ? ` · ${row.sourceHoldingCount} holdings`
                      : ""}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold tabular-nums text-white">
                  {row.combinedWeightPercent.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {lookThrough.sectors.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
              Sectors (look-through)
            </p>
            {lookThrough.sectors.slice(0, 6).map((row) => (
              <div
                key={row.sector}
                className="flex min-w-0 items-center justify-between gap-3"
              >
                <p className="truncate text-sm text-white/85">{row.sector}</p>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {row.weightPercent.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {lookThrough.countries.length > 0 ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
              Countries (look-through)
            </p>
            {lookThrough.countries.slice(0, 6).map((row) => (
              <div
                key={row.country}
                className="flex min-w-0 items-center justify-between gap-3"
              >
                <p className="truncate text-sm text-white/85">{row.country}</p>
                <p className="shrink-0 text-sm font-semibold tabular-nums text-white">
                  {row.weightPercent.toFixed(1)}%
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/10 px-3.5 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-white/45">
            Coverage
          </p>
          <p className={`mt-1.5 ${appDashboardDarkBodyMediumClass}`}>
            Eligible for look-through:{" "}
            {lookThrough.coverage.lookThroughEligibleValuePercent != null
              ? `${Math.round(lookThrough.coverage.lookThroughEligibleValuePercent)}%`
              : "—"}{" "}
            of portfolio value
          </p>
          <p className={`mt-1 ${appDashboardDarkMetaClass}`}>
            Economic sleeves (Bitcoin ETP / crypto / commodity-style):{" "}
            {lookThrough.coverage.economicSleeveHoldingCount} · Excluded (cash
            etc.): {lookThrough.coverage.excludedHoldingCount}
          </p>
          <p className={`mt-2 ${appDashboardDarkMetaClass}`}>
            {lookThrough.instrumentViewNote}
          </p>
        </div>

        <button
          type="button"
          className="min-h-11 text-[15px] font-semibold text-brand hover:text-brand-hover"
          onClick={() => setShowEligibility((value) => !value)}
          data-testid="xray-toggle-eligibility"
        >
          {showEligibility ? "Hide holding eligibility" : "Show holding eligibility"}
        </button>

        {showEligibility ? (
          <ul className="space-y-2">
            {eligibilityRows.map((row) => (
              <li
                key={row.symbol}
                className="min-w-0 rounded-xl border border-white/10 px-3 py-2.5"
              >
                <p className="truncate text-sm font-semibold text-white">
                  {row.symbol}
                  <span className={`ml-2 font-medium ${appDashboardDarkMetaClass}`}>
                    {row.eligibility.kind.replaceAll("_", " ")}
                  </span>
                </p>
                <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                  {row.eligibility.reason}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
