import { Activity } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appSectionEyebrowClass,
  appSectionTitleClass,
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
    <section
      aria-labelledby="portfolio-health-heading"
      className={appCardClass}
    >
      <div
        className={`flex min-w-0 flex-col gap-4 md:flex-row md:flex-wrap md:items-start md:justify-between md:gap-5 ${appCardPaddingClass}`}
      >
        <div className="flex min-w-0 items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p id="portfolio-health-heading" className={appSectionEyebrowClass}>
              Health
            </p>
            <h2 className={`mt-1 ${appSectionTitleClass}`}>Portfolio health</h2>
            <p className="mt-2 flex items-baseline gap-1 text-3xl font-semibold tracking-[-0.04em] text-slate-950">
              <span className={scoreToneClass(health.score)}>{health.score}</span>
              <span className="text-base font-medium text-slate-400 md:text-lg">
                {" "}
                / 100
              </span>
            </p>
          </div>
        </div>

        <ul className="grid min-w-0 w-full grid-cols-1 gap-y-2 md:flex-1 md:grid-cols-3 md:gap-x-4 md:gap-y-2 lg:max-w-xl">
          {health.indicators.map((indicator) => (
            <li
              key={indicator.id}
              className={`flex min-w-0 items-center gap-2 py-0.5 text-sm font-medium text-slate-700 md:gap-2 ${indicatorToneClass(indicator.level)}`}
            >
              <span
                aria-hidden="true"
                className={`w-3.5 shrink-0 text-center text-[11px] leading-none md:text-sm ${indicatorToneClass(indicator.level)}`}
              >
                {indicatorIcon(indicator.level)}
              </span>
              <span className="min-w-0 break-words leading-snug">{indicator.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-4 md:px-6 md:py-4">
        <p className="min-w-0 break-words text-sm leading-relaxed text-slate-600">
          {health.summary}
        </p>
      </div>
    </section>
  );
}
