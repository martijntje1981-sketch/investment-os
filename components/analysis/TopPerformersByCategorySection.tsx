"use client";

import { useMemo } from "react";
import { TrendingUp } from "lucide-react";

import {
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTickerClass,
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

  return (
    <section
      className="rounded-[24px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      aria-labelledby="top-performers-by-category-heading"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-700">
          <TrendingUp className="h-4 w-4" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2
            id="top-performers-by-category-heading"
            className={appSectionTitleClass}
          >
            Top performers by category
          </h2>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Ranked by percentage change
            {model.sectionPeriodLabel
              ? ` · ${model.sectionPeriodLabel}`
              : ""}
            . Not investment advice.
          </p>
          {model.sectionPeriodDetail ? (
            <p className={`mt-1 ${appSectionMetaClass}`}>
              {model.sectionPeriodDetail}
            </p>
          ) : null}
        </div>
      </div>

      {model.groups.length === 0 ? (
        <p className={`mt-4 ${appSectionBodyClass} text-slate-600`}>
          No comparable session or 24h percentage changes are available yet for
          category ranking.
        </p>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {model.groups.map((group) => (
            <div
              key={group.groupId}
              className="min-w-0 rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-3"
            >
              <p className={appSectionLabelClass}>{group.displayLabel}</p>
              <ul className="mt-2 space-y-2">
                {group.holdings.map((holding) => {
                  const toneClass =
                    holding.changePercent > 0
                      ? "text-emerald-700"
                      : holding.changePercent < 0
                        ? "text-red-700"
                        : "text-slate-700";
                  return (
                    <li
                      key={holding.id}
                      className="flex min-w-0 items-start justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-950">
                          {holding.symbol}
                        </p>
                        <p className={`truncate ${appTickerClass}`}>
                          {holding.name}
                        </p>
                        <p className={`${appSectionMetaClass} text-[11px]`}>
                          {holding.periodLabel}
                        </p>
                      </div>
                      <p
                        className={`shrink-0 ${appCardValueClass} text-sm ${toneClass}`}
                        aria-label={`${holding.symbol} ${signedPercent(holding.changePercent)}`}
                      >
                        {signedPercent(holding.changePercent)}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
