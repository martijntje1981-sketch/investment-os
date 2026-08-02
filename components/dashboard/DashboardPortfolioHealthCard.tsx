import Link from "next/link";
import { Activity, ArrowRight } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioHealthScoreResult } from "@/lib/services/portfolio/healthScore";

function ScoreRing({ score, label }: { score: number; label: string }) {
  const size = 76;
  const stroke = 7;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill = Math.min(1, Math.max(0, score / 100));
  const offset = circumference * (1 - fill);

  return (
    <div className="relative shrink-0">
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        role="img"
        aria-label={`Portfolio Health Score ${score} out of 100, ${label}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(226 232 240)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgb(14 165 233)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-lg font-bold tabular-nums tracking-[-0.03em] text-slate-950">
          {score}
        </span>
        <span className="text-[10px] font-semibold text-slate-500">/100</span>
      </div>
    </div>
  );
}

/**
 * Dashboard Portfolio Health preview — real structural score (not volatility intensity).
 */
export function DashboardPortfolioHealthCard({
  scoreResult,
}: {
  scoreResult: PortfolioHealthScoreResult;
}) {
  if (!scoreResult.hasValuedPortfolio) {
    return (
      <section
        aria-labelledby="portfolio-health-heading"
        className={appDashboardLightCardClass}
      >
        <DashboardSectionHeader
          titleId="portfolio-health-heading"
          title="Portfolio Health"
          subtitle="Structural score and alignment"
          icon={<Activity className="h-5 w-5" />}
          iconToneClassName="bg-slate-100 text-slate-700"
          bordered={false}
        />
        <div className={appCardPaddingClass}>
          <p className={`${appSectionBodyClass} text-slate-600`}>
            Add valued holdings to unlock a Portfolio Health Score.
          </p>
          <Link
            href={DASHBOARD_DEEP_LINKS.portfolioHealth}
            className={`mt-4 ${appTextLinkClass}`}
          >
            View full analysis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    );
  }

  const strength = scoreResult.strengths[0];
  const attention = scoreResult.attentionPoints[0];

  return (
    <section
      aria-labelledby="portfolio-health-heading"
      className={`min-w-0 overflow-hidden ${appDashboardLightCardClass}`}
    >
      <DashboardSectionHeader
        titleId="portfolio-health-heading"
        title="Portfolio Health"
        subtitle="Structural score and alignment"
        icon={<Activity className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} space-y-3.5 pt-0`}>
        <div className="flex min-w-0 items-center gap-3.5">
          <ScoreRing score={scoreResult.score} label={scoreResult.band.label} />
          <div className="min-w-0 flex-1">
            <p className={appSectionLabelClass}>Portfolio Health Score</p>
            <p className="mt-1 text-[15px] font-bold tracking-[-0.02em] text-slate-950">
              {scoreResult.band.label}
            </p>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              {scoreResult.confidence.label} ·{" "}
              {scoreResult.confidence.classifiedCoveragePercent}% classified
            </p>
          </div>
        </div>

        <p className="sr-only">
          Portfolio Health Score {scoreResult.score} out of 100. Band:{" "}
          {scoreResult.band.label}. Confidence: {scoreResult.confidence.label}.
        </p>

        <div className="grid min-w-0 gap-2.5 sm:grid-cols-2">
          {strength ? (
            <div className="min-w-0 rounded-2xl bg-slate-50/90 px-3 py-2.5">
              <p className={appSectionLabelClass}>Strength</p>
              <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-slate-900">
                {strength.title}
              </p>
            </div>
          ) : null}
          {attention ? (
            <div className="min-w-0 rounded-2xl bg-slate-50/90 px-3 py-2.5">
              <p className={appSectionLabelClass}>Attention</p>
              <p className="mt-1 line-clamp-2 text-[13px] font-semibold text-slate-900">
                {attention.title}
              </p>
            </div>
          ) : null}
        </div>

        <p className={`line-clamp-2 ${appSectionMetaClass}`}>
          {scoreResult.disclaimer}
        </p>

        <Link
          href={DASHBOARD_DEEP_LINKS.portfolioHealth}
          className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
        >
          View full analysis
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
