import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence";
import {
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";

type PeriodIntelligenceReviewViewProps = {
  review: PeriodIntelligenceReview;
};

function SectionBlock({
  title,
  headline,
  whyItMatters,
  evidence,
  confidenceNotes,
  complete,
}: {
  title: string;
  headline: string;
  whyItMatters: string | null;
  evidence: string[];
  confidenceNotes: string[];
  complete: boolean;
}) {
  return (
    <section className="border-t border-slate-100 pt-5">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-navy">
        {title}
      </p>
      <p className="mt-2 text-[15px] font-semibold leading-snug text-slate-950">
        {headline}
      </p>
      {complete && whyItMatters ? (
        <p className="mt-2 text-[14px] leading-relaxed text-slate-700">
          <span className="font-semibold text-slate-800">Why it matters. </span>
          {whyItMatters}
        </p>
      ) : null}
      {complete && evidence.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5">
          {evidence.map((line) => (
            <li key={line} className="text-[13px] leading-relaxed text-slate-600">
              {line}
            </li>
          ))}
        </ul>
      ) : null}
      {complete && confidenceNotes[0] ? (
        <p className={`mt-3 ${appSectionMetaClass}`}>{confidenceNotes[0]}</p>
      ) : null}
    </section>
  );
}

export function PeriodIntelligenceReviewView({
  review,
}: PeriodIntelligenceReviewViewProps) {
  const complete = review.intelligenceDepth === "complete";
  const sections = [
    review.happened,
    review.changed,
    review.matters,
    review.goal,
    review.ahead,
  ].filter((row): row is NonNullable<typeof row> => row != null);

  return (
    <div>
      <header className="border-b border-slate-100 pb-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand">
          {review.kind === "monthly" ? "Your month" : "Your week"}
        </p>
        <h2
          id="companion-review-heading"
          className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.75rem]"
        >
          {review.headline ?? review.period.label}
        </h2>
        {review.summary && review.summary !== review.headline ? (
          <p className="mt-2 text-[15px] leading-relaxed text-slate-700">
            {review.summary}
          </p>
        ) : null}
        <p className={`mt-2 ${appSectionMetaClass}`}>
          <span className="sr-only">Period: </span>
          {review.period.dateRangeLabel}
        </p>
        {review.isDemo ? (
          <p className="mt-2 text-[13px] font-semibold text-amber-800">
            Demo Portfolio · example data only
          </p>
        ) : null}
      </header>

      {sections.map((section) => (
        <SectionBlock
          key={section.id}
          title={section.title}
          headline={section.headline}
          whyItMatters={section.whyItMatters}
          evidence={section.evidence}
          confidenceNotes={section.confidenceNotes}
          complete={complete}
        />
      ))}

      {complete && review.context ? (
        <section className="border-t border-slate-100 pt-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {review.context.channelLabel}
          </p>
          {review.context.href ? (
            <a
              href={review.context.href}
              className="mt-2 block text-[15px] font-semibold text-slate-950 underline-offset-2 hover:underline"
              {...(review.context.hrefExternal
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {review.context.headline}
            </a>
          ) : (
            <p className="mt-2 text-[15px] font-semibold text-slate-950">
              {review.context.headline}
            </p>
          )}
          <p className={`mt-2 ${appSectionMetaClass}`}>{review.context.detail}</p>
        </section>
      ) : null}

      {!complete && review.completeTease ? (
        <p className="mt-5 text-[13px] font-semibold text-brand-navy">
          {review.completeTease}
        </p>
      ) : null}

      {complete && review.confidence.notes[0] && !sections.some((row) => row.confidenceNotes[0]) ? (
        <p className={`mt-5 ${appSectionMetaClass}`}>{review.confidence.notes[0]}</p>
      ) : null}

      <p className={`mt-5 ${appSectionMetaClass}`}>{TRUST_NOT_ADVICE_SHORT}</p>
    </div>
  );
}
