"use client";

import type { CompanionPeriod } from "@/lib/services/portfolio/companion";

const TABS: Array<{ id: CompanionPeriod; label: string }> = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "Your week" },
  { id: "monthly", label: "Your month" },
];

type CompanionPeriodTabsProps = {
  value: CompanionPeriod;
  onChange: (period: CompanionPeriod) => void;
  readiness: Record<CompanionPeriod, boolean>;
};

export function CompanionPeriodTabs({
  value,
  onChange,
  readiness,
}: CompanionPeriodTabsProps) {
  return (
    <div
      role="tablist"
      aria-label="Review period"
      className="grid grid-cols-3 gap-2"
    >
      {TABS.map((tab) => {
        const selected = value === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`companion-tab-${tab.id}`}
            aria-selected={selected}
            aria-controls={`companion-panel-${tab.id}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            className={`min-h-[48px] rounded-xl px-2 py-2.5 text-[13px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
              selected
                ? "bg-brand text-brand-navy shadow-sm"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            <span className="block">{tab.label}</span>
            {!readiness[tab.id] ? (
              <span className="mt-0.5 block text-[10px] font-semibold opacity-70">
                Limited data
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
