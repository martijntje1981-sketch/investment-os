import { Activity } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
} from "@/components/layout/appSurface";
import type { PortfolioHealthScore } from "@/lib/services/portfolio/portfolioHealthScore";

const SCORE_TONE: Array<{ min: number; className: string }> = [
  { min: 85, className: "text-emerald-600" },
  { min: 70, className: "text-slate-900" },
  { min: 55, className: "text-amber-600" },
  { min: 0, className: "text-amber-700" },
];

function scoreToneClass(score: number): string {
  return SCORE_TONE.find((tone) => score >= tone.min)?.className ?? "text-slate-600";
}

function indicatorIcon(level: PortfolioHealthScore["indicators"][number]["level"]): string {
  return level === "good" ? "✓" : "•";
}

function indicatorToneClass(
  level: PortfolioHealthScore["indicators"][number]["level"],
): string {
  if (level === "good") {
    return "text-emerald-700";
  }
  if (level === "moderate") {
    return "text-amber-700";
  }
  return "text-amber-800";
}

export function DashboardPortfolioHealthCard({
  health,
}: {
  health: PortfolioHealthScore;
}) {
  return (
    <section aria-labelledby="portfolio-health-heading" className={appCardClass}>
      <DashboardSectionHeader
        titleId="portfolio-health-heading"
        title="Portfolio health"
        subtitle="Overall balance and risk signals"
        icon={<Activity className="h-5 w-5" />}
        iconToneClassName="bg-emerald-50 text-emerald-700"
        bordered={false}
      />

      <div
        className={`flex min-w-0 flex-col gap-5 border-b border-slate-100 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-6 ${appCardPaddingClass}`}
      >
        <p className="flex items-baseline gap-1 text-3xl font-black tracking-[-0.04em] text-slate-950 md:text-4xl">
          <span className={scoreToneClass(health.score)}>{health.score}</span>
          <span className="text-base font-semibold text-slate-400 md:text-lg">
            / 100
          </span>
        </p>

        <ul className="grid min-w-0 w-full grid-cols-1 gap-y-2.5 md:flex-1 md:grid-cols-3 md:gap-x-4 md:gap-y-2.5 lg:max-w-xl">
          {health.indicators.map((indicator) => (
            <li
              key={indicator.id}
              className={`flex min-w-0 items-center gap-2 py-0.5 text-sm font-medium leading-relaxed text-slate-700 md:gap-2 ${indicatorToneClass(indicator.level)}`}
            >
              <span
                aria-hidden="true"
                className={`w-3.5 shrink-0 text-center text-[11px] leading-none md:text-sm ${indicatorToneClass(indicator.level)}`}
              >
                {indicatorIcon(indicator.level)}
              </span>
              <span className="min-w-0 break-words">{indicator.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-5 md:px-6 md:py-5">
        <p className={`min-w-0 break-words ${appSectionBodyClass} text-slate-600`}>
          {health.summary}
        </p>
      </div>
    </section>
  );
}
