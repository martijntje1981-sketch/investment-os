import Link from "next/link";

import type { CompanionReview } from "@/lib/services/portfolio/companion";
import {
  ReviewAtAGlance,
  type ReviewGlancePulse,
} from "@/components/companion/ReviewAtAGlance";
import { WhatChangedSection } from "@/components/companion/WhatChangedSection";
import { PeriodIntelligenceReviewView } from "@/components/companion/PeriodIntelligenceReviewView";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import {
  appCardClass,
  appCardPaddingClass,
  appSectionMetaClass,
  appSolidButtonClass,
} from "@/components/layout/appSurface";
import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";

type CompanionReviewPanelProps = {
  review: CompanionReview;
  weeklyPulse?: ReviewGlancePulse;
  changeIntelligence?: ChangeIntelligenceSummary | null;
  changeFirstHistoryCopy?: string | null;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
  periodIntelligence?: PeriodIntelligenceReview | null;
};

function toneClass(tone: CompanionReview["supportingFacts"][number]["tone"]): string {
  if (tone === "positive") return "text-emerald-700";
  if (tone === "negative") return "text-rose-700";
  if (tone === "muted") return "text-slate-500";
  return "text-slate-950";
}

export function CompanionReviewPanel({
  review,
  weeklyPulse = null,
  changeIntelligence = null,
  changeFirstHistoryCopy = null,
  intelligenceDepth = "complete",
  periodIntelligence = null,
}: CompanionReviewPanelProps) {
  if (!review.ready) {
    return (
      <section
        className={`${appCardClass} ${appCardPaddingClass}`}
        aria-labelledby="companion-review-heading"
      >
        <h2
          id="companion-review-heading"
          className="text-xl font-bold tracking-[-0.03em] text-slate-950"
        >
          {review.periodLabel}
        </h2>
        <p className={`mt-2 ${appSectionMetaClass}`} role="status">
          {review.readinessReason ?? review.lead}
        </p>
        {review.isDemo ? (
          <p className={`mt-3 ${appSectionMetaClass}`}>Demo Portfolio example.</p>
        ) : null}
      </section>
    );
  }

  if (
    periodIntelligence &&
    (review.period === "weekly" || review.period === "monthly")
  ) {
    return (
      <section
        className={`${appCardClass} p-0`}
        aria-labelledby="companion-review-heading"
      >
        <PeriodIntelligenceReviewView review={periodIntelligence} />
        <nav
          className="flex flex-col gap-2 px-5 pb-6 sm:flex-row sm:flex-wrap sm:px-7"
          aria-label="Related portfolio pages"
        >
          {review.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </section>
    );
  }

  return (
    <section
      className={`${appCardClass} ${appCardPaddingClass}`}
      aria-labelledby="companion-review-heading"
    >
      <header className="border-b border-slate-100 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
          {review.periodLabel}
        </p>
        <h2
          id="companion-review-heading"
          className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.75rem]"
        >
          {review.lead}
        </h2>
        <p className={`mt-2 ${appSectionMetaClass}`}>
          <span className="sr-only">Period: </span>
          {review.dateRangeLabel}
        </p>
        {review.freshnessNote ? (
          <p className={`mt-1 ${appSectionMetaClass}`}>{review.freshnessNote}</p>
        ) : null}
        {review.isDemo ? (
          <p className={`mt-2 text-[13px] font-semibold text-amber-800`}>
            Demo Portfolio · example data only
          </p>
        ) : null}
      </header>

      <div className="mt-5">
        <ReviewAtAGlance review={review} weeklyPulse={weeklyPulse} />
      </div>

      {changeIntelligence ? (
        <WhatChangedSection
          summary={changeIntelligence}
          firstHistoryCopy={changeFirstHistoryCopy}
          intelligenceDepth={intelligenceDepth}
          visible={review.period === "weekly" || review.period === "monthly"}
        />
      ) : null}

      {review.supportingFacts.length > 0 ? (
        <dl className="mt-5 divide-y divide-slate-100">
          {review.supportingFacts.map((fact) => (
            <div
              key={fact.id}
              className="flex items-start justify-between gap-4 py-3"
            >
              <dt className="min-w-0 text-[13px] font-semibold text-slate-500">
                {fact.label}
              </dt>
              <dd className="min-w-0 text-right">
                <span
                  className={`block text-[15px] font-bold tabular-nums ${toneClass(fact.tone)}`}
                >
                  {fact.value}
                  {fact.tone === "positive" ? (
                    <span className="sr-only"> (up)</span>
                  ) : null}
                  {fact.tone === "negative" ? (
                    <span className="sr-only"> (down)</span>
                  ) : null}
                </span>
                {fact.detail ? (
                  <span className={`mt-0.5 block ${appSectionMetaClass}`}>
                    {fact.detail}
                  </span>
                ) : null}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {review.milestone ? (
        <p className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[14px] font-semibold text-slate-800">
          {review.milestone.label}
        </p>
      ) : null}

      {review.focus ? (
        <div className="mt-5 rounded-2xl border border-brand/20 bg-brand-soft/50 px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-brand-navy">
            One thing to know
          </p>
          {review.focus.href ? (
            <Link
              href={review.focus.href}
              className="mt-1 block text-[15px] font-semibold text-slate-950 underline-offset-2 hover:underline"
            >
              {review.focus.label}
            </Link>
          ) : (
            <p className="mt-1 text-[15px] font-semibold text-slate-950">
              {review.focus.label}
            </p>
          )}
        </div>
      ) : null}

      {review.closingStatement ? (
        <p className="mt-5 text-[15px] font-medium leading-relaxed text-slate-700">
          {review.closingStatement}
        </p>
      ) : null}

      <nav
        className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap"
        aria-label="Related portfolio pages"
      >
        {review.links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-[44px] items-center text-sm font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p className={`mt-5 ${appSectionMetaClass}`}>{TRUST_NOT_ADVICE_SHORT}</p>
    </section>
  );
}

export function CompanionEmptyTrialState() {
  return (
    <section className={`${appCardClass} ${appCardPaddingClass}`}>
      <h2 className="text-xl font-bold tracking-[-0.03em] text-slate-950">
        Your reviews will appear here
      </h2>
      <p className={`mt-2 ${appSectionMetaClass}`}>
        Add or import holdings first. Daily, weekly and monthly reviews use your
        portfolio history — nothing is invented.
      </p>
      <Link href="/upload" className={`mt-5 ${appSolidButtonClass}`}>
        Import my portfolio
      </Link>
    </section>
  );
}
