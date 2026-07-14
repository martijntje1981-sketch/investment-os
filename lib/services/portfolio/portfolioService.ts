import {
  holdings,
  type HoldingStance,
} from "./holdings";

export type LiveMarketPrice = {
  symbol: string;
  eodhdSymbol?: string;
  isin?: string | null;
  name?: string;

  originalCurrency?: string;
  originalPrice?: number;

  baseCurrency?: string;
  exchangeRateToEur?: number | null;
  priceEur: number;

  previousCloseOriginal?: number | null;
  previousCloseEur?: number | null;

  change?: number | null;
  changePercent?: number | null;

  open?: number | null;
  high?: number | null;
  low?: number | null;
  volume?: number | null;

  timestamp?: number | null;
  updatedAt?: string | null;
};

export type PricesApiResponse = {
  success: boolean;
  baseCurrency?: string;

  prices?: LiveMarketPrice[];
  errors?: string[];

  requested?: number;
  received?: number;
  generatedAt?: string;

  error?: string;
};

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
  previousClose: number | null;

  costBasis: number;
  value: number;
  marketValue: number;

  weight: number;
  weightPercent: number;
  allocation: number;

  dayChangePercent: number;
  dailyChangePercent: number;
  dayChangeValue: number;
  dayChangePerUnit: number;

  totalReturn: number;
  returnValue: number;
  profitLoss: number;
  totalReturnPercent: number;
  returnPercent: number;

  investmentScore: number;
  stance: HoldingStance;
  riskLevel: "Low" | "Medium" | "High" | "Very High";

  summary: string;
  thesis: string[];
  catalysts: string[];
  risks: string[];

  marketDataSource: "static" | "eodhd";
  marketDataUpdatedAt: string | null;

  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
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
  marketDataSource: "static" | "eodhd" | "mixed";
};

type RawHolding = Record<string, unknown>;

type NormalizedHolding = Omit<
  PortfolioHolding,
  "weight" | "weightPercent" | "allocation"
>;

function getString(
  holding: RawHolding,
  keys: string[],
  fallback = "",
): string {
  for (const key of keys) {
    const value = holding[key];

    if (
      typeof value === "string" &&
      value.trim().length > 0
    ) {
      return value;
    }
  }

  return fallback;
}

function getStringArray(
  holding: RawHolding,
  keys: string[],
): string[] {
  for (const key of keys) {
    const value = holding[key];

    if (
      Array.isArray(value) &&
      value.every(
        (item) => typeof item === "string",
      )
    ) {
      return value;
    }
  }

  return [];
}

function parseNumericString(value: string): number | null {
  const cleaned = value
    .trim()
    .replace(/[€$£%\s]/g, "");

  if (!cleaned) {
    return null;
  }

  /*
   * Ondersteunt onder andere:
   * 1.234,56
   * 1234,56
   * 1,234.56
   * 1234.56
   */
  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");

  let normalized = cleaned;

  if (lastComma > lastDot) {
    normalized = cleaned
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (lastDot > lastComma && lastComma >= 0) {
    normalized = cleaned.replace(/,/g, "");
  } else if (lastComma >= 0) {
    normalized = cleaned.replace(",", ".");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed) ? parsed : null;
}

function getNumber(
  holding: RawHolding,
  keys: string[],
  fallback = 0,
): number {
  for (const key of keys) {
    const value = holding[key];

    if (
      typeof value === "number" &&
      Number.isFinite(value)
    ) {
      return value;
    }

    if (typeof value === "string") {
      const parsed = parseNumericString(value);

      if (parsed !== null) {
        return parsed;
      }
    }
  }

  return fallback;
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value)
  );
}

function normaliseTicker(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeHolding(
  rawHolding: RawHolding,
): NormalizedHolding {
  const ticker = normaliseTicker(
    getString(
      rawHolding,
      ["ticker", "symbol", "code"],
      "UNKNOWN",
    ),
  );

  const name = getString(
    rawHolding,
    ["name", "fullName"],
    ticker,
  );

  const category = getString(
    rawHolding,
    ["category", "assetClass", "type"],
    "Investment",
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

  const value =
    suppliedValue > 0
      ? suppliedValue
      : units * price;

  const suppliedCostBasis = getNumber(
    rawHolding,
    [
      "costBasis",
      "invested",
      "investedCapital",
    ],
  );

  const costBasis =
    suppliedCostBasis > 0
      ? suppliedCostBasis
      : units * averagePrice;

  const dayChangePercent = getNumber(
    rawHolding,
    [
      "dayChangePercent",
      "dailyChangePercent",
      "changePercent",
      "todayPercent",
    ],
  );

  const previousClose =
    dayChangePercent !== 0
      ? price / (1 + dayChangePercent / 100)
      : null;

  const dayChangePerUnit =
    previousClose !== null
      ? price - previousClose
      : 0;

  const dayChangeValue =
    dayChangePerUnit * units;

  const totalReturn = value - costBasis;

  const totalReturnPercent =
    costBasis > 0
      ? (totalReturn / costBasis) * 100
      : 0;

  const investmentScore = getNumber(
    rawHolding,
    ["investmentScore", "score"],
    0,
  );

  const stance = getString(
    rawHolding,
    ["stance"],
    "Hold",
  ) as HoldingStance;

  const riskLevel = getString(
    rawHolding,
    ["riskLevel"],
    "Medium",
  ) as PortfolioHolding["riskLevel"];

  const summary = getString(
    rawHolding,
    ["summary"],
    "No investment summary is available yet.",
  );

  const thesis = getStringArray(rawHolding, [
    "thesis",
  ]);

  const catalysts = getStringArray(rawHolding, [
    "catalysts",
  ]);

  const risks = getStringArray(rawHolding, [
    "risks",
  ]);

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
    previousClose,

    costBasis,
    value,
    marketValue: value,

    dayChangePercent,
    dailyChangePercent: dayChangePercent,
    dayChangeValue,
    dayChangePerUnit,

    totalReturn,
    returnValue: totalReturn,
    profitLoss: totalReturn,
    totalReturnPercent,
    returnPercent: totalReturnPercent,

    investmentScore,
    stance,
    riskLevel,

    summary,
    thesis,
    catalysts,
    risks,

    marketDataSource: "static",
    marketDataUpdatedAt: null,

    open: null,
    high: null,
    low: null,
    volume: null,
  };
}

function createPriceMap(
  livePrices: LiveMarketPrice[],
): Map<string, LiveMarketPrice> {
  const priceMap = new Map<
    string,
    LiveMarketPrice
  >();

  for (const livePrice of livePrices) {
    if (
      !livePrice ||
      typeof livePrice.symbol !== "string"
    ) {
      continue;
    }

    const symbol = normaliseTicker(
      livePrice.symbol,
    );

    if (!symbol) {
      continue;
    }

    priceMap.set(symbol, livePrice);
  }

  return priceMap;
}

function mergeLivePrice(
  holding: NormalizedHolding,
  livePrice?: LiveMarketPrice,
): NormalizedHolding {
  if (
    !livePrice ||
    !isFiniteNumber(livePrice.priceEur) ||
    livePrice.priceEur <= 0
  ) {
    return holding;
  }

  const currentPrice = livePrice.priceEur;

  const previousClose =
    isFiniteNumber(livePrice.previousCloseEur) &&
    livePrice.previousCloseEur > 0
      ? livePrice.previousCloseEur
      : null;

  const suppliedChangePercent =
    isFiniteNumber(livePrice.changePercent)
      ? livePrice.changePercent
      : null;

  const calculatedChangePercent =
    previousClose !== null
      ? ((currentPrice - previousClose) /
          previousClose) *
        100
      : 0;

  const dayChangePercent =
    suppliedChangePercent ??
    calculatedChangePercent;

  const dayChangePerUnit =
    previousClose !== null
      ? currentPrice - previousClose
      : currentPrice *
        (dayChangePercent / 100);

  const marketValue =
    holding.units * currentPrice;

  const dayChangeValue =
    holding.units * dayChangePerUnit;

  const totalReturn =
    marketValue - holding.costBasis;

  const totalReturnPercent =
    holding.costBasis > 0
      ? (totalReturn / holding.costBasis) * 100
      : 0;

  return {
    ...holding,

    price: currentPrice,
    currentPrice,
    previousClose,

    value: marketValue,
    marketValue,

    dayChangePercent,
    dailyChangePercent: dayChangePercent,
    dayChangeValue,
    dayChangePerUnit,

    totalReturn,
    returnValue: totalReturn,
    profitLoss: totalReturn,
    totalReturnPercent,
    returnPercent: totalReturnPercent,

    marketDataSource: "eodhd",
    marketDataUpdatedAt:
      livePrice.updatedAt ?? null,

    open: isFiniteNumber(livePrice.open)
      ? livePrice.open
      : null,

    high: isFiniteNumber(livePrice.high)
      ? livePrice.high
      : null,

    low: isFiniteNumber(livePrice.low)
      ? livePrice.low
      : null,

    volume: isFiniteNumber(livePrice.volume)
      ? livePrice.volume
      : null,
  };
}

function determineSnapshotSource(
  calculatedHoldings: PortfolioHolding[],
): PortfolioSnapshot["marketDataSource"] {
  const liveCount = calculatedHoldings.filter(
    (holding) =>
      holding.marketDataSource === "eodhd",
  ).length;

  if (liveCount === 0) {
    return "static";
  }

  if (liveCount === calculatedHoldings.length) {
    return "eodhd";
  }

  return "mixed";
}

function determineUpdatedAt(
  calculatedHoldings: PortfolioHolding[],
  fallbackUpdatedAt?: string | null,
): string {
  const validMarketDates = calculatedHoldings
    .map((holding) => holding.marketDataUpdatedAt)
    .filter(
      (value): value is string =>
        typeof value === "string" &&
        !Number.isNaN(new Date(value).getTime()),
    )
    .map((value) => new Date(value));

  if (validMarketDates.length > 0) {
    return new Date(
      Math.max(
        ...validMarketDates.map(
          (date) => date.getTime(),
        ),
      ),
    ).toISOString();
  }

  if (
    fallbackUpdatedAt &&
    !Number.isNaN(
      new Date(fallbackUpdatedAt).getTime(),
    )
  ) {
    return new Date(
      fallbackUpdatedAt,
    ).toISOString();
  }

  return new Date().toISOString();
}

function buildPortfolioSnapshot(
  livePrices: LiveMarketPrice[] = [],
  generatedAt?: string | null,
): PortfolioSnapshot {
  const priceMap = createPriceMap(livePrices);

  const normalizedHoldings = (
    holdings as unknown as RawHolding[]
  ).map(normalizeHolding);

  const mergedHoldings = normalizedHoldings.map(
    (holding) =>
      mergeLivePrice(
        holding,
        priceMap.get(holding.ticker),
      ),
  );

  const totalValue = mergedHoldings.reduce(
    (total, holding) =>
      total + holding.marketValue,
    0,
  );

  const totalCostBasis = mergedHoldings.reduce(
    (total, holding) =>
      total + holding.costBasis,
    0,
  );

  const totalDayChange = mergedHoldings.reduce(
    (total, holding) =>
      total + holding.dayChangeValue,
    0,
  );

  const totalReturn =
    totalValue - totalCostBasis;

  /*
   * De huidige portefeuillewaarde bevat de dagbeweging al.
   * Daarom reconstrueren we eerst de portefeuillewaarde bij
   * het vorige slot voor een zuiver dagpercentage.
   */
  const previousPortfolioValue =
    totalValue - totalDayChange;

  const totalDayChangePercent =
    previousPortfolioValue > 0
      ? (totalDayChange /
          previousPortfolioValue) *
        100
      : 0;

  const totalReturnPercent =
    totalCostBasis > 0
      ? (totalReturn / totalCostBasis) * 100
      : 0;

  const calculatedHoldings: PortfolioHolding[] =
    mergedHoldings
      .map((holding) => {
        const weight =
          totalValue > 0
            ? (holding.marketValue /
                totalValue) *
              100
            : 0;

        return {
          ...holding,
          weight,
          weightPercent: weight,
          allocation: weight,
        };
      })
      .sort(
        (a, b) =>
          b.marketValue - a.marketValue,
      );

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

    updatedAt: determineUpdatedAt(
      calculatedHoldings,
      generatedAt,
    ),

    marketDataSource:
      determineSnapshotSource(
        calculatedHoldings,
      ),
  };
}

/**
 * Bestaande synchrone functie.
 *
 * Deze blijft bestaan zodat huidige pagina's niet breken.
 * Zolang er geen live prijzen worden meegegeven, gebruikt
 * deze de bestaande informatie uit holdings.ts.
 */
export function getPortfolioSnapshot(): PortfolioSnapshot {
  return buildPortfolioSnapshot();
}

/**
 * Nieuwe functie voor live marktdata.
 *
 * Geef hier de volledige response van /api/prices aan door.
 * Wanneer een individuele koers ontbreekt, valt alleen die
 * holding veilig terug op de statische informatie.
 */
export function getPortfolioSnapshotWithPrices(
  response: PricesApiResponse | null | undefined,
): PortfolioSnapshot {
  if (
    !response?.success ||
    !Array.isArray(response.prices)
  ) {
    return buildPortfolioSnapshot(
      [],
      response?.generatedAt,
    );
  }

  return buildPortfolioSnapshot(
    response.prices,
    response.generatedAt,
  );
}

/**
 * Bestaande synchrone lookup.
 * Blijft behouden voor achterwaartse compatibiliteit.
 */
export function getHoldingByTicker(
  ticker: string,
): PortfolioHolding | undefined {
  const normalizedTicker =
    normaliseTicker(ticker);

  return getPortfolioSnapshot().holdings.find(
    (holding) =>
      holding.ticker === normalizedTicker ||
      holding.symbol === normalizedTicker,
  );
}

/**
 * Nieuwe lookup die live EODHD-prijzen gebruikt.
 */
export function getHoldingByTickerWithPrices(
  ticker: string,
  response: PricesApiResponse | null | undefined,
): PortfolioHolding | undefined {
  const normalizedTicker =
    normaliseTicker(ticker);

  return getPortfolioSnapshotWithPrices(
    response,
  ).holdings.find(
    (holding) =>
      holding.ticker === normalizedTicker ||
      holding.symbol === normalizedTicker,
  );
}