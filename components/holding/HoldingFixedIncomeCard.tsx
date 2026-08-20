"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";

import { BondsRatesRelationshipVisual } from "@/components/analysis/BondsRatesRelationshipVisual";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  appIdentityAheadCardClass,
  appIdentityAheadMetricClass,
  appKpiFutureClass,
  appKpiNegativeClass,
  appKpiPositiveClass,
} from "@/components/layout/semanticIdentity";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  BONDS_RATES_OFFICIAL_CONTEXT_LABEL,
  buildFixedIncomeHoldingProfile,
  classifyHoldingExposure,
  formatAllocationPercent,
} from "@/lib/services/classification";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { HoldingPageNewsItem } from "@/lib/services/holdingIntelligence";
import { officialMacroWhyRelevant, selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function signedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function HoldingFixedIncomeCard({
  holding,
  relatedNews = [],
  intelligenceDepth = "complete",
  weightPercent = null,
  marketValue = null,
  changePercent = null,
  contributionPp = null,
}: {
  holding: StoredPortfolioHolding;
  relatedNews?: HoldingPageNewsItem[];
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
  weightPercent?: number | null;
  marketValue?: number | null;
  changePercent?: number | null;
  contributionPp?: number | null;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const panelId = useId();
  const buttonId = useId();
  const [open, setOpen] = useState(false);
  const classification = classifyHoldingExposure(holding).fixedIncome ?? null;
  const profile = buildFixedIncomeHoldingProfile(classification, holding);
  if (!profile || !classification) return null;

  const isComplete = intelligenceDepth === "complete";
  const official = selectOfficialRatePolicyContext(
    relatedNews.map((row) => row.item),
  );
  const currency = holding.quoteCurrency?.trim().toUpperCase() || null;

  const metrics: Array<{ id: string; label: string; value: string; tone?: "pos" | "neg" }> =
    [];
  if (marketValue != null && Number.isFinite(marketValue)) {
    metrics.push({ id: "value", label: "Position value", value: formatEur(marketValue) });
  }
  if (weightPercent != null && Number.isFinite(weightPercent)) {
    metrics.push({
      id: "weight",
      label: "Portfolio weight",
      value: formatAllocationPercent(weightPercent),
    });
  }
  if (changePercent != null && Number.isFinite(changePercent)) {
    metrics.push({
      id: "move",
      label: "Day move",
      value: signedPercent(changePercent),
      tone: changePercent > 0 ? "pos" : changePercent < 0 ? "neg" : undefined,
    });
  }
  if (isComplete && contributionPp != null && Number.isFinite(contributionPp)) {
    metrics.push({
      id: "impact",
      label: "Portfolio impact",
      value: `${contributionPp > 0 ? "+" : ""}${contributionPp.toFixed(2)} pp`,
    });
  }
  if (profile.typeLabel) {
    metrics.push({ id: "type", label: "Bond type", value: profile.typeLabel });
  }
  if (isComplete && profile.durationLabel) {
    metrics.push({ id: "duration", label: "Duration", value: profile.durationLabel });
  }
  if (isComplete && profile.creditLabel) {
    metrics.push({ id: "credit", label: "Credit profile", value: profile.creditLabel });
  }
  if (isComplete && currency) {
    metrics.push({ id: "currency", label: "Currency", value: currency });
  }
  if (isComplete && profile.hedgeLabel) {
    metrics.push({ id: "hedge", label: "Share class", value: profile.hedgeLabel });
  }

  const limitations = [
    profile.durationUnknown
      ? "Duration is unknown for this holding, so no numeric rate shock is shown."
      : "Duration is a bucket, not a modeled sensitivity.",
    official
      ? "Official headlines are macro context, not proof that this holding moved."
      : null,
  ].filter((row): row is string => Boolean(row));

  return (
    <section
      className={`mt-6 min-w-0 p-5 sm:p-6 ${appIdentityAheadCardClass}`}
      aria-labelledby="holding-fixed-income-heading"
      data-testid="holding-fixed-income"
      data-intelligence-depth={intelligenceDepth}
    >
      <p className={appSectionLabelClass}>Fixed Income intelligence</p>
      <h2 id="holding-fixed-income-heading" className={`mt-1 ${appSectionTitleClass}`}>
        Bond holding
      </h2>

      <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <div key={metric.id} className={appIdentityAheadMetricClass}>
            <dt className={appSectionLabelClass}>{metric.label}</dt>
            <dd
              className={`mt-1 ${appSectionBodyClass} ${
                metric.tone === "pos"
                  ? appKpiPositiveClass
                  : metric.tone === "neg"
                    ? appKpiNegativeClass
                    : metric.id === "weight" || metric.id === "value"
                      ? appKpiFutureClass
                      : ""
              }`}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      <aside
        className="mt-4 rounded-2xl border border-teal-200 bg-white/80 px-4 py-3.5"
        data-testid="holding-fixed-income-education"
      >
        <p className={appSectionLabelClass}>How rates relate</p>
        <div className="mt-3">
          <BondsRatesRelationshipVisual showDurationGuide={Boolean(profile.durationLabel)} />
        </div>
      </aside>

      {official ? (
        <div className="mt-4 min-w-0 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3.5">
          <p className={appSectionLabelClass}>
            {BONDS_RATES_OFFICIAL_CONTEXT_LABEL}
          </p>
          <a
            href={official.canonicalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-2 inline-flex min-h-11 items-center font-semibold text-teal-900 underline-offset-2 hover:underline ${appSectionBodyClass}`}
          >
            {official.title}
          </a>
          <p className={`mt-1 ${appSectionMetaClass}`}>
            {official.sourceName}. {officialMacroWhyRelevant("fixed_income")}
          </p>
        </div>
      ) : null}

      {limitations.length > 0 ? (
        <div className="mt-4 min-w-0">
          <button
            id={buttonId}
            type="button"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
            className="inline-flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-teal-200 bg-white/70 px-4 font-semibold text-teal-950"
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
              className={`mt-2 space-y-1.5 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 ${appSectionMetaClass}`}
            >
              {limitations.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
