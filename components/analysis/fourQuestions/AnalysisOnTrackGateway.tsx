"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { buildGoalConclusion } from "@/lib/client/dashboardConclusions";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";
import { GOALS_PATH } from "@/lib/navigation/appRoutes";
import type { GoalRealityCheck } from "@/lib/services/goals/buildGoalRealityCheck";
import type { GoalProgress } from "@/lib/services/goals/goalProgressEngine";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

const GOAL_REALITY_HREF = `${GOALS_PATH}#goal-reality-check`;

/**
 * Compact Q3 gateway — does not clone the full Goals experience.
 */
export function AnalysisOnTrackGateway({
  progress,
  goal,
  realityCheck,
}: {
  progress: GoalProgress;
  goal: GoalSettings | null;
  realityCheck: GoalRealityCheck | null;
}) {
  const card = buildGoalConclusion(progress, goal);

  return (
    <article
      className={`${appCardClass} ${appCardPaddingClass}`}
      data-testid="analysis-on-track-gateway"
    >
      {!progress.hasGoal || !card ? (
        <>
          <p className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950">
            No goal is set yet
          </p>
          <p className={`mt-1.5 ${appSectionMetaClass}`}>
            Add a target on Goals to track progress and open Reality Check.
          </p>
        </>
      ) : (
        <>
          <p className="text-[1.05rem] font-semibold tracking-[-0.02em] text-slate-950">
            {card.status}
          </p>
          <p className={`mt-1.5 ${appSectionBodyClass}`}>
            {progress.portfolioValueAvailable === false
              ? "Portfolio value unavailable"
              : `${Math.round(progress.currentProgressPercent)}% of target`}{" "}
            · {progress.status}
            {card.contextLine ? ` · ${card.contextLine}` : null}
          </p>
          {realityCheck?.available ? (
            <p className={`mt-2 ${appSectionMetaClass}`}>
              Reality Check: {realityCheck.comparableAnnualPercent.toFixed(1)}%{" "}
              recent pace vs {realityCheck.expectedAnnualReturnPercent}%
              assumption
              {realityCheck.gapPp != null
                ? ` (${realityCheck.gapPp > 0 ? "+" : ""}${realityCheck.gapPp.toFixed(1)} pp)`
                : null}
              .
            </p>
          ) : null}
        </>
      )}

      <ul className="mt-4 space-y-2">
        <GatewayLink href={GOALS_PATH} label="Open full goal view" />
        <GatewayLink href={GOAL_REALITY_HREF} label="Goal Reality Check" />
        <GatewayLink
          href={DASHBOARD_DEEP_LINKS.scenarioStress}
          label="Goal sensitivity in scenarios"
        />
        <GatewayLink
          href={DASHBOARD_DEEP_LINKS.scorecardGoal}
          label="Scorecard goal & momentum"
        />
      </ul>
    </article>
  );
}

function GatewayLink({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className={`inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold ${appTextLinkClass}`}
      >
        {label}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
      </Link>
    </li>
  );
}
