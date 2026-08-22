"use client";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { appIdentityAheadMetricClass } from "@/components/layout/semanticIdentity";
import {
  displayRateValue,
  formatChangeBp,
  type OfficialRatesRegionGroup,
  type RateDirection,
} from "@/lib/services/officialRates";

function formatObservedDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function directionGlyph(direction: RateDirection): string {
  if (direction === "up") return "↑";
  if (direction === "down") return "↓";
  if (direction === "unchanged") return "→";
  return "";
}

function directionClass(direction: RateDirection): string {
  if (direction === "up") return "text-rose-700";
  if (direction === "down") return "text-emerald-700";
  return "text-slate-600";
}

export function OfficialRatesBoard({
  groups,
  showChanges,
  isStale,
  isLoading = false,
}: {
  groups: OfficialRatesRegionGroup[];
  showChanges: boolean;
  isStale: boolean;
  isLoading?: boolean;
}) {
  if (isLoading && groups.length === 0) {
    return (
      <div className="mt-5 min-w-0" data-testid="official-rates-board">
        <p className={appSectionLabelClass}>Current rates</p>
        <p className={`mt-1.5 ${appSectionMetaClass}`}>Loading official rates…</p>
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="mt-5 min-w-0" data-testid="official-rates-board">
      <p className={appSectionLabelClass}>Current rates</p>
      {isStale ? (
        <p className={`mt-1 ${appSectionMetaClass}`}>
          Showing the last successful official observation.
        </p>
      ) : null}
      <div className="mt-3 space-y-4">
        {groups.map((group) => (
          <div key={group.id} className="min-w-0">
            <p className={appSectionMetaClass}>{group.label}</p>
            <div className="mt-2 grid min-w-0 gap-3 sm:grid-cols-2">
              {group.rates.map((rate) => {
                const display = displayRateValue(rate);
                const change = showChanges ? formatChangeBp(rate.changeBp) : null;
                const observed = formatObservedDate(rate.effectiveAt ?? rate.observedAt);
                return (
                  <article
                    key={rate.id}
                    className={appIdentityAheadMetricClass}
                    data-testid={`official-rate-${rate.id}`}
                  >
                    <p className={appSectionLabelClass}>{rate.label}</p>
                    <p className="mt-1 text-[1.35rem] font-bold tabular-nums text-q3-deep">
                      {display ?? "—"}
                    </p>
                    {showChanges && rate.direction !== "unknown" ? (
                      <p
                        className={`mt-1.5 font-semibold ${appSectionBodyClass} ${directionClass(rate.direction)}`}
                      >
                        {directionGlyph(rate.direction)}
                        {change ? ` ${change}` : ""}
                      </p>
                    ) : null}
                    <p className={`mt-1.5 ${appSectionMetaClass}`}>
                      {rate.freshnessLabel}
                      {observed
                        ? ` · ${rate.category === "policy_rate" && rate.previousValue != null ? `effective ${observed}` : observed}`
                        : ""}
                    </p>
                    <a
                      href={rate.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`mt-2 inline-flex min-h-11 items-center font-semibold text-q3-deep underline-offset-2 hover:underline ${appSectionMetaClass}`}
                    >
                      {rate.source}
                    </a>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
