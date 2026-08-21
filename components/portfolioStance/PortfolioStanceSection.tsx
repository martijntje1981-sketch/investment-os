"use client";

import { PortfolioStanceMeter } from "@/components/portfolioStance/PortfolioStanceMeter";
import {
  appCardClass,
  appCardPaddingClass,
  appIntelligenceAccentMetricClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import type { PortfolioStanceHistory } from "@/lib/services/portfolioStance";
import { STANCE_HISTORY_BUILDING, STANCE_POSITIONING_DISCLAIMER } from "@/lib/services/portfolioStance";

function formatDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(date);
}

export function PortfolioStanceSection({
  history,
}: {
  history: PortfolioStanceHistory;
}) {
  const stance = history.current;
  const complete = history.intelligenceDepth === "complete";

  return (
    <section
      id="portfolio-stance"
      aria-labelledby="portfolio-stance-heading"
      className={`${appCardClass} ${appCardPaddingClass} min-w-0 scroll-mt-24 overflow-x-clip`}
      data-testid="portfolio-stance"
    >
      <p className={appSectionLabelClass}>Portfolio Stance</p>
      <h2 id="portfolio-stance-heading" className={appSectionTitleClass}>
        How the portfolio is positioned
      </h2>
      <p className={`mt-2 ${appSectionMetaClass}`}>{STANCE_POSITIONING_DISCLAIMER}</p>

      {stance.status !== "ready" || stance.score == null ? (
        <p className={`mt-5 ${appSectionBodyClass}`}>{stance.conclusion}</p>
      ) : (
        <>
          <div className="mt-5 flex min-w-0 flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[2rem] font-bold tabular-nums tracking-tight text-slate-950">
                {stance.score}
                <span className="ml-1 text-base font-semibold text-slate-500">/ 100</span>
              </p>
              <p className="text-[1.15rem] font-semibold text-slate-900">
                {stance.bandLabel}
              </p>
            </div>
            {stance.confidence ? (
              <p className={`${appSectionMetaClass} capitalize`}>
                Confidence {stance.confidence}
              </p>
            ) : null}
          </div>

          <div className="mt-4">
            <PortfolioStanceMeter score={stance.score} />
          </div>

          <div className="mt-5 grid min-w-0 gap-3">
            {stance.drivers.map((driver) => (
              <div key={driver.id} className={appIntelligenceAccentMetricClass}>
                <p className={appSectionLabelClass}>
                  {driver.polarity === "offensive" ? "Offensive driver" : "Defensive driver"}
                </p>
                <p className="mt-1 text-[1.05rem] font-semibold text-slate-950">
                  {driver.label} · {driver.valueLabel}
                </p>
                <p className={`mt-1 ${appSectionMetaClass}`}>{driver.effect}</p>
              </div>
            ))}
          </div>

          <p className={`mt-5 ${appSectionBodyClass}`}>{stance.conclusion}</p>

          {complete ? (
            <>
              <h3 className={`mt-6 ${appSectionTitleClass}`}>Why this stance?</h3>
              <div className="mt-3 grid min-w-0 gap-3 sm:grid-cols-2">
                {stance.factors.map((factor) => (
                  <div key={factor.id} className="rounded-2xl border border-slate-200/80 px-4 py-3">
                    <p className={appSectionLabelClass}>{factor.label}</p>
                    <p className="mt-1 text-[1.15rem] font-bold tabular-nums text-slate-950">
                      {factor.applicable ? `+${factor.contributionPoints}` : "n/a"}
                    </p>
                    <p className={`mt-1 ${appSectionMetaClass}`}>{factor.explanation}</p>
                  </div>
                ))}
              </div>
              <p className={`mt-3 ${appSectionMetaClass}`}>
                Factor points sum to {stance.score}.
              </p>

              <h3 className={`mt-6 ${appSectionTitleClass}`}>Stance history</h3>
              {history.status === "building" ? (
                <p className={`mt-2 ${appSectionBodyClass}`}>{STANCE_HISTORY_BUILDING}</p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {history.checkpoints.map((row) => (
                    <li
                      key={`${row.date}-${row.sourceQuality}`}
                      className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-2.5"
                    >
                      <p className={appSectionMetaClass}>
                        {row.sourceQuality === "current" ? "Now" : formatDate(row.date)}
                      </p>
                      <p className="text-[15px] font-semibold tabular-nums text-slate-950">
                        {row.score} · {row.bandLabel}
                      </p>
                    </li>
                  ))}
                </ol>
              )}

              {history.change?.material ? (
                <div className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50/60 px-4 py-4">
                  <p className={appSectionLabelClass}>What changed my stance?</p>
                  <p className={`mt-2 ${appSectionBodyClass}`}>{history.change.summary}</p>
                  <p className="mt-2 text-[1.15rem] font-bold tabular-nums text-slate-950">
                    {history.change.fromScore} → {history.change.toScore}{" "}
                    <span className="text-base font-semibold text-slate-600">
                      ({history.change.pointChange > 0 ? "+" : ""}
                      {history.change.pointChange})
                    </span>
                  </p>
                  {history.change.attribution && history.change.attribution.length > 0 ? (
                    <ul className="mt-3 space-y-1.5">
                      {history.change.attribution.map((row) => (
                        <li key={row.id} className={appSectionMetaClass}>
                          {row.label} {row.deltaPoints > 0 ? "+" : ""}
                          {row.deltaPoints} stance points
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : (
            <p className={`mt-5 ${appSectionMetaClass}`}>
              Complete adds stance history, score decomposition, and goal trade-offs.
            </p>
          )}
        </>
      )}
    </section>
  );
}
