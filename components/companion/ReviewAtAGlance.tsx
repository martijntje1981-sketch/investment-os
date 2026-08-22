import Link from "next/link";

import type { CompanionReview } from "@/lib/services/portfolio/companion";
import { PORTFOLIO_HEALTH_PATH } from "@/lib/navigation/appRoutes";
import { TRUST_DATA_AVAILABLE_SHORT } from "@/lib/content/productTrust";
import {
  appSectionMetaClass,
} from "@/components/layout/appSurface";
import {
  appIdentityHappenedCardClass,
  appIdentityHappenedMetricClass,
  appKpiIntelClass,
} from "@/components/layout/semanticIdentity";

export type ReviewGlancePulse = {
  score: number;
  bandLabel: string;
} | null;

type ReviewAtAGlanceProps = {
  review: CompanionReview;
  /** Reused Weekly Pulse — weekly period only; never fabricated. */
  weeklyPulse?: ReviewGlancePulse;
};

function pickFact(
  review: CompanionReview,
  ids: string[],
): { label: string; value: string } | null {
  for (const id of ids) {
    const fact = review.supportingFacts.find((item) => item.id === id);
    if (fact?.value) {
      return { label: fact.label, value: fact.value };
    }
  }
  return null;
}

/**
 * Compact summary strip — period-appropriate, omits missing metrics.
 * Does not duplicate the full facts list below.
 */
export function ReviewAtAGlance({
  review,
  weeklyPulse = null,
}: ReviewAtAGlanceProps) {
  if (!review.ready) return null;

  const chips: Array<{ label: string; value: string }> = [];

  if (review.period === "daily") {
    const move = pickFact(review, ["movement", "today-move", "change"]);
    const strong = pickFact(review, ["strongest"]);
    const weak = pickFact(review, ["weakest"]);
    if (move) chips.push(move);
    if (strong) chips.push({ label: "Strongest", value: strong.value });
    if (weak) chips.push({ label: "Weakest", value: weak.value });
  } else if (review.period === "weekly") {
    const ret = pickFact(review, ["investment-return", "return"]);
    const contrib = pickFact(review, ["net-contributions", "contributions"]);
    const strong = pickFact(review, ["strongest"]);
    if (ret) chips.push(ret);
    if (contrib) chips.push(contrib);
    if (strong) chips.push({ label: "Strongest", value: strong.value });
    if (weeklyPulse) {
      chips.push({
        label: "Weekly Pulse",
        value: `${weeklyPulse.score} · ${weeklyPulse.bandLabel}`,
      });
    }
  } else {
    const ret = pickFact(review, ["investment-return", "return"]);
    const contrib = pickFact(review, ["net-contributions", "contributions"]);
    const move = pickFact(review, ["movement", "portfolio-movement"]);
    if (move) chips.push(move);
    if (ret) chips.push(ret);
    if (contrib) chips.push(contrib);
  }

  if (chips.length === 0 && !review.focus) return null;

  return (
    <div
      className={`${appIdentityHappenedCardClass} px-4 py-4`}
      data-testid="review-at-a-glance"
    >
      <p className="text-[13px] font-bold uppercase tracking-[0.08em] text-q1-deep">
        Review at a glance
      </p>
      {chips.length > 0 ? (
        <ul className="mt-3 grid grid-cols-1 gap-3 min-[390px]:grid-cols-2">
          {chips.slice(0, review.period === "daily" ? 3 : 4).map((chip) => (
            <li key={`${chip.label}-${chip.value}`} className={appIdentityHappenedMetricClass}>
              <p className="text-[13px] font-semibold text-q1-strong">
                {chip.label}
              </p>
              <p className={`mt-0.5 truncate text-[18px] tracking-[-0.02em] ${appKpiIntelClass}`}>
                {chip.value}
              </p>
            </li>
          ))}
        </ul>
      ) : null}
      {review.period === "weekly" && weeklyPulse ? (
        <p className={`mt-3 ${appSectionMetaClass}`}>
          Weekly Pulse reuses your Dashboard score.{" "}
          <Link
            href={PORTFOLIO_HEALTH_PATH}
            className="font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            Open Portfolio Scorecard
          </Link>
        </p>
      ) : null}
      <p className={`mt-2 ${appSectionMetaClass}`}>{TRUST_DATA_AVAILABLE_SHORT}</p>
    </div>
  );
}
