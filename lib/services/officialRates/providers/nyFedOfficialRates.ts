/**
 * Official New York Fed reference rates — EFFR and Fed Funds target range.
 * Same public NY Fed JSON already used for cash intelligence.
 */

import {
  changeFromPrevious,
  parseFiniteRate,
  previousAdjacentLevel,
  previousDistinctRange,
  resolveFreshness,
} from "@/lib/services/officialRates/normalize";
import type {
  ParsedRatePoint,
  ParsedRateRangePoint,
  RateObservation,
} from "@/lib/services/officialRates/types";

const NY_FED_EFFR_HISTORY =
  "https://markets.newyorkfed.org/api/rates/unsecured/effr/last/400.json";

type NyFedRateRow = {
  type?: string;
  percentRate?: number;
  effectiveDate?: string;
  targetRateFrom?: number;
  targetRateTo?: number;
};

type NyFedHistoryResponse = {
  refRates?: NyFedRateRow[];
};

export type NyFedOfficialRatesResult = {
  rates: RateObservation[];
  errors: string[];
};

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return `${value.slice(0, 10)}T00:00:00.000Z`;
  return value;
}

export function parseNyFedEffrRows(rows: NyFedRateRow[]): {
  effr: ParsedRatePoint[];
  target: ParsedRateRangePoint[];
} {
  const chronological = [...rows].sort((left, right) =>
    String(left.effectiveDate ?? "").localeCompare(String(right.effectiveDate ?? "")),
  );
  const effr: ParsedRatePoint[] = [];
  const target: ParsedRateRangePoint[] = [];

  for (const row of chronological) {
    if (String(row.type ?? "").toUpperCase() !== "EFFR") continue;
    const value = parseFiniteRate(row.percentRate);
    if (value != null) {
      effr.push({ date: row.effectiveDate ?? null, value });
    }
    const lower = parseFiniteRate(row.targetRateFrom);
    const upper = parseFiniteRate(row.targetRateTo);
    if (lower != null && upper != null) {
      target.push({
        date: row.effectiveDate ?? null,
        lower,
        upper,
        mid: (lower + upper) / 2,
      });
    }
  }

  return { effr, target };
}

export async function fetchNyFedOfficialRates(
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<NyFedOfficialRatesResult> {
  try {
    const response = await fetchImpl(NY_FED_EFFR_HISTORY, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`NY Fed HTTP ${response.status}`);
    }

    const payload = (await response.json()) as NyFedHistoryResponse;
    const rows = Array.isArray(payload.refRates) ? payload.refRates : [];
    const parsed = parseNyFedEffrRows(rows);

    const targetPair = previousDistinctRange(parsed.target);
    const targetChange = changeFromPrevious(
      targetPair.current?.mid ?? null,
      targetPair.previous?.mid ?? null,
    );
    const targetObserved = toIsoDate(targetPair.current?.date ?? null);
    const targetEffective = toIsoDate(
      targetPair.previous && targetPair.currentSince
        ? targetPair.currentSince.date
        : targetPair.current?.date ?? null,
    );
    const targetFreshness = resolveFreshness({
      category: "policy_rate",
      observedAt: targetObserved,
      now,
    });

    const targetRate: RateObservation = {
      id: "fed_funds_target",
      label: "Fed Funds Target",
      region: "united_states",
      category: "policy_rate",
      value: targetPair.current?.mid ?? null,
      rangeLower: targetPair.current?.lower ?? null,
      rangeUpper: targetPair.current?.upper ?? null,
      previousValue: targetPair.previous?.mid ?? null,
      previousRangeLower: targetPair.previous?.lower ?? null,
      previousRangeUpper: targetPair.previous?.upper ?? null,
      changeBp: targetPair.current ? targetChange.changeBp : null,
      direction: targetPair.current ? targetChange.direction : "unknown",
      observedAt: targetObserved,
      effectiveAt: targetEffective,
      source: "Federal Reserve Bank of New York",
      sourceUrl: "https://markets.newyorkfed.org/markets/reference-rates",
      freshness: targetPair.current ? targetFreshness.freshness : "unavailable",
      freshnessLabel: targetPair.current
        ? targetFreshness.freshnessLabel
        : "Official observation unavailable",
      confidence: targetPair.current ? "official" : "unknown",
    };

    const effrPair = previousAdjacentLevel(parsed.effr);
    const effrChange = changeFromPrevious(
      effrPair.current?.value ?? null,
      effrPair.previous?.value ?? null,
    );
    const effrObserved = toIsoDate(effrPair.current?.date ?? null);
    const effrFreshness = resolveFreshness({
      category: "overnight_rate",
      observedAt: effrObserved,
      now,
    });

    const effrRate: RateObservation = {
      id: "fed_effr",
      label: "EFFR",
      region: "united_states",
      category: "overnight_rate",
      value: effrPair.current?.value ?? null,
      rangeLower: null,
      rangeUpper: null,
      previousValue: effrPair.previous?.value ?? null,
      previousRangeLower: null,
      previousRangeUpper: null,
      changeBp: effrPair.current ? effrChange.changeBp : null,
      direction: effrPair.current ? effrChange.direction : "unknown",
      observedAt: effrObserved,
      effectiveAt: effrObserved,
      source: "Federal Reserve Bank of New York",
      sourceUrl: "https://markets.newyorkfed.org/markets/reference-rates",
      freshness: effrPair.current ? effrFreshness.freshness : "unavailable",
      freshnessLabel: effrPair.current
        ? effrFreshness.freshnessLabel
        : "Official observation unavailable",
      confidence: effrPair.current ? "official" : "unknown",
    };

    const rates = [targetRate, effrRate].filter((rate) => rate.value != null);
    return {
      rates,
      errors:
        rates.length === 0
          ? ["NY Fed returned no EFFR or target-range observations"]
          : [],
    };
  } catch (error) {
    return {
      rates: [],
      errors: [
        error instanceof Error ? error.message : "NY Fed rates fetch failed",
      ],
    };
  }
}
