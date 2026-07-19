"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  Banknote,
  BriefcaseBusiness,
  ChartPie,
  Layers3,
  PieChart,
  Scale,
  Sparkles,
  Upload,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import {
  applyCachedPrices,
  readPortfolioFromStorage,
} from "@/lib/client/portfolioPricing";
import {
  buildPortfolioAnalysis,
  concentrationExplanation,
  concentrationLabel,
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not updated yet";
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

function allocationBarColor(index: number) {
  const palette = [
    "bg-blue-600",
    "bg-violet-600",
    "bg-emerald-600",
    "bg-amber-500",
    "bg-slate-700",
    "bg-cyan-600",
  ];
  return palette[index % palette.length];
}

export default function AnalysisPage() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [holdings, setHoldings] = useState<StoredPortfolioHolding[]>([]);
  const [portfolioReady, setPortfolioReady] = useState(false);

  useEffect(() => {
    if (!authReady) {
      setHoldings([]);
      setPortfolioReady(false);
      return;
    }

    setPortfolioReady(false);

    if (!userSub) {
      setHoldings([]);
      setPortfolioReady(true);
      return;
    }

    try {
      const stored = readPortfolioFromStorage(userSub);
      setHoldings(
        applyCachedPrices(
          userSub,
          stored.map((holding) => ({
            ...holding,
            assetType: holding.assetType === "cash" ? "cash" : "investment",
          })),
        ),
      );
    } catch {
      setHoldings([]);
    } finally {
      setPortfolioReady(true);
    }
  }, [authReady, userSub]);

  const analysis = useMemo(
    () => buildPortfolioAnalysis(holdings),
    [holdings],
  );

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading analysis…
          </p>
        </div>
      </main>
    );
  }

  const hasHoldings = holdings.length > 0;
  const hasValuedPositions = analysis.valuedPositions.length > 0;

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <header className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
              Analysis
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Portfolio Analysis
            </h1>
            <p className="mt-4 leading-7 text-slate-600">
              Insights are calculated from your saved holdings and the latest
              available portfolio prices.
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              Last portfolio update: {formatUpdatedAt(analysis.lastUpdatedAt)}
            </p>
          </header>

          {!hasHoldings ? (
            <section className="mt-10 rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-2xl font-black">No portfolio to analyse yet</h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">
                Add holdings manually or import a portfolio to see allocation,
                concentration, and diversification insights here.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/upload"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
                >
                  <Upload className="h-4 w-4" />
                  Upload portfolio
                </Link>
                <Link
                  href="/portfolio"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold"
                >
                  Open portfolio
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </section>
          ) : (
            <>
              {analysis.unvaluedHoldings.length > 0 && (
                <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>
                    {analysis.unvaluedHoldings.length}{" "}
                    {analysis.unvaluedHoldings.length === 1
                      ? "holding is"
                      : "holdings are"}{" "}
                    excluded from valued totals because a usable current price
                    is missing.
                  </p>
                </div>
              )}

              <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryCard
                  icon={<PieChart className="h-5 w-5" />}
                  label="Total portfolio value"
                  value={
                    hasValuedPositions
                      ? formatPortfolioCurrency(analysis.totalValue)
                      : "—"
                  }
                  detail={
                    hasValuedPositions
                      ? `${analysis.valuedPositions.length} valued positions`
                      : "No valued positions"
                  }
                />
                <SummaryCard
                  icon={<BriefcaseBusiness className="h-5 w-5" />}
                  label="Investment holdings"
                  value={String(analysis.investmentCount)}
                  detail="Based on stored asset type"
                />
                <SummaryCard
                  icon={<Banknote className="h-5 w-5" />}
                  label="Cash currencies"
                  value={String(analysis.cashCurrencyCount)}
                  detail={
                    analysis.cashWeightPercent > 0
                      ? `${formatPortfolioPercent(analysis.cashWeightPercent)} of valued portfolio`
                      : "No cash recorded"
                  }
                />
                <SummaryCard
                  icon={<ChartPie className="h-5 w-5" />}
                  label="Largest position"
                  value={
                    analysis.largestPosition
                      ? analysis.largestPosition.holding.assetType === "cash"
                        ? analysis.largestPosition.holding.symbol
                        : analysis.largestPosition.holding.symbol
                      : "—"
                  }
                  detail={
                    analysis.largestPosition
                      ? `${formatPortfolioPercent(analysis.largestPosition.weightPercent)} of valued portfolio`
                      : "No valued positions"
                  }
                />
              </section>

              <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black">Allocation</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Breakdown of valued holdings, including cash where recorded.
                    </p>
                  </div>
                </div>

                {hasValuedPositions ? (
                  <div className="mt-6 space-y-4">
                    {analysis.valuedPositions.map((position, index) => (
                      <div key={position.holding.id}>
                        <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                          <div className="min-w-0">
                            <p className="truncate font-black">
                              {position.holding.assetType === "cash"
                                ? position.holding.name
                                : `${position.holding.symbol} · ${position.holding.name}`}
                            </p>
                            <p className="text-slate-500">
                              {formatPortfolioCurrency(position.value)}
                            </p>
                          </div>
                          <p className="shrink-0 font-bold">
                            {formatPortfolioPercent(position.weightPercent)}
                          </p>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${allocationBarColor(index)}`}
                            style={{ width: `${Math.min(position.weightPercent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 text-sm text-slate-500">
                    Add current prices to your investments to calculate allocation.
                  </p>
                )}
              </section>

              <section className="mt-7 grid gap-4 lg:grid-cols-2">
                <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-violet-50 p-3 text-violet-700">
                      <Scale className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Concentration</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Based on actual portfolio weights among valued positions.
                      </p>
                    </div>
                  </div>

                  {hasValuedPositions ? (
                    <div className="mt-6 space-y-4">
                      <MetricRow
                        label="Largest position"
                        value={
                          analysis.largestPosition
                            ? formatPortfolioPercent(
                                analysis.largestPosition.weightPercent,
                              )
                            : "—"
                        }
                      />
                      <MetricRow
                        label="Top three combined"
                        value={formatPortfolioPercent(analysis.topThreeWeightPercent)}
                      />
                      <MetricRow
                        label="HHI"
                        value={analysis.hhi.toFixed(3)}
                      />
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black">
                          {concentrationLabel(analysis.concentrationLevel)}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-slate-600">
                          {concentrationExplanation(analysis.concentrationLevel)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-6 text-sm text-slate-500">
                      Concentration metrics require at least one valued position.
                    </p>
                  )}
                </article>

                <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <div className="flex items-start gap-3">
                    <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-xl font-black">Diversification overview</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Only dimensions supported by stored portfolio data.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                        Asset mix
                      </p>
                      <div className="mt-3 space-y-3">
                        {analysis.assetTypeBreakdown.map((item) => (
                          <MetricRow
                            key={item.label}
                            label={item.label}
                            value={`${formatPortfolioCurrency(item.value)} · ${formatPortfolioPercent(item.weightPercent)}`}
                          />
                        ))}
                      </div>
                    </div>

                    {analysis.cashByCurrency.length > 0 && (
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                          Cash by currency
                        </p>
                        <div className="mt-3 space-y-3">
                          {analysis.cashByCurrency.map((item) => (
                            <MetricRow
                              key={item.currency}
                              label={item.currency}
                              value={`${formatPortfolioCurrency(item.value, item.currency)} · ${formatPortfolioPercent(item.weightPercent)}`}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </article>
              </section>

              {analysis.unvaluedHoldings.length > 0 && (
                <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                  <h2 className="text-xl font-black">Excluded from valued totals</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    These positions remain visible but are not treated as zero-value
                    investments in allocation calculations.
                  </p>
                  <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200">
                    {analysis.unvaluedHoldings.map((holding) => (
                      <div
                        key={holding.id}
                        className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                      >
                        <div>
                          <p className="font-black">{holding.symbol}</p>
                          <p className="text-slate-500">{holding.name}</p>
                        </div>
                        <p className="font-semibold text-amber-700">
                          Missing usable price
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section className="mt-7 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                  Observations
                </p>
                <h2 className="mt-2 text-2xl font-black">Portfolio observations</h2>
                {analysis.observations.length > 0 ? (
                  <ul className="mt-5 space-y-3 text-sm leading-6 text-slate-200">
                    {analysis.observations.map((observation) => (
                      <li key={observation} className="flex gap-3">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                        <span>{observation}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-5 text-sm leading-6 text-slate-300">
                    Add valued holdings to generate portfolio observations.
                  </p>
                )}
                <p className="mt-6 text-xs leading-5 text-slate-400">
                  These observations describe portfolio structure only. They are
                  not financial advice and do not include buy or sell instructions.
                </p>
              </section>
            </>
          )}
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}
    </article>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-black text-slate-950">{value}</span>
    </div>
  );
}
