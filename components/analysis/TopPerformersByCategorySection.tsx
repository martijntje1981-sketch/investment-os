"use client";

import { useMemo } from "react";

import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { buildTopPerformersByCategory } from "@/lib/client/topPerformersByCategory";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function signedPercent(value: number): string {
  const formatted = formatPortfolioPercent(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}

export function TopPerformersByCategorySection({
  holdings,
}: {
  holdings: StoredPortfolioHolding[];
}) {
  const model = useMemo(
    () => buildTopPerformersByCategory(holdings),
    [holdings],
  );

  const singleCategory = model.groups.length === 1;

  return (
    <section
      className="rounded-[24px] border border-slate-200 bg-white p-3.5 shadow-sm sm:p-4"
      aria-labelledby="top-performers-by-category-heading"
    >
      <div className="min-w-0">
        <h2
          id="top-performers-by-category-heading"
          className={appSectionTitleClass}
        >
          Top performers by category
        </h2>
        <p className={`mt-1 ${appSectionMetaClass}`}>
          {model.sectionBasisCopy}
          {model.sectionPeriodDetail ? ` · ${model.sectionPeriodDetail}` : ""}
          . Not investment advice.
        </p>
      </div>

      {model.overallWinner ? (
        <div className="mt-3 flex min-w-0 items-center justify-between gap-3 rounded-lg border border-emerald-200/70 bg-emerald-50/60 px-3 py-2">
          <div className="min-w-0">
            <p className={`${appSectionLabelClass} text-emerald-800`}>
              Portfolio leader
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-950">
              {model.overallWinner.symbol}
              <span className="font-medium text-slate-500">
                {" "}
                · {model.overallWinner.name}
              </span>
            </p>
            <p className={`${appSectionMetaClass} mt-0.5`}>
              {model.overallWinner.displayLabel}
            </p>
          </div>
          <p
            className={`shrink-0 ${appCardValueClass} text-sm text-emerald-700`}
            aria-label={`Portfolio leader ${signedPercent(model.overallWinner.changePercent)}`}
          >
            {signedPercent(model.overallWinner.changePercent)}
          </p>
        </div>
      ) : null}

      {model.groups.length === 0 ? (
        <p className={`mt-3 ${appSectionBodyClass} text-slate-600`}>
          No comparable session or 24h percentage changes are available yet for
          category ranking.
        </p>
      ) : (
        <div
          className={
            singleCategory
              ? "mt-3 max-w-md"
              : "mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          }
        >
          {model.groups.map((group) => {
            const comparison =
              group.relationToPortfolioLeader.kind === "portfolio_leader"
                ? null
                : group.relationToPortfolioLeader.comparisonLabel;

            return (
              <div
                key={group.groupId}
                className="min-w-0 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2"
              >
                <p className={appSectionLabelClass}>
                  {group.displayLabel}
                </p>
                {comparison ? (
                  <p className={`mt-0.5 ${appSectionMetaClass}`}>
                    {comparison}
                  </p>
                ) : null}
                <ol className="mt-1.5 space-y-1">
                  {group.holdings.map((holding, index) => {
                    const toneClass =
                      holding.changePercent > 0
                        ? "text-emerald-700"
                        : holding.changePercent < 0
                          ? "text-red-700"
                          : "text-slate-700";
                    return (
                      <li
                        key={holding.id}
                        className="flex min-w-0 items-center justify-between gap-2"
                      >
                        <div className="flex min-w-0 items-center gap-1.5">
                          <span
                            className={`w-4 shrink-0 text-[11px] font-semibold tabular-nums ${
                              index === 0 ? "text-slate-800" : "text-slate-400"
                            }`}
                            aria-hidden
                          >
                            {index + 1}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-slate-950">
                              {holding.symbol}
                            </p>
                            <p className={`truncate ${appSectionMetaClass}`}>
                              {holding.name}
                            </p>
                          </div>
                        </div>
                        <p
                          className={`shrink-0 ${appCardValueClass} text-sm ${toneClass}`}
                          aria-label={`Rank ${index + 1}: ${holding.symbol} ${signedPercent(holding.changePercent)}`}
                        >
                          {signedPercent(holding.changePercent)}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
