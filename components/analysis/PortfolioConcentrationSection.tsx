import type { ReactNode } from "react";
import { Scale, Sparkles } from "lucide-react";

import {
  appCardClass,
  appCardPaddingClass,
  appCardValueClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  concentrationExplanation,
  concentrationLabel,
  formatPortfolioCurrency,
  formatPortfolioPercent,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";

function MetricRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div
      className={`flex items-center justify-between gap-3 ${appSectionBodyClass}`}
    >
      <span className={appSectionMetaClass}>{label}</span>
      <span className={appCardValueClass}>{value}</span>
    </div>
  );
}

export function PortfolioConcentrationSection({
  analysis,
  formatEur,
}: {
  analysis: PortfolioAnalysisSnapshot;
  formatEur: (value: number) => string;
}) {
  const hasValuedPositions = analysis.valuedPositions.length > 0;

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <article
        id="portfolio-concentration"
        className={`scroll-mt-24 ${appCardClass} ${appCardPaddingClass}`}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
            <Scale className="h-5 w-5" />
          </div>
          <div>
            <h3 className={appSectionTitleClass}>Concentration</h3>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              Largest positions among valued holdings.
            </p>
          </div>
        </div>

        {hasValuedPositions ? (
          <div className="mt-5 space-y-3">
            <p className={appCardValueClass}>
              {concentrationLabel(analysis.concentrationLevel)}
            </p>
            <p className={appSectionBodyClass}>
              {concentrationExplanation(analysis.concentrationLevel)}
            </p>
            <MetricRow
              label="Largest position"
              value={
                analysis.largestPosition
                  ? formatPortfolioPercent(
                      analysis.largestPosition.weightPercent,
                    )
                  : "—"
              }
            />
            <MetricRow
              label="Top three combined"
              value={formatPortfolioPercent(analysis.topThreeWeightPercent)}
            />
          </div>
        ) : (
          <p className={`mt-5 ${appSectionMetaClass}`}>
            Needs at least one valued position.
          </p>
        )}
      </article>

      <article className={`${appCardClass} ${appCardPaddingClass}`}>
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h3 className={appSectionTitleClass}>Diversification</h3>
            <p className={`mt-1 ${appSectionMetaClass}`}>
              Asset mix from your stored holdings.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-5">
          <div>
            <p className={appSectionLabelClass}>Asset mix</p>
            <div className="mt-3 space-y-3">
              {analysis.assetTypeBreakdown.map((item) => (
                <MetricRow
                  key={item.label}
                  label={item.label}
                  value={
                    <>
                      {formatEur(item.value)}
                      <span aria-hidden="true"> · </span>
                      {formatPortfolioPercent(item.weightPercent)}
                    </>
                  }
                />
              ))}
            </div>
          </div>

          {analysis.cashByCurrency.length > 0 && (
            <div>
              <p className={appSectionLabelClass}>Cash by currency</p>
              <div className="mt-3 space-y-3">
                {analysis.cashByCurrency.map((item) => (
                  <MetricRow
                    key={item.currency}
                    label={item.currency}
                    value={
                      <>
                        {formatPortfolioCurrency(item.value, item.currency)}
                        <span aria-hidden="true"> · </span>
                        {formatPortfolioPercent(item.weightPercent)}
                      </>
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </article>
    </section>
  );
}
