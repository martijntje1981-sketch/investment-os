/**
 * Canonical official interest-rate observations.
 * Components must not calculate or invent rate values.
 */

export type RateDirection = "up" | "down" | "unchanged" | "unknown";

export type RateCategory = "policy_rate" | "overnight_rate" | "government_yield";

export type RateRegion = "euro_area" | "united_states";

export type RateFreshness =
  | "current"
  | "latest_available"
  | "stale"
  | "unavailable";

export type RateConfidence = "official" | "unknown";

export type RateObservation = {
  id: string;
  label: string;
  region: RateRegion;
  category: RateCategory;
  value: number | null;
  rangeLower: number | null;
  rangeUpper: number | null;
  previousValue: number | null;
  previousRangeLower: number | null;
  previousRangeUpper: number | null;
  changeBp: number | null;
  direction: RateDirection;
  observedAt: string | null;
  effectiveAt: string | null;
  source: string;
  sourceUrl: string;
  freshness: RateFreshness;
  freshnessLabel: string;
  confidence: RateConfidence;
};

export type OfficialRatesRegionGroup = {
  id: RateRegion;
  label: string;
  rates: RateObservation[];
};

export type OfficialRatesSnapshot = {
  fetchedAt: string;
  cacheExpiresAt: string;
  isStale: boolean;
  groups: OfficialRatesRegionGroup[];
  providerErrors: string[];
};

export type ParsedRatePoint = {
  date: string | null;
  value: number;
};

export type ParsedRateRangePoint = {
  date: string | null;
  lower: number;
  upper: number;
  mid: number;
};
