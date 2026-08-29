/**
 * Holding start/end EUR values from EOD history (constant current quantities).
 * Reuses the same coverage rules as buildHistoricalPortfolioSeries.
 * Does not invent prices. Does not adjust for cash flows or trades.
 */

import type {
  BuildHistoricalPortfolioSeriesInput,
  EodHistoryPoint,
  PerformanceHistoryHoldingInput,
} from "@/lib/services/performance/types";

export type HoldingPeriodMove = {
  holdingId: string;
  symbol: string;
  name: string;
  assetType: "investment" | "cash" | "crypto";
  quantity: number;
  startingClose: number | null;
  endingClose: number | null;
  startingValueEur: number | null;
  endingValueEur: number | null;
  moveEur: number | null;
  returnPercent: number | null;
  included: boolean;
  exclusionReason: string | null;
  usesApproximateFx: boolean;
};

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function resolveFxRate(
  fxRateToEur: BuildHistoricalPortfolioSeriesInput["fxRateToEur"],
  currency: string,
): number | null {
  const key = currency.trim().toUpperCase();
  if (key === "EUR") return 1;

  let rate: number | null | undefined;
  if (typeof (fxRateToEur as Map<string, number>).get === "function") {
    rate = (fxRateToEur as Map<string, number>).get(key);
  } else {
    rate = (fxRateToEur as Record<string, number | null | undefined>)[key];
  }

  return typeof rate === "number" && Number.isFinite(rate) && rate > 0
    ? rate
    : null;
}

function resolveQuoteCurrency(holding: PerformanceHistoryHoldingInput): string {
  const raw = holding.quoteCurrency?.trim();
  return raw ? raw.toUpperCase() : "EUR";
}

function cashValueEur(holding: PerformanceHistoryHoldingInput): number {
  if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
    return 0;
  }
  const price =
    typeof holding.currentPrice === "number" && holding.currentPrice > 0
      ? holding.currentPrice
      : 1;
  return holding.quantity * price;
}

function filterPointsInWindow(
  points: EodHistoryPoint[],
  startIso: string,
  endIso: string,
): EodHistoryPoint[] {
  return points
    .filter(
      (point) =>
        point.date >= startIso &&
        point.date <= endIso &&
        Number.isFinite(point.value) &&
        point.value > 0,
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Build per-holding start/end EUR values aligned to the first date where every
 * covered investment has a close (same alignment idea as the portfolio series).
 */
export function buildHoldingPeriodMovesFromEod(
  input: BuildHistoricalPortfolioSeriesInput,
): HoldingPeriodMove[] {
  const { holdings, historyByProviderSymbol, window } = input;
  const startIso = toIsoDate(window.startDate);
  const endIso = toIsoDate(window.endDate);

  type Covered = {
    holding: PerformanceHistoryHoldingInput;
    points: EodHistoryPoint[];
    fxRate: number;
    usesApproximateFx: boolean;
  };

  const covered: Covered[] = [];
  const rows: HoldingPeriodMove[] = [];

  for (const holding of holdings) {
    const assetType = holding.assetType ?? "investment";
    const base = {
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.symbol,
      assetType,
      quantity: holding.quantity,
      startingClose: null as number | null,
      endingClose: null as number | null,
      startingValueEur: null as number | null,
      endingValueEur: null as number | null,
      moveEur: null as number | null,
      returnPercent: null as number | null,
      included: false,
      exclusionReason: null as string | null,
      usesApproximateFx: false,
    };

    if (assetType === "cash") {
      const value = cashValueEur(holding);
      rows.push({
        ...base,
        name: holding.symbol || "Cash",
        startingValueEur: value,
        endingValueEur: value,
        moveEur: 0,
        returnPercent: 0,
        included: value > 0,
        exclusionReason: value > 0 ? null : "Cash balance unavailable",
      });
      continue;
    }

    const providerSymbol = holding.providerSymbol?.trim();
    if (!providerSymbol) {
      rows.push({
        ...base,
        exclusionReason: "Missing provider symbol",
      });
      continue;
    }

    if (!Number.isFinite(holding.quantity) || holding.quantity <= 0) {
      rows.push({
        ...base,
        exclusionReason: "Quantity unavailable",
      });
      continue;
    }

    const quoteCurrency = resolveQuoteCurrency(holding);
    const fxRate = resolveFxRate(input.fxRateToEur, quoteCurrency);
    if (fxRate === null) {
      rows.push({
        ...base,
        exclusionReason: "FX rate unavailable",
      });
      continue;
    }

    const rawHistory =
      historyByProviderSymbol.get(providerSymbol) ??
      historyByProviderSymbol.get(providerSymbol.toUpperCase()) ??
      [];
    const points = filterPointsInWindow(rawHistory, startIso, endIso);
    if (points.length < 2) {
      rows.push({
        ...base,
        usesApproximateFx: quoteCurrency !== "EUR",
        exclusionReason: "Insufficient price history",
      });
      continue;
    }

    covered.push({
      holding,
      points,
      fxRate,
      usesApproximateFx: quoteCurrency !== "EUR",
    });
  }

  if (covered.length === 0) {
    return rows;
  }

  const firstAlignedDate = covered
    .map((item) => item.points[0]!.date)
    .sort()
    .at(-1)!;

  for (const item of covered) {
    const pointsInAligned = item.points.filter(
      (point) => point.date >= firstAlignedDate && point.date <= endIso,
    );
    if (pointsInAligned.length < 2) {
      rows.push({
        holdingId: item.holding.id,
        symbol: item.holding.symbol,
        name: item.holding.symbol,
        assetType: item.holding.assetType ?? "investment",
        quantity: item.holding.quantity,
        startingClose: null,
        endingClose: null,
        startingValueEur: null,
        endingValueEur: null,
        moveEur: null,
        returnPercent: null,
        included: false,
        exclusionReason: "Insufficient aligned price history",
        usesApproximateFx: item.usesApproximateFx,
      });
      continue;
    }

    const startClose = pointsInAligned[0]!.value;
    const endClose = pointsInAligned[pointsInAligned.length - 1]!.value;
    const startValue = item.holding.quantity * startClose * item.fxRate;
    const endValue = item.holding.quantity * endClose * item.fxRate;
    const move = endValue - startValue;
    const returnPercent =
      startValue > 0 ? (move / startValue) * 100 : null;

    rows.push({
      holdingId: item.holding.id,
      symbol: item.holding.symbol,
      name: item.holding.symbol,
      assetType: item.holding.assetType ?? "investment",
      quantity: item.holding.quantity,
      startingClose: startClose,
      endingClose: endClose,
      startingValueEur: startValue,
      endingValueEur: endValue,
      moveEur: move,
      returnPercent,
      included: true,
      exclusionReason: null,
      usesApproximateFx: item.usesApproximateFx,
    });
  }

  return rows;
}
