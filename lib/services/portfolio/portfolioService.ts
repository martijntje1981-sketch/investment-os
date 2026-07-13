import { holdings } from "./holdings";

export type PortfolioHolding = {
  ticker: string;
  symbol: string;
  name: string;
  category: string;
  units: number;
  quantity: number;
  averagePrice: number;
  price: number;
  currentPrice: number;
  costBasis: number;
  value: number;
  marketValue: number;
  weight: number;
  allocation: number;
  dayChangePercent: number;
  dailyChangePercent: number;
  dayChangeValue: number;
  totalReturn: number;
  returnValue: number;
  totalReturnPercent: number;
  returnPercent: number;
};

export type PortfolioSnapshot = {
  holdings: PortfolioHolding[];
  positions: PortfolioHolding[];
  totalValue: number;
  value: number;
  totalCostBasis: number;
  investedCapital: number;
  totalDayChange: number;
  dayChange: number;
  totalDayChangePercent: number;
  dayChangePercent: number;
  totalReturn: number;
  returnValue: number;
  totalReturnPercent: number;
  returnPercent: number;
  holdingCount: number;
  updatedAt: string;
};

type RawHolding = Record<string, unknown>;

function getString(
  holding: RawHolding,
  keys: string[],
  fallback = ""
): string {
  for (const key of keys) {
    const value = holding[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return fallback;
}

function getNumber(
  holding: RawHolding,
  keys: string[],
  fallback = 0
): number {
  for (const key of keys) {
    const value = holding[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = Number(
        value
          .replace(/[€$£%\s]/g, "")
          .replace(/\./g, "")
          .replace(",", ".")
      );

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
}

function normalizeHolding(rawHolding: RawHolding): Omit<
  PortfolioHolding,
  "weight" | "allocation"
> {
  const ticker = getString(
    rawHolding,
    ["ticker", "symbol", "code"],
    "UNKNOWN"
  ).toUpperCase();

  const name = getString(rawHolding, ["name", "fullName"], ticker);

  const category = getString(
    rawHolding,
    ["category", "assetClass", "type"],
    "Investment"
  );

  const units = getNumber(rawHolding, [
    "units",
    "quantity",
    "shares",
    "amount",
  ]);

  const averagePrice = getNumber(rawHolding, [
    "averagePrice",
    "averageBuyPrice",
    "avgPrice",
    "purchasePrice",
  ]);

  const price = getNumber(rawHolding, [
    "price",
    "currentPrice",
    "marketPrice",
    "quote",
  ]);

  const suppliedValue = getNumber(rawHolding, [
    "value",
    "marketValue",
    "positionValue",
  ]);

  const value = suppliedValue || units * price;

  const suppliedCostBasis = getNumber(rawHolding, [
    "costBasis",
    "invested",
    "investedCapital",
  ]);

  const costBasis = suppliedCostBasis || units * averagePrice;

  const dayChangePercent = getNumber(rawHolding, [
    "dayChangePercent",
    "dailyChangePercent",
    "changePercent",
    "todayPercent",
  ]);

  const dayChangeValue = value * (dayChangePercent / 100);
  const totalReturn = value - costBasis;

  const totalReturnPercent =
    costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;

  return {
    ticker,
    symbol: ticker,
    name,
    category,
    units,
    quantity: units,
    averagePrice,
    price,
    currentPrice: price,
    costBasis,
    value,
    marketValue: value,
    dayChangePercent,
    dailyChangePercent: dayChangePercent,
    dayChangeValue,
    totalReturn,
    returnValue: totalReturn,
    totalReturnPercent,
    returnPercent: totalReturnPercent,
  };
}

export function getPortfolioSnapshot(): PortfolioSnapshot {
  const normalizedHoldings = (holdings as unknown as RawHolding[]).map(
    normalizeHolding
  );

  const totalValue = normalizedHoldings.reduce(
    (total, holding) => total + holding.value,
    0
  );

  const totalCostBasis = normalizedHoldings.reduce(
    (total, holding) => total + holding.costBasis,
    0
  );

  const totalDayChange = normalizedHoldings.reduce(
    (total, holding) => total + holding.dayChangeValue,
    0
  );

  const totalReturn = totalValue - totalCostBasis;

  const totalDayChangePercent =
    totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;

  const totalReturnPercent =
    totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;

  const calculatedHoldings: PortfolioHolding[] = normalizedHoldings
    .map((holding) => {
      const weight =
        totalValue > 0 ? (holding.value / totalValue) * 100 : 0;

      return {
        ...holding,
        weight,
        allocation: weight,
      };
    })
    .sort((a, b) => b.value - a.value);

  return {
    holdings: calculatedHoldings,
    positions: calculatedHoldings,
    totalValue,
    value: totalValue,
    totalCostBasis,
    investedCapital: totalCostBasis,
    totalDayChange,
    dayChange: totalDayChange,
    totalDayChangePercent,
    dayChangePercent: totalDayChangePercent,
    totalReturn,
    returnValue: totalReturn,
    totalReturnPercent,
    returnPercent: totalReturnPercent,
    holdingCount: calculatedHoldings.length,
    updatedAt: new Date().toISOString(),
  };
}

export function getHoldingByTicker(
  ticker: string
): PortfolioHolding | undefined {
  const normalizedTicker = ticker.toUpperCase();

  return getPortfolioSnapshot().holdings.find(
    (holding) =>
      holding.ticker === normalizedTicker ||
      holding.symbol === normalizedTicker
  );
}