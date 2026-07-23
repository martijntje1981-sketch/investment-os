import { Activity } from "lucide-react";

import type { PortfolioHealthScore } from "@/lib/services/portfolio/portfolioHealthScore";

const SCORE_TONE: Array<{ min: number; className: string }> = [
  { min: 85, className: "text-emerald-600" },
  { min: 70, className: "text-violet-600" },
  { min: 55, className: "text-amber-600" },
  { min: 0, className: "text-rose-600" },
];

function scoreToneClass(score: number): string {
  return SCORE_TONE.find((tone) => score >= tone.min)?.className ?? "text-slate-600";
}

function indicatorIcon(level: PortfolioHealthScore["indicators"][number]["level"]): string {
  return level === "good" ? "✓" : "⚠";
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
  return "text-rose-700";
}

export function DashboardPortfolioHealthCard({
  health,
}: {
  health: PortfolioHealthScore;
}) {
  return (
    <section
      aria-labelledby="portfolio-health-heading"
      className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-sm md:rounded-[24px]"
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 py-4 md:px-5 md:py-5">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p
              id="portfolio-health-heading"
              className="text-xs font-black uppercase tracking-[0.14em] text-slate-500"
            >
              Portfolio Health
            </p>
            <p className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-950">
              <span className={scoreToneClass(health.score)}>{health.score}</span>
              <span className="text-lg font-bold text-slate-400"> / 100</span>
            </p>
          </div>
        </div>

        <ul className="grid min-w-0 flex-1 grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3 lg:max-w-xl">
          {health.indicators.map((indicator) => (
            <li
              key={indicator.id}
              className={`flex items-center gap-1.5 text-sm font-semibold ${indicatorToneClass(indicator.level)}`}
            >
              <span aria-hidden="true">{indicatorIcon(indicator.level)}</span>
              <span>{indicator.label}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 md:px-5">
        <p className="text-sm leading-relaxed text-slate-700">{health.summary}</p>
      </div>
    </section>
  );
}
