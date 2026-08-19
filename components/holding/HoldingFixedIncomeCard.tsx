"use client";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  appIdentityAheadCardClass,
  appIdentityAheadMetricClass,
} from "@/components/layout/semanticIdentity";
import {
  BONDS_RATES_OFFICIAL_CONTEXT_LABEL,
  BONDS_RATES_OFFICIAL_NOT_CAUSE,
  buildFixedIncomeHoldingProfile,
  buildFixedIncomeRateEducation,
  classifyHoldingExposure,
} from "@/lib/services/classification";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import type { HoldingPageNewsItem } from "@/lib/services/holdingIntelligence";
import { selectOfficialRatePolicyContext } from "@/lib/services/news/officialMacro";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export function HoldingFixedIncomeCard({
  holding,
  relatedNews = [],
  intelligenceDepth = "complete",
  weightPercent = null,
}: {
  holding: StoredPortfolioHolding;
  relatedNews?: HoldingPageNewsItem[];
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
  weightPercent?: number | null;
}) {
  const classification = classifyHoldingExposure(holding).fixedIncome ?? null;
  const profile = buildFixedIncomeHoldingProfile(classification);
  if (!profile || !classification) return null;

  const isComplete = intelligenceDepth === "complete";
  const education = buildFixedIncomeRateEducation({
    durationKnownSharePercent: profile.durationUnknown ? 0 : 100,
  });
  const official = selectOfficialRatePolicyContext(
    relatedNews.map((row) => row.item),
  );

  return (
    <section
      className={`mt-6 min-w-0 p-5 sm:p-6 ${appIdentityAheadCardClass}`}
      aria-labelledby="holding-fixed-income-heading"
      data-testid="holding-fixed-income"
      data-intelligence-depth={intelligenceDepth}
    >
      <p className={appSectionLabelClass}>Fixed Income</p>
      <h2 id="holding-fixed-income-heading" className={`mt-1 ${appSectionTitleClass}`}>
        Bond holding profile
      </h2>
      <p className={`mt-1.5 ${appSectionMetaClass}`}>
        Classification uses existing holding metadata. Tobailey does not invent
        yields, coupons, or duration numbers.
      </p>

      <dl className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
        {weightPercent != null && Number.isFinite(weightPercent) ? (
          <div className={appIdentityAheadMetricClass}>
            <dt className={appSectionLabelClass}>Portfolio weight</dt>
            <dd className={`mt-1 ${appSectionBodyClass}`}>
              {weightPercent.toFixed(1)}%
            </dd>
          </div>
        ) : null}
        <div className={appIdentityAheadMetricClass}>
          <dt className={appSectionLabelClass}>Bond type</dt>
          <dd className={`mt-1 ${appSectionBodyClass}`}>{profile.typeLabel}</dd>
        </div>
        {isComplete ? (
          <>
            <div className={appIdentityAheadMetricClass}>
              <dt className={appSectionLabelClass}>Duration</dt>
              <dd className={`mt-1 ${appSectionBodyClass}`}>
                {profile.durationLabel}
              </dd>
            </div>
            <div className={appIdentityAheadMetricClass}>
              <dt className={appSectionLabelClass}>Credit quality</dt>
              <dd className={`mt-1 ${appSectionBodyClass}`}>
                {profile.creditLabel}
              </dd>
            </div>
          </>
        ) : null}
      </dl>

      <aside
        className="mt-4 rounded-2xl border border-teal-200 bg-white/80 px-4 py-3.5"
        data-testid="holding-fixed-income-education"
      >
        <p className={appSectionLabelClass}>{education.headline}</p>
        <p className={`mt-1.5 ${appSectionBodyClass}`}>{education.body}</p>
        {education.durationNote ? (
          <p className={`mt-2 ${appSectionMetaClass}`}>{education.durationNote}</p>
        ) : null}
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
            {official.sourceName}. {BONDS_RATES_OFFICIAL_NOT_CAUSE}
          </p>
        </div>
      ) : null}

      <p className={`mt-4 ${appSectionMetaClass}`}>
        Move and portfolio impact stay in the holding intelligence card above.
        {profile.durationUnknown
          ? " Duration is unknown, so no numeric rate shock is shown."
          : " Duration is classified only as a bucket, not as a modeled sensitivity."}
      </p>
    </section>
  );
}
