import Link from "next/link";

import { DynamicScoreRing } from "@/components/dashboard/DynamicScoreRing";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

/**
 * Compact Daily + Weekly + Monthly pulse rings for the Dashboard hero.
 * Reuses existing score objects — no new formulas beyond periodScores.
 */
export function HeroPortfolioPulse({
  pulse,
}: {
  pulse: PortfolioPulseResult;
}) {
  return (
    <div
      className="min-w-0"
      aria-label="Portfolio pulse"
      data-testid="hero-portfolio-pulse"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-white/55">
          Pulse
        </p>
        <Link
          href={DASHBOARD_DEEP_LINKS.scorecard}
          className="text-[11px] font-semibold text-brand hover:text-brand-hover"
        >
          Scorecard
        </Link>
      </div>
      <div className="mt-2 grid grid-cols-3 items-start justify-items-center gap-0.5 sm:gap-1">
        <DynamicScoreRing
          score={pulse.daily}
          size={58}
          emphasis="primary"
          appearance="onDark"
        />
        <DynamicScoreRing
          score={pulse.weekly}
          size={54}
          emphasis="default"
          appearance="onDark"
        />
        <DynamicScoreRing
          score={pulse.monthly}
          size={54}
          emphasis="default"
          appearance="onDark"
        />
      </div>
      {pulse.combinedSummary ? (
        <p className="mt-2 line-clamp-2 text-center text-[11px] font-medium leading-snug text-white/45 sm:text-left">
          {pulse.combinedSummary}
        </p>
      ) : null}
    </div>
  );
}
