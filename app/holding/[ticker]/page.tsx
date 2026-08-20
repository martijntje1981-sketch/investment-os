"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams, useRouter } from "next/navigation";

import { HoldingFixedIncomeCard } from "@/components/holding/HoldingFixedIncomeCard";
import { HoldingMoveContextCard } from "@/components/holding/HoldingMoveContextCard";
import { HoldingPositionHistory } from "@/components/holding/HoldingPositionHistory";
import { AppPageLoading } from "@/components/layout/PageContainer";
import { appHeroShellClass } from "@/components/layout/appSurface";
import {
  computeHoldingDayMove,
  resolveHoldingChangePercent,
} from "@/lib/client/dailyPerformance";
import { resolveHoldingMovePeriod } from "@/lib/client/performancePeriod";
import {
  buildHoldingValuation,
  getHoldingCostBasis,
  resolveHoldingDisplayPrice,
} from "@/lib/client/holdingValuation";
import { holdingPricePeriodCaption, holdingPriceStatusUserLabel, holdingPriceTrustBadgeLabel } from "@/lib/client/holdingDisplayPrice";
import { formatSmartPrice } from "@/lib/client/smartPriceFormat";
import { usePortfolioNews } from "@/lib/client/usePortfolioNews";
import { useProductAccess } from "@/lib/client/useProductAccess";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  buildHoldingIntelligenceCandidates,
  findHoldingIntelligenceCandidate,
  selectHoldingPageNewsItems,
} from "@/lib/services/holdingIntelligence";
import { formatAllocationPercent } from "@/lib/services/classification";
import { DASHBOARD_DEEP_LINKS } from "@/lib/navigation/deepLinks";

const euro = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatUnitPrice(value: number): string {
  return formatSmartPrice(value, "EUR");
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
) {
  return holdingPriceStatusUserLabel(source);
}

export default function HoldingPage() {
  const router = useRouter();
  const params = useParams<{ ticker: string }>();
  const { holdings, portfolioReady, syncState, userSub } = useUserPortfolio();
  const news = usePortfolioNews(holdings, userSub, portfolioReady);
  const productAccess = useProductAccess(portfolioReady && Boolean(userSub));

  const rawTicker = params.ticker ?? "";
  const ticker = (() => {
    try {
      return decodeURIComponent(rawTicker).trim().toUpperCase();
    } catch {
      return String(rawTicker).trim().toUpperCase();
    }
  })();

  const holding = useMemo(
    () => holdings.find((item) => item.symbol.trim().toUpperCase() === ticker),
    [holdings, ticker],
  );

  const candidates = useMemo(
    () =>
      buildHoldingIntelligenceCandidates({
        holdings,
        newsItems: [
          ...news.payload.portfolioNews,
          ...news.payload.macroNews,
        ],
      }),
    [holdings, news.payload.macroNews, news.payload.portfolioNews],
  );

  const moveContext = useMemo(
    () => findHoldingIntelligenceCandidate(candidates, ticker),
    [candidates, ticker],
  );

  const relatedNews = useMemo(() => {
    if (!holding) return [];
    return selectHoldingPageNewsItems(
      [...news.payload.portfolioNews, ...news.payload.macroNews],
      holding,
      { isBitcoin: moveContext?.isBitcoin },
    );
  }, [
    holding,
    moveContext?.isBitcoin,
    news.payload.macroNews,
    news.payload.portfolioNews,
  ]);

  const valuation = useMemo(() => {
    if (!holding) {
      return null;
    }

    return buildHoldingValuation(holding, holdings);
  }, [holding, holdings]);

  // Wait for hydrate/sync so mover clicks never flash "not found" / bounce to login.
  if (!portfolioReady || syncState.status === "loading") {
    return <AppPageLoading />;
  }

  if (!holding || !valuation) {
    return (
      <main className="min-h-screen bg-slate-100 px-6 pb-32 pt-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-10 text-center shadow-sm">
          <h1 className="text-3xl font-bold text-slate-900">
            Holding not found
          </h1>
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
    );
  }

  const displayPrice = valuation.displayPrice;
  const dailyChangePercent = resolveHoldingChangePercent(holding);
  const dayChangeValue =
    valuation.marketValue !== null && dailyChangePercent !== null
      ? computeHoldingDayMove(holding, valuation.marketValue)
      : null;
  const priceLabel = priceQualityLabel(displayPrice.source);
  const resolvedPrice = displayPrice.price;
  const marketValueLabel =
    valuation.marketValue === null
      ? "Price pending"
      : euro.format(valuation.marketValue);
  const weightLabel =
    valuation.portfolioWeightPercent === null
      ? "—"
      : formatAllocationPercent(valuation.portfolioWeightPercent);
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
  const movePeriod = resolveHoldingMovePeriod(holding);
  const pricePeriodCaption = holdingPricePeriodCaption(
    displayPrice.source,
    movePeriod.primaryLabel,
  );

  return (
    <>
      <main className="min-h-screen bg-slate-100 pb-32 pt-20">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <section className={`${appHeroShellClass} p-7 md:p-10`}>
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-[13px] font-semibold uppercase tracking-wider text-white/90">
                    {holding.assetType === "cash" ? "Cash" : "Investment"}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-[13px] font-bold ${
                      displayPrice.source === "unavailable"
                        ? "bg-amber-500/20 text-amber-300"
                        : displayPrice.source === "estimated" ||
                            displayPrice.source === "delayed"
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

                <p className="mt-2 text-lg text-white/90">{holding.name}</p>
                {holding.assetType === "cash" ? (
                  <Link
                    href={DASHBOARD_DEEP_LINKS.cashIntelligence}
                    className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-cyan-200 underline-offset-2 hover:underline"
                  >
                    Understand your cash →
                  </Link>
                ) : null}

                <p className="mt-4 text-[15px] text-white/90">
                  Last market update:{" "}
                  <span className="font-medium text-white">
                    {formatUpdateTime(
                      holding.marketPriceUpdatedAt ?? holding.updatedAt,
                    )}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 lg:text-right">
                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-white/90">Current Price</p>

                  <p className="mt-2 text-3xl font-bold">
                    {resolvedPrice !== null
                      ? formatUnitPrice(resolvedPrice)
                      : "Unavailable"}
                  </p>

                  {holdingPriceTrustBadgeLabel(displayPrice.source) ? (
                    <p className="mt-1 text-sm font-semibold text-amber-300">
                      {holdingPriceTrustBadgeLabel(displayPrice.source)}
                    </p>
                  ) : displayPrice.source === "last_session" ? (
                    <p className="mt-1 text-sm font-semibold text-white/90">
                      Last session
                    </p>
                  ) : null}

                  <p
                    className={`mt-1 font-semibold ${
                      dailyChangePercent === null
                        ? "text-white/90"
                        : getPerformanceClass(dailyChangePercent)
                    }`}
                    title={movePeriod.accessibleDescription}
                  >
                    {dailyChangePercent === null || !pricePeriodCaption
                      ? dayChangeLabel
                      : `${dayChangeLabel} · ${pricePeriodCaption}`}
                  </p>
                </div>

                <div>
                  <p className="text-[13px] font-semibold uppercase tracking-[0.06em] text-white/90">Units</p>

                  <p className="mt-2 text-3xl font-bold">
                    {holding.quantity.toLocaleString("en-GB")}
                  </p>

                  <p className="mt-1 font-semibold text-sky-200">
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
                displayPrice.source === "estimated" && valuation.marketValue !== null
                  ? "Estimated market value"
                  : displayPrice.source === "last_session"
                    ? "Last-session market value"
                    : displayPrice.source === "delayed"
                      ? "Delayed market value"
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

          <div className="mt-6">
            <HoldingMoveContextCard
              candidate={moveContext}
              relatedNews={relatedNews}
              newsLoading={news.isLoading}
              intelligenceDepth={productAccess.intelligenceDepth}
            />
            <HoldingFixedIncomeCard
              holding={holding}
              relatedNews={relatedNews}
              intelligenceDepth={productAccess.intelligenceDepth}
              weightPercent={valuation.portfolioWeightPercent}
              marketValue={valuation.marketValue}
              changePercent={dailyChangePercent}
              contributionPp={moveContext?.contributionPp ?? null}
            />
          </div>

          <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
            <article className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">
                Tobailey Analysis
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Position Summary
              </h2>

              <p className="mt-4 text-lg leading-8 text-slate-600">
                This holding is valued with the same centralized price pipeline
                as your portfolio overview, dashboard and analysis pages.
              </p>

              <HoldingPositionHistory
                symbol={holding.symbol}
                providerSymbol={holding.providerSymbol}
              />
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
                  value={formatUnitPrice(holding.purchasePrice)}
                />

                <DataRow
                  label="Current price"
                  value={
                    resolvedPrice !== null
                      ? `${formatUnitPrice(resolvedPrice)}${
                          displayPrice.source === "estimated"
                            ? " (estimated)"
                            : displayPrice.source === "delayed"
                              ? " (delayed)"
                              : ""
                        }`
                      : "Unavailable"
                  }
                />

                <DataRow
                  label="Previous close"
                  value={
                    holding.previousClose != null && holding.previousClose > 0
                      ? formatUnitPrice(holding.previousClose)
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
