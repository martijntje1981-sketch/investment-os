"use client";

import {
  ATTRIBUTION_PERIOD_ORDER,
  getAttributionPeriodCapability,
  type AttributionPeriodId,
} from "@/lib/services/performanceAttribution";

/**
 * Compact period controls for Performance Attribution (capability-aware).
 */
export function AttributionPeriodSelector({
  value,
  onChange,
}: {
  value: AttributionPeriodId;
  onChange: (period: AttributionPeriodId) => void;
}) {
  return (
    <div
      className="inline-flex max-w-full flex-wrap items-center gap-0.5 rounded-full border border-white/15 bg-white/[0.06] p-0.5"
      role="tablist"
      aria-label="Attribution period"
      data-testid="attribution-period-selector"
    >
      {ATTRIBUTION_PERIOD_ORDER.map((period) => {
        const capability = getAttributionPeriodCapability(period);
        const selected = value === period;
        const unavailable = capability.status === "unavailable";

        return (
          <button
            key={period}
            type="button"
            role="tab"
            aria-selected={selected}
            title={
              unavailable
                ? (capability.reason ?? "Not available yet")
                : capability.periodSemantics
            }
            onClick={() => onChange(period)}
            className={`min-h-9 min-w-9 rounded-full px-2.5 text-[11px] font-bold tracking-wide transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 sm:min-h-10 sm:px-3 ${
              selected
                ? unavailable
                  ? "bg-white/40 text-slate-950"
                  : "bg-white/90 text-slate-950"
                : unavailable
                  ? "text-white/35 hover:bg-white/5"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
            }`}
            data-testid={`attribution-period-${period}`}
            data-status={capability.status}
          >
            {capability.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
