import { Coins, Sparkles } from "lucide-react";

import {
  formatPortfolioCurrency,
  formatPortfolioPercent,
} from "@/lib/client/portfolioAnalysis";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";

export function DividendIntelligenceSection({
  snapshot,
  isLoading = false,
}: {
  snapshot: PortfolioDividendSnapshot;
  isLoading?: boolean;
}) {
  return (
    <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-gradient-to-br from-emerald-700 to-slate-950 px-5 py-6 text-white sm:px-8">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-100">
          <Coins className="h-3.5 w-3.5" />
          Dividend intelligence
        </div>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-4xl">
          {isLoading
            ? "Loading dividend insights…"
            : snapshot.hasDividendData
              ? formatPortfolioCurrency(snapshot.estimatedAnnualIncomeEur)
              : "No dividend income detected"}
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
          {snapshot.hasDividendData
            ? "Estimated passive income based on available dividend data for your holdings."
            : "Your current holdings do not show meaningful dividend income in available market data."}
        </p>
      </div>

      {snapshot.hasDividendData && !isLoading ? (
        <div className="space-y-6 p-5 sm:p-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <Metric label="Portfolio average yield" value={formatPortfolioPercent(snapshot.averageYieldPercent)} />
            <Metric
              label="Highest yielding holding"
              value={
                snapshot.highestYield
                  ? `${snapshot.highestYield.symbol} · ${formatPortfolioPercent(snapshot.highestYield.yieldPercent)}`
                  : "—"
              }
            />
            <Metric
              label="Largest contributor"
              value={
                snapshot.largestContributor
                  ? `${snapshot.largestContributor.symbol} · ${formatPortfolioCurrency(snapshot.largestContributor.incomeEur)}`
                  : "—"
              }
            />
            <Metric
              label="Income concentration"
              value={formatPortfolioPercent(snapshot.concentrationSharePercent)}
            />
            <Metric
              label="Income diversification"
              value={diversificationLabel(snapshot.incomeDiversificationLabel)}
            />
            <Metric
              label="Next payment"
              value={
                snapshot.nextPayment
                  ? `${formatPortfolioCurrency(snapshot.nextPayment.amountEur)} · ${snapshot.nextPayment.symbol}`
                  : "—"
              }
            />
          </div>

          {snapshot.allocation.length > 0 ? (
            <div>
              <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                Dividend allocation
              </p>
              <div className="mt-4 space-y-3">
                {snapshot.allocation.slice(0, 6).map((item) => (
                  <div key={item.symbol}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <div className="min-w-0">
                        <p className="truncate font-black">{item.symbol}</p>
                        <p className="truncate text-slate-500">{item.name}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-bold">
                          {formatPortfolioCurrency(item.incomeEur)}
                        </p>
                        <p className="text-slate-500">
                          {formatPortfolioPercent(item.sharePercent)}
                        </p>
                      </div>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-600"
                        style={{ width: `${Math.min(item.sharePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {snapshot.observations.length > 0 ? (
            <div className="rounded-[24px] bg-slate-950 px-5 py-5 text-white sm:px-6">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                    Observations
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-200">
                    {snapshot.observations.map((observation) => (
                      <li key={observation}>{observation}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-4">
      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-black text-slate-950">{value}</p>
    </div>
  );
}

function diversificationLabel(
  value: PortfolioDividendSnapshot["incomeDiversificationLabel"],
): string {
  switch (value) {
    case "well_diversified":
      return "Well diversified";
    case "moderate":
      return "Moderately concentrated";
    case "concentrated":
      return "Concentrated";
  }
}

export function HoldingDividendMeta({
  yieldPercent,
  annualIncomeEur,
  nextPaymentEur,
  nextExDate,
  nextPaymentDate,
  frequency,
}: {
  yieldPercent: number | null;
  annualIncomeEur: number | null;
  nextPaymentEur: number | null;
  nextExDate: string | null;
  nextPaymentDate: string | null;
  frequency: string;
}) {
  if (!annualIncomeEur && !yieldPercent) return null;

  return (
    <div className="mt-3 grid gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 sm:grid-cols-2">
      {yieldPercent ? (
        <MiniStat label="Yield" value={formatPortfolioPercent(yieldPercent)} />
      ) : null}
      {annualIncomeEur ? (
        <MiniStat
          label="Est. annual dividend"
          value={formatPortfolioCurrency(annualIncomeEur)}
        />
      ) : null}
      {nextPaymentEur ? (
        <MiniStat
          label="Est. next dividend"
          value={formatPortfolioCurrency(nextPaymentEur)}
        />
      ) : null}
      {frequency !== "Unknown" ? (
        <MiniStat label="Frequency" value={frequency} />
      ) : null}
      {nextExDate ? (
        <MiniStat label="Next ex-dividend" value={formatShortDate(nextExDate)} />
      ) : null}
      {nextPaymentDate ? (
        <MiniStat label="Next payment" value={formatShortDate(nextPaymentDate)} />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-800/70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold text-emerald-950">{value}</p>
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
