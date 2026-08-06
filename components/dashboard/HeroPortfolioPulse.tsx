import Link from "next/link";

import { DynamicScoreRing } from "@/components/dashboard/DynamicScoreRing";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import type { PortfolioPulseResult } from "@/lib/services/portfolio/periodScores";

/**
 * Compact Daily + Weekly pulse rings for the Dashboard hero.
 * Reuses existing score objects — no new formulas.
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
      <div className="mt-2 grid grid-cols-2 items-start justify-items-center gap-1">
        <DynamicScoreRing
          score={pulse.daily}
          size={64}
          emphasis="primary"
          appearance="onDark"
        />
        <DynamicScoreRing
          score={pulse.weekly}
          size={58}
          emphasis="default"
          appearance="onDark"
        />
      </div>
    </div>
  );
}
