import { Gauge } from "lucide-react";

import { ScoreRing } from "@/components/dashboard/ScoreRing";
import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import type { PortfolioScorecardResult } from "@/lib/services/portfolio/scorecard";

export function DashboardPortfolioScorecard({
  scorecard,
}: {
  scorecard: PortfolioScorecardResult;
}) {
  const { health, goal, momentum, readiness } = scorecard.scores;

  return (
    <section
      aria-labelledby="portfolio-scorecard-heading"
      className={`min-w-0 overflow-hidden ${appDashboardLightCardClass}`}
    >
      <DashboardSectionHeader
        titleId="portfolio-scorecard-heading"
        title="Portfolio scorecard"
        subtitle="Health, goal, momentum and readiness"
        icon={<Gauge className="h-5 w-5" />}
        iconToneClassName="bg-slate-100 text-slate-700"
        bordered={false}
      />

      <div className={`${appCardPaddingClass} pt-0`}>
        <div className="grid min-w-0 grid-cols-2 gap-1 sm:gap-2 lg:grid-cols-4">
          <ScoreRing score={health} showContext />
          <ScoreRing score={goal} showContext />
          <ScoreRing score={momentum} showContext />
          <ScoreRing score={readiness} showContext />
        </div>
        <p className={`mt-3 ${appSectionMetaClass}`}>
          Scores describe structure, plan tracking, recent movement and data
          readiness — not expected returns or financial advice.
        </p>
      </div>
    </section>
  );
}
