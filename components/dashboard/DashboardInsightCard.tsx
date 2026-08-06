import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioInsightResult } from "@/lib/services/portfolio/healthScore";
import {
  SCORE_TONE_LABEL_CLASS,
  type ScoreBandTone,
} from "@/lib/services/portfolio/scorecard/config";

function toneClass(tone: string | null): string {
  if (
    tone === "fragile" ||
    tone === "attention" ||
    tone === "balanced" ||
    tone === "strong" ||
    tone === "resilient"
  ) {
    return SCORE_TONE_LABEL_CLASS[tone as ScoreBandTone];
  }
  return "text-slate-600";
}

export function DashboardInsightCard({
  insight,
  source,
}: {
  insight: PortfolioInsightResult | null;
  source?: "ai" | "rules" | null;
}) {
  if (!insight) {
    return null;
  }

  const badge =
    source === "ai" || insight.source === "ai" ? "AI" : "Rules-based";
  const lines = insight.scoreLines.slice(0, 4);

  return (
    <section
      aria-labelledby="todays-portfolio-insight-heading"
      className={appDashboardLightCardClass}
    >
      <DashboardSectionHeader
        titleId="todays-portfolio-insight-heading"
        title="Today’s portfolio insight"
        subtitle="Interpreting your Portfolio Scorecard"
        icon={<Sparkles className="h-5 w-5" />}
        iconToneClassName="bg-violet-50 text-violet-700 ring-1 ring-violet-100"
        bordered={false}
        trailing={
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-600">
            {badge}
          </span>
        }
      />

      <div className={`${appCardPaddingClass} space-y-3 pt-0`}>
        <div>
          <p className={appSectionLabelClass}>Lead insight</p>
          <p className="mt-1.5 text-[16px] font-bold leading-snug tracking-[-0.02em] text-slate-950 sm:text-[17px]">
            {insight.headline}
          </p>
        </div>

        <ul className="space-y-1.5">
          {lines.map((line) => (
            <li
              key={line.scoreId}
              className="flex min-w-0 items-start gap-2 text-[13px] font-medium leading-snug text-slate-700"
            >
              <span
                className={`shrink-0 font-bold tabular-nums ${toneClass(line.tone)}`}
              >
                {line.label}
                {line.value != null ? ` ${line.value}` : ""}
              </span>
              <span className="min-w-0 text-slate-600">— {line.text}</span>
            </li>
          ))}
        </ul>

        {insight.watchItem ? (
          <p className={`line-clamp-2 ${appSectionMetaClass}`}>
            Watch: {insight.watchItem}
          </p>
        ) : null}

        <p className={appSectionMetaClass}>{insight.disclaimer}</p>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href={DASHBOARD_DEEP_LINKS.portfolioHealth}
            className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
          >
            Open Portfolio Scorecard
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href={DASHBOARD_DEEP_LINKS.goalScore}
            className={`inline-flex min-h-[40px] items-center gap-1.5 ${appTextLinkClass}`}
          >
            Open Goals
          </Link>
        </div>
      </div>
    </section>
  );
}
