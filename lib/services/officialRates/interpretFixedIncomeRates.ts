/**
 * Deterministic Bonds & Rates copy from official rates + existing classification.
 * No numeric bond-price impact without duration.
 */

import type { FixedIncomeType } from "@/lib/services/classification/classifyFixedIncome";
import type { RateDirection, RateObservation } from "@/lib/services/officialRates/types";

const SUBTYPE_PHRASE: Record<FixedIncomeType, string> = {
  government: "government bond exposure",
  corporate: "corporate bond exposure",
  mixed_aggregate: "a global aggregate bond ETF",
  inflation_linked: "inflation-linked bond exposure",
  unknown: "Fixed Income holdings",
};

function policyDirections(rates: RateObservation[]): RateDirection[] {
  return rates
    .filter((rate) => rate.category === "policy_rate" && rate.value != null)
    .map((rate) => rate.direction);
}

export function buildWhyRatesMatterCopy(input: {
  hasFixedIncome: boolean;
  subtype: FixedIncomeType | null;
  durationUnknown: boolean;
  currencyHedge: string | null;
  rates: RateObservation[];
}): string | null {
  if (!input.hasFixedIncome) return null;

  const holding =
    input.subtype != null
      ? SUBTYPE_PHRASE[input.subtype]
      : "Fixed Income holdings";
  const parts = [
    `Your portfolio contains ${holding}. Changes in major European and US interest rates are relevant context for this exposure. Bond prices generally move in the opposite direction to yields.`,
  ];

  if (input.currencyHedge) {
    parts.push(
      `${input.currencyHedge} share classes still have interest-rate exposure; hedging addresses currency, not duration.`,
    );
  }

  const directions = policyDirections(input.rates);
  if (directions.includes("up") && !directions.includes("down")) {
    parts.push(
      "Policy rates are higher than the previous distinct official setting, which is generally a headwind for existing bond prices, all else equal.",
    );
  } else if (directions.includes("down") && !directions.includes("up")) {
    parts.push(
      "Policy rates are lower than the previous distinct official setting, which is generally supportive for existing bond prices, all else equal.",
    );
  } else if (directions.includes("unchanged") && directions.length > 0) {
    parts.push(
      "Major policy rates are unchanged at the latest official setting.",
    );
  }

  if (input.durationUnknown) {
    parts.push(
      "Exact rate sensitivity cannot be estimated because duration data is unavailable.",
    );
  }

  return parts.join(" ");
}

export function selectVisibleOfficialRates(
  rates: RateObservation[],
  intelligenceDepth: "free" | "complete",
): RateObservation[] {
  const available = rates.filter((rate) => rate.value != null);
  if (intelligenceDepth === "complete") return available;
  return available.filter((rate) => rate.category === "policy_rate");
}
