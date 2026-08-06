export type MarketDataStatus = "live" | "delayed" | "stale" | "unavailable";

export type NormalizedMarketQuote = {
  symbol: string;
  currentPrice: number | null;
  previousClose: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string | null;
  updatedAt: string | null;
  dataStatus: MarketDataStatus;
};

export function parseMarketNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function resolveMarketDataStatus(
  updatedAt: string | null | undefined,
  hasPrice: boolean,
  now = Date.now(),
): MarketDataStatus {
  if (!hasPrice) {
    return "unavailable";
  }

  if (!updatedAt) {
    return "delayed";
  }

  const timestamp = Date.parse(updatedAt);
  if (!Number.isFinite(timestamp)) {
    return "delayed";
  }

  const ageMs = now - timestamp;
  if (ageMs <= 15 * 60 * 1000) {
    return "live";
  }

  if (ageMs <= 24 * 60 * 60 * 1000) {
    return "delayed";
  }

  return "stale";
}

type NormalizeMarketQuoteInput = {
  symbol: string;
  priceEur: number | null;
  previousCloseEur?: number | null;
  changeEur?: number | null;
  changePercent?: number | null;
  originalCurrency?: string | null;
  updatedAt?: string | null;
};

/** Normalizes provider/API quote fields into the shared daily-performance shape. */
export function normalizeMarketQuote(
  input: NormalizeMarketQuoteInput,
  now = Date.now(),
): NormalizedMarketQuote {
  const currentPrice =
    typeof input.priceEur === "number" && Number.isFinite(input.priceEur) && input.priceEur > 0
      ? input.priceEur
      : null;

  const previousClose =
    typeof input.previousCloseEur === "number" &&
    Number.isFinite(input.previousCloseEur) &&
    input.previousCloseEur > 0
      ? input.previousCloseEur
      : null;

  let change: number | null = null;
  let changePercent: number | null = null;

  // Daily performance requires a valid previous close. Never trust provider
  // change/change_p when price and previous close can be reconciled directly.
  if (currentPrice !== null && previousClose !== null) {
    change = currentPrice - previousClose;
    changePercent = (change / previousClose) * 100;
  }

  const updatedAt = input.updatedAt ?? null;

  return {
    symbol: input.symbol,
    currentPrice,
    previousClose,
    change,
    changePercent,
    currency: input.originalCurrency ?? null,
    updatedAt,
    dataStatus: resolveMarketDataStatus(updatedAt, currentPrice !== null, now),
  };
}

export function isUsableChangePercent(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > -100;
}

export function deriveDailyChangePercentFromPrices(
  currentPrice: number | null | undefined,
  previousClose: number | null | undefined,
): number | null {
  if (
    !Number.isFinite(currentPrice) ||
    !Number.isFinite(previousClose) ||
    (currentPrice as number) <= 0 ||
    (previousClose as number) <= 0
  ) {
    return null;
  }

  const changePercent =
    (((currentPrice as number) - (previousClose as number)) /
      (previousClose as number)) *
    100;

  return isUsableChangePercent(changePercent) ? changePercent : null;
}
