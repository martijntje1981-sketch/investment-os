/**
 * Pure rate normalization. Never turns null into 0%.
 */

import type {
  ParsedRatePoint,
  ParsedRateRangePoint,
  RateDirection,
  RateFreshness,
  RateObservation,
} from "@/lib/services/officialRates/types";

const STALE_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function parseFiniteRate(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export function roundBasisPoints(deltaPercent: number): number {
  return Math.round(deltaPercent * 100);
}

export function directionFromChangeBp(changeBp: number | null): RateDirection {
  if (changeBp == null || !Number.isFinite(changeBp)) return "unknown";
  if (changeBp > 0) return "up";
  if (changeBp < 0) return "down";
  return "unchanged";
}

export function changeFromPrevious(
  current: number | null,
  previous: number | null,
): { changeBp: number | null; direction: RateDirection } {
  if (current == null || previous == null) {
    return { changeBp: null, direction: "unknown" };
  }
  const changeBp = roundBasisPoints(current - previous);
  return { changeBp, direction: directionFromChangeBp(changeBp) };
}

export function previousDistinctLevel(
  points: ParsedRatePoint[],
): {
  current: ParsedRatePoint | null;
  previous: ParsedRatePoint | null;
  currentSince: ParsedRatePoint | null;
} {
  if (points.length === 0) {
    return { current: null, previous: null, currentSince: null };
  }
  const current = points[points.length - 1] ?? null;
  if (!current) return { current: null, previous: null, currentSince: null };

  let currentSince = current;
  for (let i = points.length - 2; i >= 0; i -= 1) {
    const candidate = points[i];
    if (!candidate) continue;
    if (candidate.value !== current.value) {
      return { current, previous: candidate, currentSince };
    }
    currentSince = candidate;
  }
  return { current, previous: null, currentSince };
}

export function previousAdjacentLevel(
  points: ParsedRatePoint[],
): { current: ParsedRatePoint | null; previous: ParsedRatePoint | null } {
  if (points.length === 0) return { current: null, previous: null };
  const current = points[points.length - 1] ?? null;
  const previous = points.length > 1 ? points[points.length - 2]! : null;
  return { current, previous };
}

export function previousDistinctRange(
  points: ParsedRateRangePoint[],
): {
  current: ParsedRateRangePoint | null;
  previous: ParsedRateRangePoint | null;
  currentSince: ParsedRateRangePoint | null;
} {
  if (points.length === 0) {
    return { current: null, previous: null, currentSince: null };
  }
  const current = points[points.length - 1] ?? null;
  if (!current) return { current: null, previous: null, currentSince: null };

  let currentSince = current;
  for (let i = points.length - 2; i >= 0; i -= 1) {
    const candidate = points[i];
    if (!candidate) continue;
    if (candidate.lower !== current.lower || candidate.upper !== current.upper) {
      return { current, previous: candidate, currentSince };
    }
    currentSince = candidate;
  }
  return { current, previous: null, currentSince };
}

export function formatRatePercent(value: number | null): string | null {
  if (value == null || !Number.isFinite(value)) return null;
  const thousandths = Math.round(value * 1000);
  if (thousandths % 10 === 0) {
    return `${(thousandths / 1000).toFixed(2)}%`;
  }
  return `${(thousandths / 1000).toFixed(3)}%`;
}

export function formatRateRange(
  lower: number | null,
  upper: number | null,
): string | null {
  const low = formatRatePercent(lower);
  const high = formatRatePercent(upper);
  if (!low || !high) return null;
  return `${low.replace("%", "")}–${high}`;
}

export function formatChangeBp(changeBp: number | null): string | null {
  if (changeBp == null || !Number.isFinite(changeBp)) return null;
  if (changeBp === 0) return "unchanged";
  const sign = changeBp > 0 ? "+" : "−";
  return `${sign}${Math.abs(changeBp)} bp`;
}

export function resolveFreshness(input: {
  category: RateObservation["category"];
  observedAt: string | null;
  now?: number;
}): { freshness: RateFreshness; freshnessLabel: string } {
  if (!input.observedAt) {
    return { freshness: "unavailable", freshnessLabel: "Observation date unavailable" };
  }

  if (input.category === "policy_rate") {
    return {
      freshness: "current",
      freshnessLabel: "Current policy rate",
    };
  }

  const observedMs = Date.parse(input.observedAt);
  if (!Number.isFinite(observedMs)) {
    return {
      freshness: "latest_available",
      freshnessLabel: "Latest available observation",
    };
  }

  const now = input.now ?? Date.now();
  const age = now - observedMs;
  const observed = new Date(observedMs);
  const dateLabel = observed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  if (age > STALE_AFTER_MS) {
    return {
      freshness: "stale",
      freshnessLabel: `Last observation ${dateLabel}`,
    };
  }

  const today = new Date(now);
  if (
    observed.getUTCFullYear() === today.getUTCFullYear() &&
    observed.getUTCMonth() === today.getUTCMonth() &&
    observed.getUTCDate() === today.getUTCDate()
  ) {
    return {
      freshness: "latest_available",
      freshnessLabel: "Updated today",
    };
  }

  return {
    freshness: "latest_available",
    freshnessLabel: "Latest available observation",
  };
}

export function displayRateValue(rate: RateObservation): string | null {
  if (rate.rangeLower != null && rate.rangeUpper != null) {
    return formatRateRange(rate.rangeLower, rate.rangeUpper);
  }
  return formatRatePercent(rate.value);
}
