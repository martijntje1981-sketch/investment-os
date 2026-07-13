"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Plus,
  RefreshCw,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

type Holding = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: "EUR" | "USD" | "GBP";
  confidence?: "High" | "Medium" | "Low";
};

type MarketQuote = {
  symbol: string;
  providerSymbol: string;
  exchange: string;
  name: string;
  price: number;
  previousClose: number;
  changePercent: number;
  currency: string;
  updatedAt: string;
  success: boolean;
  error?: string;
};

type QuotesResponse = {
  success: boolean;
  requested: number;
  received: number;
  updatedAt: string;
  quotes: MarketQuote[];
  error?: string;
};

type QuoteStatus = {
  success: boolean;
  changePercent: number;
  updatedAt: string;
  error?: string;
};

const fallbackHoldings: Holding[] = [
  {
    id: 1,
    symbol: "IB1T",
    name: "iShares Bitcoin ETP",
    quantity: 11269,
    purchasePrice: 5.16,
    currentPrice: 5.16,
    currency: "EUR",
  },
  {
    id: 2,
    symbol: "STRC",
    name: "21Shares Strategy Yield ETP",
    quantity: 450,
    purchasePrice: 15.56,
    currentPrice: 15.56,
    currency: "EUR",
  },
  {
    id: 3,
    symbol: "VWCE",
    name: "Vanguard FTSE All-World ETF",
    quantity: 99,
    purchasePrice: 87.88,
    currentPrice: 87.88,
    currency: "EUR",
  },
  {
    id: 4,
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies ETF",
    quantity: 161,
    purchasePrice: 46.58,
    currentPrice: 46.58,
    currency: "EUR",
  },
  {
    id: 5,
    symbol: "AIFS",
    name: "AI Infrastructure ETF",
    quantity: 520,
    purchasePrice: 10.19,
    currentPrice: 10.19,
    currency: "EUR",
  },
  {
    id: 6,
    symbol: "PPFB",
    name: "iShares Physical Gold ETC",
    quantity: 200,
    purchasePrice: 10,
    currentPrice: 10,
    currency: "EUR",
  },
];

function formatCurrency(
  value: number,
  currency: Holding["currency"] = "EUR"
) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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
    return "Not refreshed yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

  return new Intl.DateTimeFormat("en-GB", {
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
  return getHoldingValue(holding) - getCostValue(holding);
}

function getReturnPercentage(holding: Holding) {
  const costValue = getCostValue(holding);

  if (costValue === 0) {
    return 0;
  }

  return (getReturnValue(holding) / costValue) * 100;
}

export default function PortfolioPage() {
  const [holdings, setHoldings] =
    useState<Holding[]>(fallbackHoldings);

  const [quoteStatuses, setQuoteStatuses] = useState<
    Record<string, QuoteStatus>
  >({});

  const [isLoaded, setIsLoaded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(
    null
  );
  const [marketDataMessage, setMarketDataMessage] = useState("");

  const refreshMarketData = useCallback(
    async (portfolio: Holding[]) => {
      if (portfolio.length === 0) {
        return;
      }

      setIsRefreshing(true);
      setMarketDataMessage("");

      try {
        const symbols = Array.from(
          new Set(
            portfolio
              .map((holding) => holding.symbol.trim().toUpperCase())
              .filter(Boolean)
          )
        );

        const response = await fetch(
          `/api/quotes?symbols=${encodeURIComponent(
            symbols.join(",")
          )}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = (await response.json()) as QuotesResponse;

        const newStatuses: Record<string, QuoteStatus> = {};

        for (const quote of data.quotes ?? []) {
          newStatuses[quote.symbol] = {
            success: quote.success,
            changePercent: quote.changePercent,
            updatedAt: quote.updatedAt,
            error: quote.error,
          };
        }

        setQuoteStatuses(newStatuses);

        const successfulQuotes = (data.quotes ?? []).filter(
          (quote) => quote.success && quote.price > 0
        );

        if (successfulQuotes.length > 0) {
          setHoldings((currentHoldings) => {
            const updatedHoldings = currentHoldings.map((holding) => {
              const quote = successfulQuotes.find(
                (item) =>
                  item.symbol.toUpperCase() ===
                  holding.symbol.toUpperCase()
              );

              if (!quote) {
                return holding;
              }

              const supportedCurrency =
                quote.currency === "EUR" ||
                quote.currency === "USD" ||
                quote.currency === "GBP"
                  ? quote.currency
                  : holding.currency;

              return {
                ...holding,
                currentPrice: quote.price,
                currency: supportedCurrency,
              };
            });

            localStorage.setItem(
              "investment-os-portfolio",
              JSON.stringify(updatedHoldings)
            );

            return updatedHoldings;
          });
        }

        setLastUpdatedAt(data.updatedAt ?? new Date().toISOString());

        const failedQuotes = (data.quotes ?? []).filter(
          (quote) => !quote.success
        );

        if (
          successfulQuotes.length > 0 &&
          failedQuotes.length > 0
        ) {
          setMarketDataMessage(
            `${successfulQuotes.length} live ${
              successfulQuotes.length === 1 ? "price" : "prices"
            } updated. ${failedQuotes.length} ${
              failedQuotes.length === 1 ? "holding is" : "holdings are"
            } using the last saved price.`
          );
        } else if (
          successfulQuotes.length === 0 &&
          failedQuotes.length > 0
        ) {
          setMarketDataMessage(
            "Live prices are unavailable for these holdings on the current data plan. Your saved prices remain unchanged."
          );
        } else {
          setMarketDataMessage(
            "All available market prices were updated."
          );
        }
      } catch (error) {
        console.error("Could not refresh market data:", error);

        setMarketDataMessage(
          "Market data could not be refreshed. Your saved portfolio prices remain available."
        );
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    let portfolioToLoad = fallbackHoldings;

    try {
      const savedPortfolio = localStorage.getItem(
        "investment-os-portfolio"
      );

      if (savedPortfolio) {
        const parsedPortfolio = JSON.parse(
          savedPortfolio
        ) as Holding[];

        if (
          Array.isArray(parsedPortfolio) &&
          parsedPortfolio.length > 0
        ) {
          portfolioToLoad = parsedPortfolio;
        }
      }
    } catch (error) {
      console.error("Could not load saved portfolio:", error);
    }

    setHoldings(portfolioToLoad);
    setIsLoaded(true);

    void refreshMarketData(portfolioToLoad);
  }, [refreshMarketData]);

  const totalValue = useMemo(() => {
    return holdings.reduce(
      (total, holding) => total + getHoldingValue(holding),
      0
    );
  }, [holdings]);

  const totalCost = useMemo(() => {
    return holdings.reduce(
      (total, holding) => total + getCostValue(holding),
      0
    );
  }, [holdings]);

  const totalReturn = totalValue - totalCost;

  const totalReturnPercentage =
    totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;

  const largestHolding = useMemo(() => {
    if (holdings.length === 0) {
      return null;
    }

    return [...holdings].sort(
      (a, b) => getHoldingValue(b) - getHoldingValue(a)
    )[0];
  }, [holdings]);

  const liveQuoteCount = Object.values(quoteStatuses).filter(
    (status) => status.success
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
              Track your holdings, portfolio allocation and investment
              performance in one place.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => void refreshMarketData(holdings)}
              disabled={isRefreshing || holdings.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              {isRefreshing ? "Refreshing..." : "Refresh prices"}
            </button>

            <Link
              href="/upload"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:bg-slate-50"
            >
              <Upload className="h-4 w-4" />
              Replace portfolio
            </Link>

            <Link
              href="/upload/review"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              Edit holdings
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
                    "Checking available live prices..."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Clock3 className="h-4 w-4" />
              {formatUpdatedAt(lastUpdatedAt)}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                <CircleDollarSign className="h-5 w-5" />
              </div>

              {!isLoaded && (
                <RefreshCw className="h-4 w-4 animate-spin text-slate-300" />
              )}
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              Total value
            </p>

            <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {formatCurrency(totalValue)}
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <BarChart3 className="h-5 w-5" />
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              Invested capital
            </p>

            <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {formatCurrency(totalCost)}
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
                totalReturn >= 0
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-red-50 text-red-700"
              }`}
            >
              {totalReturn >= 0 ? (
                <TrendingUp className="h-5 w-5" />
              ) : (
                <TrendingDown className="h-5 w-5" />
              )}
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              Total return
            </p>

            <p
              className={`mt-1 text-2xl font-bold tracking-[-0.03em] ${
                totalReturn >= 0
                  ? "text-emerald-700"
                  : "text-red-700"
              }`}
            >
              {totalReturn >= 0 ? "+" : ""}
              {formatCurrency(totalReturn)}
            </p>

            <p
              className={`mt-1 text-xs font-bold ${
                totalReturn >= 0
                  ? "text-emerald-600"
                  : "text-red-600"
              }`}
            >
              {totalReturnPercentage >= 0 ? "+" : ""}
              {formatPercentage(totalReturnPercentage)}
            </p>
          </article>

          <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
              <PieChart className="h-5 w-5" />
            </div>

            <p className="mt-5 text-sm font-semibold text-slate-500">
              Largest position
            </p>

            <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
              {largestHolding?.symbol ?? "—"}
            </p>

            <p className="mt-1 text-xs font-semibold text-slate-500">
              {largestHolding && totalValue > 0
                ? formatPercentage(
                    (getHoldingValue(largestHolding) / totalValue) *
                      100
                  )
                : "0.0%"}{" "}
              of portfolio
            </p>
          </article>
        </section>

        <section className="mt-8 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:px-7">
            <div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-950">
                Holdings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {holdings.length} investments in your portfolio
              </p>
            </div>

            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
              <ShieldCheck className="h-4 w-4" />
              Saved locally
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
              const holdingValue = getHoldingValue(holding);
              const returnValue = getReturnValue(holding);
              const returnPercentage =
                getReturnPercentage(holding);

              const allocation =
                totalValue > 0
                  ? (holdingValue / totalValue) * 100
                  : 0;

              const quoteStatus =
                quoteStatuses[holding.symbol.toUpperCase()];

              return (
                <Link
                  key={holding.id}
                  href={`/portfolio/${holding.symbol.toLowerCase()}`}
                  className="grid gap-4 px-5 py-5 transition hover:bg-slate-50 lg:grid-cols-[0.7fr_1.55fr_1fr_0.85fr_1fr_0.9fr_0.75fr_0.3fr] lg:items-center lg:px-7"
                >
                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Symbol
                    </span>

                    <div className="inline-flex rounded-xl bg-slate-950 px-3 py-2 text-sm font-bold text-white">
                      {holding.symbol}
                    </div>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Investment
                    </span>

                    <p className="font-bold text-slate-950">
                      {holding.name || holding.symbol}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {holding.quantity.toLocaleString("en-GB")}{" "}
                      units
                    </p>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Value
                    </span>

                    <p className="font-bold text-slate-950">
                      {formatCurrency(
                        holdingValue,
                        holding.currency
                      )}
                    </p>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Allocation
                    </span>

                    <p className="font-bold text-slate-950">
                      {formatPercentage(allocation)}
                    </p>

                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-slate-950"
                        style={{
                          width: `${Math.min(allocation, 100)}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Return
                    </span>

                    <p
                      className={`font-bold ${
                        returnValue >= 0
                          ? "text-emerald-700"
                          : "text-red-700"
                      }`}
                    >
                      {returnValue >= 0 ? "+" : ""}
                      {formatCurrency(
                        returnValue,
                        holding.currency
                      )}
                    </p>

                    <p
                      className={`mt-1 text-xs font-bold ${
                        returnPercentage >= 0
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {returnPercentage >= 0 ? "+" : ""}
                      {formatPercentage(returnPercentage)}
                    </p>
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Current price
                    </span>

                    <p className="font-bold text-slate-950">
                      {formatCurrency(
                        holding.currentPrice,
                        holding.currency
                      )}
                    </p>

                    {quoteStatus?.success && (
                      <p
                        className={`mt-1 text-xs font-bold ${
                          quoteStatus.changePercent >= 0
                            ? "text-emerald-600"
                            : "text-red-600"
                        }`}
                      >
                        {quoteStatus.changePercent >= 0 ? "+" : ""}
                        {formatPercentage(
                          quoteStatus.changePercent
                        )}{" "}
                        today
                      </p>
                    )}
                  </div>

                  <div>
                    <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-400 lg:hidden">
                      Data source
                    </span>

                    {quoteStatus?.success ? (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Live
                      </div>
                    ) : quoteStatus ? (
                      <div
                        title={quoteStatus.error}
                        className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1.5 text-xs font-bold text-amber-700"
                      >
                        <AlertCircle className="h-3.5 w-3.5" />
                        Saved
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        Checking
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <ChevronRight className="h-5 w-5 text-slate-300" />
                  </div>
                </Link>
              );
            })}
          </div>

          {holdings.length === 0 && (
            <div className="px-6 py-16 text-center">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />

              <h3 className="mt-4 font-bold text-slate-900">
                Your portfolio is empty
              </h3>

              <p className="mt-2 text-sm text-slate-500">
                Upload a screenshot to add your first investments.
              </p>

              <Link
                href="/upload"
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                <Upload className="h-4 w-4" />
                Upload portfolio
              </Link>
            </div>
          )}
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
              The next intelligence layer will analyse concentration,
              diversification and portfolio risk against your financial
              goals.
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
              Flexible market data
            </h2>

            <p className="mt-3 max-w-[470px] text-sm leading-6 text-slate-500">
              Investment OS now uses one central quote API. We can later
              replace or combine data providers without rebuilding the
              portfolio experience.
            </p>

            <div className="mt-6 inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
              Data layer active
            </div>
          </article>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}