"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowUpRight,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  PieChart,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";

import BottomNavigation from "@/components/home/BottomNav";
import {
  holdings as portfolioHoldings,
} from "@/lib/services/portfolio/holdings";

type Holding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: "EUR";
};

type MarketPrice = {
  symbol: string;
  eodhdSymbol: string;
  isin: string | null;
  name: string;

  originalCurrency: string;
  originalPrice: number;

  baseCurrency: "EUR";
  exchangeRateToEur: number | null;
  priceEur: number;

  previousCloseOriginal: number | null;
  previousCloseEur: number | null;

  change: number | null;
  changePercent: number | null;

  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;

  timestamp: number | null;
  updatedAt: string;
};

type PricesResponse = {
  success: boolean;
  baseCurrency?: "EUR";

  fxRates?: {
    EUR: number;
    USD_TO_EUR: number | null;
    GBP_TO_EUR: number | null;
    CHF_TO_EUR: number | null;
  };

  prices?: MarketPrice[];
  errors?: string[];

  requested?: number;
  received?: number;
  generatedAt?: string;
  error?: string;
};

type QuoteStatus = {
  success: boolean;
  changePercent: number;
  updatedAt: string;
  error?: string;
};

type CachedPrice = {
  symbol: string;
  price: number;
  changePercent: number;
  updatedAt: string;
};

const PRICE_CACHE_KEY =
  "investment-os-market-price-cache";

/**
 * Centrale bron voor de portefeuillesamenstelling.
 *
 * Aantallen, aankoopprijzen en fallbackkoersen komen
 * rechtstreeks uit holdings.ts. Hierdoor bestaat de
 * portefeuille niet meer dubbel in deze pagina.
 */
const canonicalHoldings: Holding[] =
  portfolioHoldings.map((holding) => ({
    id: holding.id,
    symbol: holding.symbol.trim().toUpperCase(),
    name: holding.name,
    quantity: holding.units,
    purchasePrice: holding.averagePrice,
    currentPrice: holding.currentPrice,
    currency: "EUR",
  }));

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Using portfolio fallback prices";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getHoldingValue(holding: Holding) {
  return holding.quantity * holding.currentPrice;
}

function getCostValue(holding: Holding) {
  return holding.quantity * holding.purchasePrice;
}

function getReturnValue(holding: Holding) {
  return (
    getHoldingValue(holding) -
    getCostValue(holding)
  );
}

function getReturnPercentage(holding: Holding) {
  const costValue = getCostValue(holding);

  if (costValue <= 0) {
    return 0;
  }

  return (
    (getReturnValue(holding) / costValue) *
    100
  );
}

function isValidCachedPrice(
  value: unknown,
): value is CachedPrice {
  if (!value || typeof value !== "object") {
    return false;
  }

  const price = value as Partial<CachedPrice>;

  return (
    typeof price.symbol === "string" &&
    typeof price.price === "number" &&
    Number.isFinite(price.price) &&
    price.price > 0 &&
    typeof price.changePercent === "number" &&
    Number.isFinite(price.changePercent) &&
    typeof price.updatedAt === "string"
  );
}

function loadCachedPrices(): CachedPrice[] {
  try {
    const cachedValue = localStorage.getItem(
      PRICE_CACHE_KEY,
    );

    if (!cachedValue) {
      return [];
    }

    const parsedValue = JSON.parse(cachedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue.filter(isValidCachedPrice);
  } catch (error) {
    console.error(
      "Could not load cached market prices:",
      error,
    );

    return [];
  }
}

function applyCachedPrices(
  holdings: Holding[],
  cachedPrices: CachedPrice[],
) {
  if (cachedPrices.length === 0) {
    return holdings;
  }

  const cacheMap = new Map(
    cachedPrices.map((cachedPrice) => [
      cachedPrice.symbol.trim().toUpperCase(),
      cachedPrice,
    ]),
  );

  return holdings.map((holding) => {
    const cachedPrice = cacheMap.get(
      holding.symbol,
    );

    if (!cachedPrice) {
      return holding;
    }

    return {
      ...holding,
      currentPrice: cachedPrice.price,
    };
  });
}

function createCachedPrices(
  prices: MarketPrice[],
): CachedPrice[] {
  return prices
    .filter(
      (price) =>
        typeof price.priceEur === "number" &&
        Number.isFinite(price.priceEur) &&
        price.priceEur > 0,
    )
    .map((price) => ({
      symbol: price.symbol.trim().toUpperCase(),
      price: price.priceEur,
      changePercent:
        typeof price.changePercent === "number" &&
        Number.isFinite(price.changePercent)
          ? price.changePercent
          : 0,
      updatedAt:
        price.updatedAt ||
        new Date().toISOString(),
    }));
}

export default function PortfolioPage() {
  const [holdings, setHoldings] =
    useState<Holding[]>(canonicalHoldings);

  const [quoteStatuses, setQuoteStatuses] =
    useState<Record<string, QuoteStatus>>({});

  const [isLoaded, setIsLoaded] =
    useState(false);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [lastUpdatedAt, setLastUpdatedAt] =
    useState<string | null>(null);

  const [
    marketDataMessage,
    setMarketDataMessage,
  ] = useState("");

  const refreshMarketData = useCallback(
    async () => {
      if (canonicalHoldings.length === 0) {
        setMarketDataMessage(
          "No holdings are available to refresh.",
        );
        return;
      }

      setIsRefreshing(true);

      try {
        const response = await fetch(
          "/api/prices",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const data =
          (await response.json()) as PricesResponse;

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              "The market data service returned an unsuccessful response.",
          );
        }

        const validPrices = (
          data.prices ?? []
        ).filter(
          (price) =>
            typeof price.priceEur === "number" &&
            Number.isFinite(price.priceEur) &&
            price.priceEur > 0,
        );

        const priceMap = new Map(
          validPrices.map((price) => [
            price.symbol.trim().toUpperCase(),
            price,
          ]),
        );

        const newStatuses: Record<
          string,
          QuoteStatus
        > = {};

        for (const holding of canonicalHoldings) {
          const livePrice = priceMap.get(
            holding.symbol,
          );

          if (livePrice) {
            newStatuses[holding.symbol] = {
              success: true,
              changePercent:
                typeof livePrice.changePercent ===
                  "number" &&
                Number.isFinite(
                  livePrice.changePercent,
                )
                  ? livePrice.changePercent
                  : 0,
              updatedAt:
                livePrice.updatedAt ||
                data.generatedAt ||
                new Date().toISOString(),
            };
          }
        }

        for (const error of data.errors ?? []) {
          const symbolMatch = error.match(
            /^([A-Z0-9]+)/,
          );

          if (!symbolMatch) {
            continue;
          }

          const symbol =
            symbolMatch[1].toUpperCase();

          if (!newStatuses[symbol]) {
            newStatuses[symbol] = {
              success: false,
              changePercent: 0,
              updatedAt:
                data.generatedAt ||
                new Date().toISOString(),
              error,
            };
          }
        }

        setQuoteStatuses(newStatuses);

        setHoldings(
          canonicalHoldings.map((holding) => {
            const livePrice = priceMap.get(
              holding.symbol,
            );

            if (!livePrice) {
              return holding;
            }

            return {
              ...holding,
              name:
                livePrice.name || holding.name,
              currentPrice: livePrice.priceEur,
            };
          }),
        );

        const cachedPrices =
          createCachedPrices(validPrices);

        if (cachedPrices.length > 0) {
          localStorage.setItem(
            PRICE_CACHE_KEY,
            JSON.stringify(cachedPrices),
          );
        }

        const newestUpdate =
          validPrices
            .map((price) => price.updatedAt)
            .filter(Boolean)
            .sort()
            .at(-1) ??
          data.generatedAt ??
          new Date().toISOString();

        setLastUpdatedAt(newestUpdate);

        const successfulCount =
          validPrices.length;

        const failedCount =
          data.errors?.length ?? 0;

        if (
          successfulCount > 0 &&
          failedCount > 0
        ) {
          setMarketDataMessage(
            `${successfulCount} live ${
              successfulCount === 1
                ? "price"
                : "prices"
            } updated. ${failedCount} ${
              failedCount === 1
                ? "holding is"
                : "holdings are"
            } using a fallback price.`,
          );
        } else if (successfulCount === 0) {
          setMarketDataMessage(
            "Live prices are unavailable. Portfolio fallback prices remain visible.",
          );
        } else {
          setMarketDataMessage(
            `All ${successfulCount} portfolio prices were updated through EODHD.`,
          );
        }
      } catch (error) {
        console.error(
          "Could not refresh market data:",
          error,
        );

        const cachedPrices =
          loadCachedPrices();

        if (cachedPrices.length > 0) {
          setHoldings(
            applyCachedPrices(
              canonicalHoldings,
              cachedPrices,
            ),
          );

          const cachedStatus: Record<
            string,
            QuoteStatus
          > = {};

          for (const cachedPrice of cachedPrices) {
            cachedStatus[
              cachedPrice.symbol
                .trim()
                .toUpperCase()
            ] = {
              success: false,
              changePercent:
                cachedPrice.changePercent,
              updatedAt:
                cachedPrice.updatedAt,
              error:
                "Live data is temporarily unavailable. A previously cached price is being shown.",
            };
          }

          setQuoteStatuses(cachedStatus);

          const latestCachedTime =
            cachedPrices
              .map(
                (cachedPrice) =>
                  cachedPrice.updatedAt,
              )
              .sort()
              .at(-1) ?? null;

          setLastUpdatedAt(
            latestCachedTime,
          );

          setMarketDataMessage(
            "Live prices are temporarily unavailable. The latest cached prices are being shown.",
          );
        } else {
          setHoldings(canonicalHoldings);
          setQuoteStatuses({});
          setLastUpdatedAt(null);

          setMarketDataMessage(
            error instanceof Error
              ? `Live prices are unavailable: ${error.message} Portfolio fallback prices are being shown.`
              : "Live prices are unavailable. Portfolio fallback prices are being shown.",
          );
        }
      } finally {
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    /*
     * Verwijder de oude dubbele portfolio-opslag.
     * Hiermee worden oude posities zoals PPFB en oude
     * aantallen niet opnieuw door de browser ingeladen.
     */
    localStorage.removeItem(
      "investment-os-portfolio",
    );

    const cachedPrices =
      loadCachedPrices();

    if (cachedPrices.length > 0) {
      setHoldings(
        applyCachedPrices(
          canonicalHoldings,
          cachedPrices,
        ),
      );

      const cachedStatus: Record<
        string,
        QuoteStatus
      > = {};

      for (const cachedPrice of cachedPrices) {
        cachedStatus[
          cachedPrice.symbol
            .trim()
            .toUpperCase()
        ] = {
          success: false,
          changePercent:
            cachedPrice.changePercent,
          updatedAt: cachedPrice.updatedAt,
          error:
            "A previously cached market price is being shown.",
        };
      }

      setQuoteStatuses(cachedStatus);

      const latestCachedTime =
        cachedPrices
          .map(
            (cachedPrice) =>
              cachedPrice.updatedAt,
          )
          .sort()
          .at(-1) ?? null;

      setLastUpdatedAt(latestCachedTime);
    } else {
      setHoldings(canonicalHoldings);
    }

    setIsLoaded(true);

    void refreshMarketData();
  }, [refreshMarketData]);

  const totalValue = useMemo(
    () =>
      holdings.reduce(
        (total, holding) =>
          total +
          getHoldingValue(holding),
        0,
      ),
    [holdings],
  );

  const totalCost = useMemo(
    () =>
      holdings.reduce(
        (total, holding) =>
          total + getCostValue(holding),
        0,
      ),
    [holdings],
  );

  const totalReturn =
    totalValue - totalCost;

  const totalReturnPercentage =
    totalCost > 0
      ? (totalReturn / totalCost) * 100
      : 0;

  const largestHolding = useMemo(() => {
    if (holdings.length === 0) {
      return null;
    }

    return [...holdings].sort(
      (a, b) =>
        getHoldingValue(b) -
        getHoldingValue(a),
    )[0];
  }, [holdings]);

  const liveQuoteCount =
    Object.values(quoteStatuses).filter(
      (status) => status.success,
    ).length;

  const cachedQuoteCount =
    Object.values(quoteStatuses).filter(
      (status) => !status.success,
    ).length;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="mx-auto max-w-[1180px] px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-10 sm:px-8 sm:pt-14">
        <section className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <BriefcaseBusiness className="h-4 w-4" />
              Portfolio overview
            </div>

            <h1 className="mt-5 text-[36px] font-bold leading-tight tracking-[-0.04em] text-slate-950 sm:text-[48px]">
              Your investments
            </h1>

            <p className="mt-3 max-w-[680px] text-base leading-7 text-slate-600">
              Track your holdings, portfolio
              allocation and investment performance
              in one place.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() =>
                void refreshMarketData()
              }
              disabled={
                isRefreshing ||
                holdings.length === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              {isRefreshing
                ? "Refreshing..."
                : "Refresh prices"}
            </button>

            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Upload className="h-4 w-4" />
              Update portfolio
            </Link>
          </div>
        </section>

        <section className="mt-6">
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:flex-row sm:items-center sm:px-5">
            <div className="flex items-start gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  liveQuoteCount > 0
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {liveQuoteCount > 0 ? (
                  <Wifi className="h-5 w-5" />
                ) : (
                  <WifiOff className="h-5 w-5" />
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-slate-950">
                  Market data
                </p>

                <p className="mt-1 text-sm leading-5 text-slate-500">
                  {marketDataMessage ||
                    "Checking available market prices..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock3 className="h-4 w-4" />
              {formatUpdatedAt(
                lastUpdatedAt,
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            icon={
              <CircleDollarSign className="h-5 w-5" />
            }
            iconClassName="bg-blue-50 text-blue-700"
            label="Total value"
            value={formatCurrency(totalValue)}
            loading={!isLoaded}
          />

          <SummaryCard
            icon={
              <BarChart3 className="h-5 w-5" />
            }
            iconClassName="bg-slate-100 text-slate-700"
            label="Invested capital"
            value={formatCurrency(totalCost)}
          />

          <SummaryCard
            icon={
              totalReturn >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )
            }
            iconClassName={
              totalReturn >= 0
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }
            label="Total return"
            value={`${totalReturn >= 0 ? "+" : ""}${formatCurrency(
              totalReturn,
            )}`}
            valueClassName={
              totalReturn >= 0
                ? "text-emerald-700"
                : "text-red-700"
            }
            subtitle={`${totalReturnPercentage >= 0 ? "+" : ""}${formatPercentage(
              totalReturnPercentage,
            )}`}
            subtitleClassName={
              totalReturn >= 0
                ? "text-emerald-600"
                : "text-red-600"
            }
          />

          <SummaryCard
            icon={
              <PieChart className="h-5 w-5" />
            }
            iconClassName="bg-violet-50 text-violet-700"
            label="Largest position"
            value={
              largestHolding?.symbol ?? "—"
            }
            subtitle={
              largestHolding &&
              totalValue > 0
                ? `${formatPercentage(
                    (getHoldingValue(
                      largestHolding,
                    ) /
                      totalValue) *
                      100,
                  )} of portfolio`
                : "0.0% of portfolio"
            }
          />
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-950">
                Holdings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {holdings.length} investments in
                your portfolio
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Central portfolio data
            </div>
          </div>

          <div className="hidden grid-cols-[0.7fr_1.55fr_1fr_0.85fr_1fr_0.9fr_0.75fr_0.3fr] gap-4 border-b border-slate-200 bg-slate-50 px-7 py-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:grid">
            <span>Symbol</span>
            <span>Investment</span>
            <span>Value</span>
            <span>Allocation</span>
            <span>Return</span>
            <span>Price</span>
            <span>Data</span>
            <span />
          </div>

          <div className="divide-y divide-slate-200">
            {holdings.map((holding) => {
              const holdingValue =
                getHoldingValue(holding);

              const returnValue =
                getReturnValue(holding);

              const returnPercentage =
                getReturnPercentage(holding);

              const allocation =
                totalValue > 0
                  ? (holdingValue /
                      totalValue) *
                    100
                  : 0;

              const quoteStatus =
                quoteStatuses[
                  holding.symbol
                ];

              return (
                <Link
                  key={holding.id}
                  href={`/holding/${holding.symbol}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[0.7fr_1.55fr_1fr_0.85fr_1fr_0.9fr_0.75fr_0.3fr] lg:items-center lg:px-7"
                >
                  <div>
                    <MobileLabel>
                      Symbol
                    </MobileLabel>

                    <div className="inline-flex rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white">
                      {holding.symbol}
                    </div>
                  </div>

                  <div>
                    <MobileLabel>
                      Investment
                    </MobileLabel>

                    <p className="font-bold text-slate-950">
                      {holding.name}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {holding.quantity.toLocaleString(
                        "en-GB",
                      )}{" "}
                      units
                    </p>
                  </div>

                  <div>
                    <MobileLabel>
                      Value
                    </MobileLabel>

                    <p className="font-bold text-slate-950">
                      {formatCurrency(
                        holdingValue,
                      )}
                    </p>
                  </div>

                  <div>
                    <MobileLabel>
                      Allocation
                    </MobileLabel>

                    <p className="font-bold text-slate-950">
                      {formatPercentage(
                        allocation,
                      )}
                    </p>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-950"
                        style={{
                          width: `${Math.min(
                            allocation,
                            100,
                          )}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <MobileLabel>
                      Return
                    </MobileLabel>

                    <p
                      className={`font-bold ${
                        returnValue >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {returnValue >= 0
                        ? "+"
                        : ""}
                      {formatCurrency(
                        returnValue,
                      )}
                    </p>

                    <p
                      className={`mt-1 text-xs font-bold ${
                        returnPercentage >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {returnPercentage >= 0
                        ? "+"
                        : ""}
                      {formatPercentage(
                        returnPercentage,
                      )}
                    </p>
                  </div>

                  <div>
                    <MobileLabel>
                      Current price
                    </MobileLabel>

                    <p className="font-bold text-slate-950">
                      {formatPrice(
                        holding.currentPrice,
                      )}
                    </p>

                    {quoteStatus ? (
                      <p
                        className={`mt-1 text-xs font-bold ${
                          quoteStatus.changePercent >=
                          0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {quoteStatus.changePercent >=
                        0
                          ? "+"
                          : ""}
                        {formatPercentage(
                          quoteStatus.changePercent,
                        )}{" "}
                        today
                      </p>
                    ) : null}
                  </div>

                  <div>
                    <MobileLabel>
                      Data source
                    </MobileLabel>

                    {quoteStatus?.success ? (
                      <StatusBadge
                        type="live"
                        label="Live"
                      />
                    ) : quoteStatus ? (
                      <StatusBadge
                        type="cached"
                        label="Cached"
                        title={
                          quoteStatus.error
                        }
                      />
                    ) : (
                      <StatusBadge
                        type="fallback"
                        label="Fallback"
                      />
                    )}
                  </div>

                  <div className="flex justify-end">
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-sm sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
              <TrendingUp className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em]">
              Portfolio health
            </h2>

            <p className="mt-3 max-w-[470px] text-sm leading-6 text-slate-300">
              Portfolio analysis uses the same
              holdings, quantities and purchase
              prices as the portfolio overview and
              holding-detail pages.
            </p>

            <Link
              href="/goals"
              className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white"
            >
              View goals
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </article>

          <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <Wifi className="h-6 w-6" />
            </div>

            <h2 className="mt-5 text-2xl font-bold tracking-[-0.03em] text-slate-950">
              Market data status
            </h2>

            <p className="mt-3 max-w-[470px] text-sm leading-6 text-slate-500">
              Investment OS uses the central EODHD
              endpoint when available. Cached or
              portfolio fallback prices keep the
              portfolio usable when the external API
              is temporarily unavailable.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {liveQuoteCount} live
              </span>

              <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700">
                {cachedQuoteCount} cached
              </span>
            </div>
          </article>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}

function SummaryCard({
  icon,
  iconClassName,
  label,
  value,
  subtitle,
  valueClassName = "text-slate-950",
  subtitleClassName = "text-slate-500",
  loading = false,
}: {
  icon: React.ReactNode;
  iconClassName: string;
  label: string;
  value: string;
  subtitle?: string;
  valueClassName?: string;
  subtitleClassName?: string;
  loading?: boolean;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClassName}`}
        >
          {icon}
        </div>

        {loading ? (
          <RefreshCw className="h-4 w-4 animate-spin text-slate-300" />
        ) : null}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p
        className={`mt-1 text-2xl font-bold tracking-[-0.03em] ${valueClassName}`}
      >
        {value}
      </p>

      {subtitle ? (
        <p
          className={`mt-1 text-xs font-bold ${subtitleClassName}`}
        >
          {subtitle}
        </p>
      ) : null}
    </article>
  );
}

function MobileLabel({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
      {children}
    </span>
  );
}

function StatusBadge({
  type,
  label,
  title,
}: {
  type: "live" | "cached" | "fallback";
  label: string;
  title?: string;
}) {
  if (type === "live") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        {label}
      </div>
    );
  }

  if (type === "cached") {
    return (
      <div
        title={title}
        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700"
      >
        <AlertCircle className="h-3.5 w-3.5" />
        {label}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">
      <Clock3 className="h-3.5 w-3.5" />
      {label}
    </div>
  );
}