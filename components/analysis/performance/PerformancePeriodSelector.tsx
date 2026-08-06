"use client";

import type { PerformancePeriodId } from "@/lib/client/performance";
import { PERFORMANCE_PERIODS } from "@/lib/client/performance";

export function PerformancePeriodSelector({
  value,
  onChange,
}: {
  value: PerformancePeriodId;
  onChange: (period: PerformancePeriodId) => void;
}) {
  return (
    <div
      className="flex min-w-0 gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Performance period"
    >
      {PERFORMANCE_PERIODS.map((period) => {
        const selected = period.id === value;

        return (
          <button
            key={period.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(period.id)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-[12px] font-semibold transition sm:px-3.5 sm:py-2 sm:text-[13px] ${
              selected
                ? "bg-slate-950 text-white shadow-sm"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-950"
            }`}
          >
            {period.shortLabel}
          </button>
        );
      })}
    </div>
  );
}
