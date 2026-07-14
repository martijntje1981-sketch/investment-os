import { headers } from "next/headers";
import { notFound } from "next/navigation";

import BottomNav from "@/components/home/BottomNav";
import {
  getHoldingByTickerWithPrices,
  type PricesApiResponse,
} from "@/lib/services/portfolio/portfolioService";

export const dynamic = "force-dynamic";

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

const numberFormat = new Intl.NumberFormat("en-GB", {
  maximumFractionDigits: 0,
});

function signedPercent(value: number) {
  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(2)}%`;
}

function formatUpdateTime(value: string | null) {
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

async function getBaseUrl() {
  const requestHeaders = await headers();

  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host");

  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (process.env.NODE_ENV === "development"
      ? "http"
      : "https");

  if (host) {
    return `${protocol}://${host}`;
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

async function fetchPrices(): Promise<PricesApiResponse | null> {
  try {
    const baseUrl = await getBaseUrl();

    const response = await fetch(`${baseUrl}/api/prices`, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      console.error(
        `Holding page prices request failed: ${response.status}`,
      );

      return null;
    }

    return (await response.json()) as PricesApiResponse;
  } catch (error) {
    console.error(
      "Holding page could not load live prices:",
      error,
    );

    return null;
  }
}

export default async function HoldingPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const pricesResponse = await fetchPrices();

  const holding = getHoldingByTickerWithPrices(
    ticker,
    pricesResponse,
  );

  if (!holding) {
    notFound();
  }

  const isLive =
    holding.marketDataSource === "eodhd";

  const stanceClass =
    holding.stance === "Hold"
      ? "bg-amber-100 text-amber-800"
      : holding.stance === "Core Holding"
        ? "bg-emerald-100 text-emerald-800"
        : holding.stance === "Defensive Holding"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-blue-100 text-blue-800";

  return (
    <>
      <main className="min-h-screen bg-slate-100 pb-32 pt-20">
        <div className="mx-auto max-w-7xl p-6 md:p-8">
          <section className="overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-10">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    {holding.category}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${stanceClass}`}
                  >
                    {holding.stance}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      isLive
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-amber-500/20 text-amber-300"
                    }`}
                  >
                    {isLive ? "Live EODHD" : "Fallback data"}
                  </span>
                </div>

                <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">
                  {holding.ticker}
                </h1>

                <p className="mt-2 text-lg text-slate-300">
                  {holding.name}
                </p>

                <p className="mt-4 text-sm text-slate-400">
                  Last market update:{" "}
                  <span className="font-medium text-slate-200">
                    {formatUpdateTime(
                      holding.marketDataUpdatedAt,
                    )}
                  </span>
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 lg:text-right">
                <div>
                  <p className="text-sm text-slate-400">
                    Current Price
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {euroTwo.format(
                      holding.currentPrice,
                    )}
                  </p>

                  <p
                    className={`mt-1 font-semibold ${getPerformanceClass(
                      holding.dailyChangePercent,
                    )}`}
                  >
                    {signedPercent(
                      holding.dailyChangePercent,
                    )}{" "}
                    today
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-400">
                    Investment Score
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {holding.investmentScore}
                    <span className="text-lg text-slate-500">
                      /10
                    </span>
                  </p>

                  <p className="mt-1 font-semibold text-blue-400">
                    Investment OS rating
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Position Value"
              value={euro.format(
                holding.marketValue,
              )}
              subtitle="Current market value"
            />

            <MetricCard
              label="Portfolio Weight"
              value={`${holding.weightPercent.toFixed(
                1,
              )}%`}
              subtitle="Share of total portfolio"
            />

            <MetricCard
              label="Total Return"
              value={signedPercent(
                holding.returnPercent,
              )}
              subtitle={`${holding.profitLoss >= 0 ? "+" : ""}${euro.format(
                holding.profitLoss,
              )}`}
              valueClassName={getMetricPerformanceClass(
                holding.returnPercent,
              )}
            />

            <MetricCard
              label="Day Change"
              value={signedPercent(
                holding.dailyChangePercent,
              )}
              subtitle={`${holding.dayChangeValue >= 0 ? "+" : ""}${euro.format(
                holding.dayChangeValue,
              )}`}
              valueClassName={getMetricPerformanceClass(
                holding.dailyChangePercent,
              )}
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
                {holding.summary}
              </p>

              <div className="relative mt-8 h-64 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 to-white">
                <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
                <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
                <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />

                <svg
                  className="absolute inset-0 h-full w-full"
                  viewBox="0 0 800 260"
                  preserveAspectRatio="none"
                  aria-label="Placeholder performance chart"
                >
                  <path
                    d="M0,215 C90,200 125,150 190,165 C270,184 300,105 370,120 C450,138 495,78 555,100 C625,126 680,60 735,75 C770,84 790,54 800,58"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="5"
                    className="text-blue-600"
                  />

                  <path
                    d="M0,215 C90,200 125,150 190,165 C270,184 300,105 370,120 C450,138 495,78 555,100 C625,126 680,60 735,75 C770,84 790,54 800,58 L800,260 L0,260 Z"
                    className="fill-blue-100/60"
                  />
                </svg>

                <p className="absolute bottom-4 left-5 text-xs text-slate-400">
                  Historical price chart follows after
                  the stable beta
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
                  value={holding.units.toLocaleString(
                    "en-GB",
                  )}
                />

                <DataRow
                  label="Average price"
                  value={euroTwo.format(
                    holding.averagePrice,
                  )}
                />

                <DataRow
                  label="Current price"
                  value={euroTwo.format(
                    holding.currentPrice,
                  )}
                />

                <DataRow
                  label="Previous close"
                  value={
                    holding.previousClose !== null
                      ? euroTwo.format(
                          holding.previousClose,
                        )
                      : "Not available"
                  }
                />

                <DataRow
                  label="Cost basis"
                  value={euro.format(
                    holding.costBasis,
                  )}
                />

                <DataRow
                  label="Market value"
                  value={euro.format(
                    holding.marketValue,
                  )}
                />

                <DataRow
                  label="Portfolio weight"
                  value={`${holding.weightPercent.toFixed(
                    1,
                  )}%`}
                />

                <DataRow
                  label="Risk level"
                  value={holding.riskLevel}
                />

                {holding.volume !== null ? (
                  <DataRow
                    label="Volume"
                    value={numberFormat.format(
                      holding.volume,
                    )}
                  />
                ) : null}
              </div>
            </article>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-3">
            <InsightCard
              title="Investment Thesis"
              label="Why it belongs"
              items={holding.thesis}
            />

            <InsightCard
              title="Key Catalysts"
              label="What could drive growth"
              items={holding.catalysts}
            />

            <InsightCard
              title="Primary Risks"
              label="What to monitor"
              items={holding.risks}
              risk
            />
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-2">
            <article className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Portfolio Role
              </p>

              <h2 className="mt-2 text-2xl font-bold text-slate-900">
                Allocation Assessment
              </h2>

              <div className="mt-6 rounded-2xl bg-slate-50 p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-700">
                    Current Weight
                  </span>

                  <span className="text-2xl font-bold text-slate-900">
                    {holding.weightPercent.toFixed(1)}%
                  </span>
                </div>

                <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-slate-900 transition-all duration-700"
                    style={{
                      width: `${Math.min(
                        holding.weightPercent,
                        100,
                      )}%`,
                    }}
                  />
                </div>

                <p className="mt-5 leading-7 text-slate-600">
                  Allocation guidance will be
                  compared with the selected risk
                  profile, financial target and total
                  portfolio concentration.
                </p>
              </div>
            </article>

            <article className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm md:p-8">
              <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                Next Decision
              </p>

              <h2 className="mt-2 text-2xl font-bold">
                Investment OS Recommendation
              </h2>

              <div className="mt-6 flex items-center justify-between rounded-2xl bg-white/10 p-6">
                <div>
                  <p className="text-sm text-slate-400">
                    Current stance
                  </p>

                  <p className="mt-2 text-3xl font-bold">
                    {holding.stance}
                  </p>
                </div>

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white text-2xl text-slate-950">
                  →
                </div>
              </div>

              <p className="mt-6 leading-7 text-slate-300">
                The current stance combines the
                position analysis, portfolio role and
                Investment OS risk assessment. More
                advanced AI recommendations follow
                after the stable beta.
              </p>
            </article>
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
      <p className="text-sm font-medium text-slate-500">
        {label}
      </p>

      <p
        className={`mt-3 text-3xl font-bold ${valueClassName}`}
      >
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-500">
        {subtitle}
      </p>
    </article>
  );
}

function DataRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-slate-500">
        {label}
      </span>

      <span className="text-right font-semibold text-slate-900">
        {value}
      </span>
    </div>
  );
}

function InsightCard({
  title,
  label,
  items,
  risk = false,
}: {
  title: string;
  label: string;
  items: string[];
  risk?: boolean;
}) {
  const visibleItems =
    items.length > 0
      ? items
      : ["Analysis is not available yet."];

  return (
    <article className="rounded-3xl bg-white p-7 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold ${
          risk
            ? "bg-red-100 text-red-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        {risk ? "!" : "↗"}
      </div>

      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </p>

      <h2 className="mt-2 text-xl font-bold text-slate-900">
        {title}
      </h2>

      <div className="mt-5 space-y-4">
        {visibleItems.map((item) => (
          <div
            key={item}
            className="flex items-start gap-3"
          >
            <span
              className={`mt-2 h-2 w-2 shrink-0 rounded-full ${
                risk
                  ? "bg-red-500"
                  : "bg-blue-500"
              }`}
            />

            <p className="leading-6 text-slate-600">
              {item}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}