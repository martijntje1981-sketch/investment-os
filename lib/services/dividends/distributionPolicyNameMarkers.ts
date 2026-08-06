/**
 * Supporting name-marker detection for distribution policy.
 * Markers alone are insufficient without exact ISIN-linked official metadata.
 */

import type { DistributionPolicy } from "@/lib/types/distributionPolicy";

const ACCUMULATING_PATTERN =
  /\b(Acc(?:umulating)?|Capitalisation|Capitalization)\b/i;
const DISTRIBUTING_PATTERN =
  /\b(Dist(?:ributing)?)\b/i;

/** False-positive guard: standalone "Income" or "Yield" do not prove cash distribution. */
const YIELD_MARKETING_PATTERN = /\b(Yield|Income)\b/i;

export function detectNameMarkerPolicy(
  officialName: string | null | undefined,
): Extract<DistributionPolicy, "accumulating" | "distributing"> | null {
  const name = officialName?.trim();
  if (!name) return null;

  if (ACCUMULATING_PATTERN.test(name)) {
    return "accumulating";
  }

  if (DISTRIBUTING_PATTERN.test(name)) {
    return "distributing";
  }

  return null;
}

export function isYieldMarketingTerm(name: string | null | undefined): boolean {
  const value = name?.trim();
  if (!value) return false;
  return YIELD_MARKETING_PATTERN.test(value) && !DISTRIBUTING_PATTERN.test(value);
}
