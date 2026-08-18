/**
 * Short educational copy for Fixed Income — no analytics.
 * Does not invent yield, coupon, duration, or rate-shock numbers.
 */

import type { PortfolioFixedIncomeSleeve } from "@/lib/services/classification/types";

export const FIXED_INCOME_RATE_EDUCATION_HEADLINE =
  "Bonds and interest rates";

export const FIXED_INCOME_RATE_EDUCATION_BODY =
  "When market interest rates or yields rise, existing bond prices generally fall. When yields fall, existing bond prices generally rise. Individual bonds and bond funds do not all move equally — sensitivity depends partly on maturity and duration. This is educational context, not advice.";

export const FIXED_INCOME_DURATION_UNAVAILABLE_NOTE =
  "Duration is not available for this portfolio’s bond holdings, so Tobailey does not estimate how much prices might move if rates change.";

export function buildFixedIncomeRateEducation(
  sleeve: Pick<PortfolioFixedIncomeSleeve, "durationKnownSharePercent"> | null,
): {
  headline: string;
  body: string;
  durationNote: string | null;
} {
  const durationKnown =
    sleeve != null &&
    Number.isFinite(sleeve.durationKnownSharePercent) &&
    sleeve.durationKnownSharePercent > 0;

  return {
    headline: FIXED_INCOME_RATE_EDUCATION_HEADLINE,
    body: FIXED_INCOME_RATE_EDUCATION_BODY,
    durationNote: durationKnown ? null : FIXED_INCOME_DURATION_UNAVAILABLE_NOTE,
  };
}
