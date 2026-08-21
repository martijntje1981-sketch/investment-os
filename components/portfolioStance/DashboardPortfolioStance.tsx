"use client";

import Link from "next/link";

import { PortfolioStanceMeter } from "@/components/portfolioStance/PortfolioStanceMeter";
import {
  appSectionLabelClass,
  appSectionMetaClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import type { PortfolioStanceHistory } from "@/lib/services/portfolioStance";
import { STANCE_POSITIONING_DISCLAIMER } from "@/lib/services/portfolioStance";

const EXPLORE_HREF = `${PORTFOLIO_HISTORY_PATH}#portfolio-stance`;

export function DashboardPortfolioStance({
  history,
}: {
  history: PortfolioStanceHistory;
}) {
  const stance = history.current;
  if (stance.status !== "ready" || stance.score == null) return null;

  const driver = stance.drivers[0];
  const complete = history.intelligenceDepth === "complete";
  const delta = complete && history.change?.material ? history.change.pointChange : null;

  return (
    <div
      className="mt-5 min-w-0 overflow-x-clip rounded-2xl border border-cyan-100 bg-white/80 px-4 py-4"
      data-testid="dashboard-portfolio-stance"
    >
      <p className={appSectionLabelClass}>Portfolio Stance</p>
      <div className="mt-3 flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[1.65rem] font-bold tabular-nums tracking-tight text-slate-950">
            {stance.score}
            <span className="ml-1 text-sm font-semibold text-slate-500">/ 100</span>
          </p>
          <p className="text-[1.05rem] font-semibold text-slate-900">
            {stance.bandLabel}
          </p>
        </div>
        {delta != null ? (
          <p className="shrink-0 text-right text-[15px] font-semibold tabular-nums text-cyan-900">
            {history.prior ? "Vs last snapshot" : "Change"}
            <span className="mt-0.5 block text-[1.05rem]">
              {delta > 0 ? "+" : ""}
              {delta}
            </span>
          </p>
        ) : null}
      </div>
      <div className="mt-3">
        <PortfolioStanceMeter score={stance.score} compact />
      </div>
      {driver ? (
        <p className={`mt-3 ${appSectionMetaClass}`}>
          Driven mainly by {driver.label.toLowerCase()} {driver.valueLabel}.
        </p>
      ) : (
        <p className={`mt-3 ${appSectionMetaClass}`}>{stance.conclusion}</p>
      )}
      {stance.confidence === "limited" ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          Confidence is limited because a large share is unclassified.
        </p>
      ) : null}
      {complete ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          {STANCE_POSITIONING_DISCLAIMER}
        </p>
      ) : null}
      <Link href={EXPLORE_HREF} className={`${appTextLinkClass} mt-3 inline-flex min-h-11 items-center`}>
        Explore stance →
      </Link>
    </div>
  );
}
