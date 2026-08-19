"use client";

import { Scale } from "lucide-react";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appTableValueClass,
} from "@/components/layout/appSurface";
import {
  appIdentityAheadCardClass,
  appIdentityAheadIconClass,
  appIdentityAheadMetricClass,
  appKpiFutureClass,
} from "@/components/layout/semanticIdentity";
import {
  BONDS_RATES_OFFICIAL_CONTEXT_LABEL,
  BONDS_RATES_SECTION_ID,
  buildBondsRatesView,
} from "@/lib/services/classification";
import type { PortfolioExposureAllocation } from "@/lib/services/classification/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { NewsContentItem } from "@/lib/types/newsContent";

function formatAsOf(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function BondsRatesSection({
  allocation,
  ratePolicyContext = null,
  intelligenceDepth = "complete",
}: {
  allocation: PortfolioExposureAllocation;
  ratePolicyContext?: Pick<
    NewsContentItem,
    "title" | "canonicalUrl" | "sourceName" | "publishedAt"
  > | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
}) {
  const view = buildBondsRatesView({
    allocation,
    ratePolicyContext,
    intelligenceDepth,
  });
  const asOf = formatAsOf(view.officialContext?.publishedAt ?? null);

  return (
    <section
      id={BONDS_RATES_SECTION_ID}
      aria-labelledby="bonds-rates-heading"
      className={`mt-7 scroll-mt-24 min-w-0 ${appIdentityAheadCardClass} p-5 sm:p-7`}
      data-testid="bonds-rates-section"
      data-intelligence-depth={intelligenceDepth}
      data-has-fixed-income={view.hasFixedIncome ? "true" : "false"}
    >
      <div className="flex min-w-0 items-start gap-3">
        <div className={appIdentityAheadIconClass}>
          <Scale className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id="bonds-rates-heading" className={appSectionTitleClass}>
            Bonds & Rates
          </h2>
          <p className={`mt-1.5 ${appSectionSubtitleClass}`}>
            How much Fixed Income you own, what type it is where known, and how
            rates relate to bond prices.
          </p>
        </div>
      </div>

      {view.hasFixedIncome ? (
        <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
          <div className={appIdentityAheadMetricClass}>
            <p className={appSectionLabelClass}>Fixed Income allocation</p>
            <p className={`mt-1 text-[1.35rem] ${appKpiFutureClass}`}>
              {view.weightPercent != null
                ? `${Math.round(view.weightPercent)}%`
                : "—"}
            </p>
            <p className={`mt-1.5 ${appSectionBodyClass}`}>{view.allocationLine}</p>
          </div>
          {view.showBreakdown ? (
            <div className={appIdentityAheadMetricClass}>
              <p className={appSectionLabelClass}>What Tobailey can model</p>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>
                {view.durationHonesty}
              </p>
              {view.creditHonesty ? (
                <p className={`mt-1.5 ${appSectionMetaClass}`}>
                  {view.creditHonesty}
                </p>
              ) : null}
            </div>
          ) : (
            <div className={appIdentityAheadMetricClass}>
              <p className={appSectionLabelClass}>What Tobailey can model</p>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>
                Bond prices generally move inversely with market yields. Precise
                rate sensitivity is not calculated here.
              </p>
            </div>
          )}
        </div>
      ) : (
        <p className={`mt-5 ${appSectionBodyClass}`}>{view.allocationLine}</p>
      )}

      {view.showBreakdown && view.subtypeRows.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {view.subtypeRows.map((row) => (
            <li
              key={row.id}
              className="flex min-w-0 items-baseline justify-between gap-3"
            >
              <span className={`min-w-0 truncate ${appSectionBodyClass}`}>
                {row.label}
              </span>
              <span className={`shrink-0 tabular-nums ${appTableValueClass}`}>
                {row.percent}%
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      <aside
        className="mt-5 min-w-0 rounded-2xl border border-teal-200 bg-white/80 px-4 py-3.5"
        data-testid="bonds-rates-education"
      >
        <p className={appSectionLabelClass}>{view.educationHeadline}</p>
        <p className={`mt-1.5 ${appSectionBodyClass}`}>{view.educationBody}</p>
        {view.durationNote ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>{view.durationNote}</p>
        ) : null}
      </aside>

      {view.officialContext ? (
        <div className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5">
          <p className={appSectionLabelClass}>
            {BONDS_RATES_OFFICIAL_CONTEXT_LABEL}
          </p>
          <a
            href={view.officialContext.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 inline-flex min-h-11 min-w-0 items-center font-semibold text-teal-900 underline-offset-2 hover:underline ${appSectionBodyClass}`}
          >
            {view.officialContext.title}
          </a>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            {view.officialContext.sourceName}
            {asOf ? ` · as of ${asOf}` : ""}
            . Macro context, not a live policy rate and not proof of a holding
            move.
          </p>
        </div>
      ) : null}

      <ul className={`mt-4 space-y-1.5 ${appSectionMetaClass}`}>
        {view.limitations.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </section>
  );
}
