"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import BottomNav from "@/components/home/BottomNav";
import { AppPageLoading } from "@/components/layout/PageContainer";
import {
  computeHoldingDayMove,
  resolveHoldingChangePercent,
} from "@/lib/client/dailyPerformance";
import {
  buildHoldingValuation,
  getHoldingCostBasis,
  isEstimatedHoldingPrice,
  resolveHoldingDisplayPrice,
} from "@/lib/client/holdingValuation";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

const euro = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const euroTwo = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatUpdateTime(value: string | null | undefined) {
  if (!value) {
    return "Not available";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getPerformanceClass(value: number) {
  if (value > 0) {
    return "text-emerald-400";
  }

  if (value < 0) {
    return "text-red-400";
  }

  return "text-slate-300";
}

function getMetricPerformanceClass(value: number) {
  if (value > 0) {
    return "text-emerald-600";
  }

  if (value < 0) {
    return "text-red-600";
  }

  return "text-slate-900";
}

function priceQualityLabel(
  source: ReturnType<typeof resolveHoldingDisplayPrice>["source"],
  isStale: boolean,
) {
  if (source === "unavailable") {
    return "Price unavailable";
  }

  if (source === "estimated") {
    return "Estimated price";
  }

  if (isStale) {
    return "Stale price";
  }

  return "Live price";
}

export default function HoldingPage() {
  const router = useRouter();
  const params = useParams<{ ticker: string }>();
  const { holdings, portfolioReady } = useUserPortfolio();

  const ticker = decodeURIComponent(params.ticker ?? "").trim().toUpperCase();

  const holding = useMemo(
    () =>
      holdings.find(
        (item) => item.symbol.trim().toUpperCase() === ticker,
      ),
    [holdings, ticker],
  );

  const valuation = useMemo(() => {
    if (!holding) {
      return null;
    }

    return buildHoldingValuation(holding, holdings);
  }, [holding, holdings]);

  if (!portfolioReady) {
    return <AppPageLoading />;
  }

  if (!holding || !valuation) {
    return (
      <>
        <main className="min-h-screen bg-slate-100 px-6 pb-32 pt-20">
          <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
            <h1 className="text-3xl font-bold text-slate-900">Holding not found</h1>
            <p className="mt-3 text-slate-600">
              {ticker || "This investment"} is not in your saved portfolio.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700"
              >
                Go back
              </button>
              <Link
                href="/portfolio"
                className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                Open portfolio
              </Link>
            </div>
          </div>
        </main>
        <BottomNav />
      </>
    );
  }

  const displayPrice = valuation.displayPrice;
  const estimatedPrice = isEstimatedHoldingPrice(holding);
  const dailyChangePercent = resolveHoldingChangePercent(holding);
  const dayChangeValue =
    valuation.marketValue !== null && dailyChangePercent !== null
      ? computeHoldingDayMove(holding, valuation.marketValue)
      : null;
  const priceLabel = priceQualityLabel(
    displayPrice.source,
    holding.priceDataStatus === "stale",
  );
  const resolvedPrice = displayPrice.price;
  const marketValueLabel =
    valuation.marketValue === null
      ? "Price pending"
      : euro.format(valuation.marketValue);
  const weightLabel =
    valuation.portfolioWeightPercent === null
      ? "—"
      : `${valuation.portfolioWeightPercent.toFixed(1)}%`;
  const returnPercentLabel =
    valuation.returnPercent === null
      ? "Price pending"
      : signedPercent(valuation.returnPercent);
  const returnValueLabel =
    valuation.returnValue === null
      ? "Price pending"
      : `${valuation.returnValue >= 0 ? "+" : ""}${euro.format(valuation.returnValue)}`;
  const dayChangeLabel =
    dailyChangePercent === null
      ? "Awaiting data"
      : signedPercent(dailyChangePercent);
  const dayChangeValueLabel =
    dayChangeValue === null
      ? "Awaiting data"
      : `${dayChangeValue >= 0 ? "+" : ""}${euro.format(dayChangeValue)}`;

  return (
    <>
      <main className="min-h-screen bg-slate-100 pb-32 pt-20">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <section className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {holding.assetType === "cash" ? "Cash" : "Investment"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      displayPrice.source === "unavailable"
                        ? "bg-amber-500/20 text-amber-300"
                        : estimatedPrice || holding.priceDataStatus === "stale"
                          ? "bg-amber-500/20 text-amber-300"
                          : "bg-emerald-500/20 text-emerald-300"
                    }`}
                  >
                    {priceLabel}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
                  {holding.symbol}
                </h1>

                <p className="mt-2 text-lg text-slate-300">{holding.name}</p>

                <p className="mt-4 text-sm text-slate-400">
                  Last market update:{" "}
                  <span className="font-medium text-slate-200">
                    {formatUpdateTime(
                      holding.marketPriceUpdatedAt ?? holding.updatedAt,
                    )}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 lg:text-right">
                <div>
                  <p className="text-sm text-slate-400">Current Price</p>

                  <p className="mt-2 text-3xl font-bold">
                    {resolvedPrice !== null
                      ? euroTwo.format(resolvedPrice)
                      : "Unavailable"}
                  </p>

                  {estimatedPrice ? (
                    <p className="mt-1 text-sm font-semibold text-amber-300">
                      Estimated price
                    </p>
                  ) : null}

                  <p
                    className={`mt-1 font-semibold ${
                      dailyChangePercent === null
                        ? "text-slate-400"
                        : getPerformanceClass(dailyChangePercent)
                    }`}
                  >
                    {dayChangeLabel} today
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">Units</p>

                  <p className="mt-2 text-3xl font-bold">
                    {holding.quantity.toLocaleString("en-GB")}
                  </p>

                  <p className="mt-1 font-semibold text-blue-400">
                    {holding.currency}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Position Value"
              value={marketValueLabel}
              subtitle={
                estimatedPrice && valuation.marketValue !== null
                  ? "Estimated market value"
                  : "Current market value"
              }
            />

            <MetricCard
              label="Portfolio Weight"
              value={weightLabel}
              subtitle="Share of total portfolio"
            />

            <MetricCard
              label="Total Return"
              value={returnPercentLabel}
              subtitle={returnValueLabel}
              valueClassName={
                valuation.returnPercent === null
                  ? "text-slate-900"
                  : getMetricPerformanceClass(valuation.returnPercent)
              }
            />

            <MetricCard
              label="Day Change"
              value={dayChangeLabel}
              subtitle={dayChangeValueLabel}
              valueClassName={
                dailyChangePercent === null
                  ? "text-slate-900"
                  : getMetricPerformanceClass(dailyChangePercent)
              }
            />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Investment OS Analysis
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Position Summary
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                This holding is valued with the same centralized price pipeline
                as your portfolio overview, dashboard and analysis pages.
              </p>

              <div className="relative mt-8 h-64 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 to-white">
                <p className="absolute bottom-4 left-5 text-xs text-slate-400">
                  Price history appears when sufficient market data is available
                </p>
              </div>
            </article>

            <article className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Position Data
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Key Metrics
              </h2>

              <div className="mt-6 divide-y divide-slate-100">
                <DataRow
                  label="Units"
                  value={holding.quantity.toLocaleString("en-GB")}
                />

                <DataRow
                  label="Average price"
                  value={euroTwo.format(holding.purchasePrice)}
                />

                <DataRow
                  label="Current price"
                  value={
                    resolvedPrice !== null
                      ? `${euroTwo.format(resolvedPrice)}${estimatedPrice ? " (estimated)" : ""}`
                      : "Unavailable"
                  }
                />

                <DataRow
                  label="Previous close"
                  value={
                    holding.previousClose != null && holding.previousClose > 0
                      ? euroTwo.format(holding.previousClose)
                      : "Not available"
                  }
                />

                <DataRow
                  label="Cost basis"
                  value={euro.format(getHoldingCostBasis(holding))}
                />

                <DataRow label="Market value" value={marketValueLabel} />

                <DataRow label="Portfolio weight" value={weightLabel} />

                {holding.pricingExchange && holding.providerSymbol ? (
                  <DataRow
                    label="Pricing source"
                    value={`${holding.providerSymbol} · ${holding.pricingExchange}`}
                  />
                ) : null}
              </div>
            </article>
          </section>

          <section className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 shadow-sm"
            >
              Back
            </button>
            <Link
              href="/portfolio"
              className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-sm"
            >
              Open portfolio
            </Link>
          </section>
        </div>
      </main>

      <BottomNav />
    </>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: string;
  subtitle: string;
  valueClassName?: string;
}) {
  return (
    <article className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>

      <p className={`mt-3 text-3xl font-bold ${valueClassName}`}>{value}</p>

      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </article>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm font-medium text-slate-500">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}
