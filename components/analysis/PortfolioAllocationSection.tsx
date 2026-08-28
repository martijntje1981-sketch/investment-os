import { Layers3 } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appSectionBodyClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTableNameClass,
  appTableValueClass,
} from "@/components/layout/appSurface";
import {
  formatPortfolioPercent,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";

function allocationBarColor(index: number) {
  const palette = [
    "bg-brand-navy",
    "bg-q1-strong",
    "bg-emerald-600",
    "bg-amber-500",
    "bg-slate-600",
    "bg-q2-strong",
  ];
  return palette[index % palette.length];
}

export function PortfolioAllocationSection({
  analysis,
  formatEur,
}: {
  analysis: PortfolioAnalysisSnapshot;
  formatEur: (value: number) => string;
}) {
  const hasValuedPositions = analysis.valuedPositions.length > 0;

  return (
    <section
      id="portfolio-allocation"
      className={`scroll-mt-24 ${appCardClass} ${appCardPaddingClass}`}
      aria-labelledby="portfolio-allocation-heading"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-brand-soft p-3 text-brand-navy">
          <Layers3 className="h-5 w-5" />
        </div>
        <div>
          <h3 id="portfolio-allocation-heading" className={appSectionTitleClass}>
            Allocation
          </h3>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            Valued holdings, including cash.
          </p>
        </div>
      </div>

      {hasValuedPositions ? (
        <div className="mt-6 space-y-4">
          {analysis.valuedPositions.map((position, index) => (
            <div key={position.holding.id}>
              <div
                className={`mb-2 flex items-center justify-between gap-3 ${appSectionBodyClass}`}
              >
                <div className="min-w-0">
                  <p className={`truncate ${appTableNameClass}`}>
                    {position.holding.assetType === "cash" ? (
                      position.holding.name
                    ) : (
                      <>
                        {position.holding.symbol}
                        <span aria-hidden="true"> · </span>
                        {position.holding.name}
                      </>
                    )}
                  </p>
                  <p className={appSectionMetaClass}>
                    {formatEur(position.value)}
                  </p>
                </div>
                <p className={`shrink-0 ${appTableValueClass}`}>
                  {formatPortfolioPercent(position.weightPercent)}
                </p>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${allocationBarColor(index)}`}
                  style={{
                    width: `${Math.min(position.weightPercent, 100)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className={`mt-6 ${appSectionMetaClass}`}>
          Add current prices to your investments to calculate allocation.
        </p>
      )}
    </section>
  );
}
