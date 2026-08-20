"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ChevronDown, Scale } from "lucide-react";

import { BondsRatesRelationshipVisual } from "@/components/analysis/BondsRatesRelationshipVisual";
import { OfficialRatesBoard } from "@/components/analysis/OfficialRatesBoard";
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
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { useOfficialRates } from "@/lib/client/useOfficialRates";
import {
  BONDS_RATES_OFFICIAL_CONTEXT_LABEL,
  BONDS_RATES_SECTION_ID,
  buildBondsRatesView,
  formatAllocationPercent,
} from "@/lib/services/classification";
import type { PortfolioExposureAllocation } from "@/lib/services/classification/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

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

function DataLimitationsDisclosure({ lines }: { lines: string[] }) {
  const panelId = useId();
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  if (lines.length === 0) return null;
  return (
    <div className="mt-4 min-w-0">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white/70 px-4 text-left font-semibold text-teal-950"
      >
        <span className={appSectionBodyClass}>Data & limitations</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open ? (
        <ul
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className={`mt-2 space-y-1.5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 ${appSectionMetaClass}`}
        >
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function BondsRatesSection({
  allocation,
  holdings = [],
  ratePolicyContext = null,
  intelligenceDepth = "complete",
}: {
  allocation: PortfolioExposureAllocation;
  holdings?: StoredPortfolioHolding[];
  ratePolicyContext?: Pick<
    NewsContentItem,
    "title" | "canonicalUrl" | "sourceName" | "publishedAt"
  > | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const { snapshot: officialRates, isLoading: ratesLoading } = useOfficialRates(true);
  const view = buildBondsRatesView({
    allocation,
    holdings,
    ratePolicyContext,
    intelligenceDepth,
    officialRates,
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
            {view.hasFixedIncome
              ? "Your Fixed Income sleeve, how rates relate to it, and official policy context."
              : "How interest rates relate to bond prices — and a place for this portfolio’s bond holdings."}
          </p>
        </div>
      </div>

      <OfficialRatesBoard
        groups={view.rateGroups}
        showChanges={view.showRateChanges}
        isStale={view.ratesAreStale}
        isLoading={ratesLoading}
      />

      {view.hasFixedIncome ? (
        <>
          <div className="mt-5 grid min-w-0 gap-3 sm:grid-cols-2">
            <div className={appIdentityAheadMetricClass}>
              <p className={appSectionLabelClass}>Fixed Income</p>
              <p className={`mt-1 text-[1.35rem] ${appKpiFutureClass}`}>
                {formatAllocationPercent(view.weightPercent)}
              </p>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>
                {view.sleeveValue != null ? `${formatEur(view.sleeveValue)} · ` : ""}
                {view.allocationLine}
              </p>
            </div>
            {view.metrics.map((metric) => (
              <div key={metric.id} className={appIdentityAheadMetricClass}>
                <p className={appSectionLabelClass}>{metric.label}</p>
                <p className={`mt-1 ${appSectionBodyClass}`}>{metric.value}</p>
                {metric.detail ? (
                  <p className={`mt-1 ${appSectionMetaClass}`}>{metric.detail}</p>
                ) : null}
              </div>
            ))}
          </div>

          {view.showBreakdown && view.holdings.length > 0 ? (
            <ul className="mt-4 space-y-2" data-testid="bonds-rates-holdings">
              {view.holdings.map((row) => (
                <li
                  key={row.id}
                  className="flex min-w-0 items-baseline justify-between gap-3"
                >
                  <Link
                    href={row.href}
                    className={`min-w-0 truncate font-semibold text-teal-950 underline-offset-2 hover:underline ${appSectionBodyClass}`}
                  >
                    {row.symbol}
                    <span className="font-normal text-slate-600"> · {row.name}</span>
                  </Link>
                  <span className={`shrink-0 tabular-nums ${appTableValueClass}`}>
                    {formatAllocationPercent(row.percent)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {view.showBreakdown && view.subtypeRows.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {view.subtypeRows.map((row) => (
                <li
                  key={row.id}
                  className="flex min-w-0 items-baseline justify-between gap-3"
                >
                  <span className={`min-w-0 truncate ${appSectionMetaClass}`}>
                    {row.label}
                  </span>
                  <span className={`shrink-0 tabular-nums ${appSectionMetaClass}`}>
                    {formatAllocationPercent(row.percent)}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          {view.whatMatters ? (
            <div className="mt-5 min-w-0">
              <p className={appSectionLabelClass}>What matters</p>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>{view.whatMatters}</p>
            </div>
          ) : null}

          {view.officialContext ? (
            <div className="mt-5 min-w-0 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5">
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
              </p>
            </div>
          ) : null}

          {view.whyRatesMatter ? (
            <div className="mt-5 min-w-0">
              <p className={appSectionLabelClass}>Why this matters to your bonds</p>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>{view.whyRatesMatter}</p>
            </div>
          ) : null}

          {view.rateEffect ? (
            <div className="mt-5 min-w-0">
              <p className={appSectionLabelClass}>How rates affect this exposure</p>
              <p className={`mt-1.5 ${appSectionBodyClass}`}>{view.rateEffect}</p>
            </div>
          ) : null}
        </>
      ) : (
        <div className="mt-5 min-w-0 space-y-3">
          <p className={appSectionBodyClass}>{view.emptyHeadline}</p>
          <p className={appSectionBodyClass}>{view.emptyBody}</p>
          <Link
            href={view.addHoldingHref}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-800 px-4 font-semibold text-white"
          >
            Add Fixed Income holding
          </Link>
        </div>
      )}

      <aside
        className="mt-5 min-w-0 rounded-2xl border border-teal-200 bg-white/80 px-4 py-3.5"
        data-testid="bonds-rates-education"
      >
        <p className={appSectionLabelClass}>{view.educationHeadline}</p>
        <div className="mt-3">
          <BondsRatesRelationshipVisual />
        </div>
      </aside>

      <DataLimitationsDisclosure lines={view.limitations} />
    </section>
  );
}
