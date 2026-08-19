/**
 * Official ECB SDMX rates — Deposit Facility and €STR.
 * Reuses the existing public ECB Data Portal (no credentials).
 */

import {
  changeFromPrevious,
  parseFiniteRate,
  previousAdjacentLevel,
  previousDistinctLevel,
  resolveFreshness,
} from "@/lib/services/officialRates/normalize";
import type {
  ParsedRatePoint,
  RateObservation,
} from "@/lib/services/officialRates/types";

const ECB_DATA_API = "https://data-api.ecb.europa.eu/service/data";
const DFR_SERIES = "FM/D.U2.EUR.4F.KR.DFR.LEV";
const ESTR_SERIES = "EST/B.EU000A2X2A25.WT";

export type EcbOfficialRatesResult = {
  rates: RateObservation[];
  errors: string[];
};

function splitCsvLine(line: string): string[] {
  const cols: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cols.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cols.push(current.trim());
  return cols;
}

export function parseEcbCsvObservations(csv: string): ParsedRatePoint[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) return [];

  const header = splitCsvLine(lines[0]!);
  const timeIndex = header.findIndex((col) => /TIME_PERIOD|TIME/i.test(col));
  const obsIndex = header.findIndex((col) => /OBS_VALUE/i.test(col));
  if (timeIndex < 0 || obsIndex < 0) return [];

  const points: ParsedRatePoint[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cols = splitCsvLine(lines[i]!);
    const value = parseFiniteRate(cols[obsIndex]);
    if (value == null) continue;
    points.push({
      date: cols[timeIndex] || null,
      value,
    });
  }
  return points;
}

function toIsoDate(value: string | null): string | null {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return `${value.slice(0, 10)}T00:00:00.000Z`;
  return value;
}

async function fetchEcbCsv(
  seriesPath: string,
  lastNObservations: number,
  fetchImpl: typeof fetch,
): Promise<string> {
  const url = `${ECB_DATA_API}/${seriesPath}?lastNObservations=${lastNObservations}&format=csvdata`;
  const response = await fetchImpl(url, {
    headers: { Accept: "text/csv" },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw new Error(`ECB ${seriesPath} HTTP ${response.status}`);
  }
  return response.text();
}

function buildLevelObservation(input: {
  id: string;
  label: string;
  category: RateObservation["category"];
  current: ParsedRatePoint | null;
  previous: ParsedRatePoint | null;
  currentSince?: ParsedRatePoint | null;
  sourceUrl: string;
  now?: number;
}): RateObservation {
  const { changeBp, direction } = changeFromPrevious(
    input.current?.value ?? null,
    input.previous?.value ?? null,
  );
  const observedAt = toIsoDate(input.current?.date ?? null);
  const effectiveAt = toIsoDate(
    input.category === "policy_rate" && input.previous && input.currentSince
      ? input.currentSince.date
      : input.current?.date ?? null,
  );
  const freshness = resolveFreshness({
    category: input.category,
    observedAt,
    now: input.now,
  });

  return {
    id: input.id,
    label: input.label,
    region: "euro_area",
    category: input.category,
    value: input.current?.value ?? null,
    rangeLower: null,
    rangeUpper: null,
    previousValue: input.previous?.value ?? null,
    previousRangeLower: null,
    previousRangeUpper: null,
    changeBp,
    direction: input.current ? direction : "unknown",
    observedAt,
    effectiveAt,
    source: "European Central Bank",
    sourceUrl: input.sourceUrl,
    freshness: input.current ? freshness.freshness : "unavailable",
    freshnessLabel: input.current
      ? freshness.freshnessLabel
      : "Official observation unavailable",
    confidence: input.current ? "official" : "unknown",
  };
}

export async function fetchEcbOfficialRates(
  fetchImpl: typeof fetch = fetch,
  now = Date.now(),
): Promise<EcbOfficialRatesResult> {
  const errors: string[] = [];
  const rates: RateObservation[] = [];

  try {
    const csv = await fetchEcbCsv(DFR_SERIES, 400, fetchImpl);
    const points = parseEcbCsvObservations(csv);
    const { current, previous, currentSince } = previousDistinctLevel(points);
    if (!current) {
      errors.push("ECB Deposit Facility returned no observations");
    } else {
      rates.push(
        buildLevelObservation({
          id: "ecb_dfr",
          label: "ECB Deposit Rate",
          category: "policy_rate",
          current,
          previous,
          currentSince,
          sourceUrl:
            "https://data.ecb.europa.eu/data/datasets/FM/FM.D.U2.EUR.4F.KR.DFR.LEV",
          now,
        }),
      );
    }
  } catch (error) {
    errors.push(
      error instanceof Error ? error.message : "ECB Deposit Facility fetch failed",
    );
  }

  try {
    const csv = await fetchEcbCsv(ESTR_SERIES, 8, fetchImpl);
    const points = parseEcbCsvObservations(csv);
    const { current, previous } = previousAdjacentLevel(points);
    if (!current) {
      errors.push("ECB €STR returned no observations");
    } else {
      rates.push(
        buildLevelObservation({
          id: "ecb_estr",
          label: "€STR",
          category: "overnight_rate",
          current,
          previous,
          sourceUrl: "https://data.ecb.europa.eu/data/datasets/EST",
          now,
        }),
      );
    }
  } catch (error) {
    errors.push(error instanceof Error ? error.message : "ECB €STR fetch failed");
  }

  return { rates, errors };
}
