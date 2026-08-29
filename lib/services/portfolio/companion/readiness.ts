import type { CompanionPeriod } from "@/lib/services/portfolio/companion/types";
import type { PortfolioPerformancePoint } from "@/lib/client/performance/types";

export type CompanionReadinessInput = {
  period: CompanionPeriod;
  holdingCount: number;
  hasDailyData?: boolean;
  /** Chart points covering the review window (week/month). */
  seriesPoints?: PortfolioPerformancePoint[] | null;
};

export type CompanionReadiness = {
  ready: boolean;
  reason: string | null;
};

/**
 * Deterministic readiness — never invent opening values.
 */
export function resolveCompanionReadiness(
  input: CompanionReadinessInput,
): CompanionReadiness {
  if (input.holdingCount <= 0) {
    return {
      ready: false,
      reason:
        "Reviews become available after you add holdings and build a little history.",
    };
  }

  if (input.period === "daily") {
    if (!input.hasDailyData) {
      return {
        ready: false,
        reason:
          "A daily story needs a valid latest comparison. Check back after market data updates.",
      };
    }
    return { ready: true, reason: null };
  }

  const points = (input.seriesPoints ?? []).filter(
    (point) =>
      Number.isFinite(point.portfolioValue) && point.portfolioValue >= 0,
  );

  if (points.length < 2) {
    return {
      ready: false,
      reason:
        input.period === "weekly"
          ? "A weekly review needs more portfolio history. Keep monitoring — it appears once a week of data is available."
          : "A monthly review needs more portfolio history. Keep monitoring — it appears once enough month data is available.",
    };
  }

  const first = points[0]?.portfolioValue;
  const last = points[points.length - 1]?.portfolioValue;
  if (
    first == null ||
    last == null ||
    !Number.isFinite(first) ||
    !Number.isFinite(last)
  ) {
    return {
      ready: false,
      reason: "Not enough valid portfolio values to compare this period.",
    };
  }

  return { ready: true, reason: null };
}

/** Prefer monthly when ready, else weekly, else daily. */
export function resolveDefaultCompanionPeriod(input: {
  dailyReady: boolean;
  weeklyReady: boolean;
  monthlyReady: boolean;
}): CompanionPeriod {
  if (input.weeklyReady) return "weekly";
  if (input.monthlyReady) return "monthly";
  return "daily";
}
