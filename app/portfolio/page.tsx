import Link from "next/link";
import { getPortfolioSnapshot } from "@/lib/services/portfolio/portfolioService";

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

const euroTwo = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function signedPercent(value: number) {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export default function PortfolioPage() {
  const portfolio = getPortfolioSnapshot();

  return (
    <main className="min-h-screen bg-slate-100">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Investment OS
            </p>
            <h1 className="mt-2 text-4xl font-bold text-slate-900">Portfolio</h1>
            <p className="mt-2 text-slate-500">
              One central source for positions, allocation and returns.
            </p>
          </div>

          <button className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800">
            + Add Holding
          </button>
        </div>

        <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Portfolio Value"
            value={euro.format(portfolio.totalValue)}
            subtitle={`${portfolio.dailyChangeValue >= 0 ? "+" : ""}${euro.format(portfolio.dailyChangeValue)} today`}
            tone={portfolio.dailyChangeValue >= 0 ? "positive" : "negative"}
          />
          <KpiCard
            label="Total Return"
            value={signedPercent(portfolio.totalReturnPercent)}
            subtitle={`${portfolio.totalProfitLoss >= 0 ? "+" : ""}${euro.format(portfolio.totalProfitLoss)} since purchase`}
            tone={portfolio.totalProfitLoss >= 0 ? "positive" : "negative"}
          />
          <KpiCard
            label="Holdings"
            value={String(portfolio.holdings.length)}
            subtitle="All positions in one engine"
          />
          <KpiCard
            label="Largest Position"
            value={portfolio.largestHolding.ticker}
            subtitle={`${portfolio.largestHolding.weightPercent.toFixed(1)}% of portfolio`}
            tone="warning"
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="rounded-3xl bg-slate-950 p-7 text-white shadow-sm md:p-8">
            <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Portfolio Health
                </p>
                <h2 className="mt-3 text-3xl font-bold">Concentrated growth portfolio</h2>
                <p className="mt-3 max-w-2xl leading-7 text-slate-300">
                  The portfolio has strong long-term growth potential, but Bitcoin-linked exposure remains dominant. New contributions should primarily strengthen diversified equity and defensive positions.
                </p>
              </div>

              <div className="rounded-2xl bg-white/10 px-6 py-5 text-center">
                <p className="text-sm text-slate-400">Daily move</p>
                <p className={`mt-2 text-3xl font-bold ${portfolio.dailyChangePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {signedPercent(portfolio.dailyChangePercent)}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Allocation
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Current weights</h2>

            <div className="mt-6 space-y-5">
              {portfolio.holdings.map((holding) => (
                <div key={holding.ticker}>
                  <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                    <span className="font-semibold text-slate-700">{holding.ticker}</span>
                    <span className="text-slate-500">{holding.weightPercent.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${Math.min(holding.weightPercent, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-3xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 p-7 md:p-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Positions
              </p>
              <h2 className="mt-2 text-2xl font-bold text-slate-900">Holdings</h2>
            </div>
            <p className="text-sm text-slate-500">Click a holding for full analysis</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-8 py-4">Holding</th>
                  <th className="px-5 py-4">Units</th>
                  <th className="px-5 py-4">Price</th>
                  <th className="px-5 py-4">Value</th>
                  <th className="px-5 py-4">Weight</th>
                  <th className="px-5 py-4">Return</th>
                  <th className="px-8 py-4 text-right">Open</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {portfolio.holdings.map((holding) => (
                  <tr key={holding.ticker} className="transition hover:bg-slate-50">
                    <td className="px-8 py-5">
                      <Link href={`/holding/${holding.slug}`} className="group block">
                        <span className="font-bold text-slate-900 group-hover:text-blue-600">{holding.ticker}</span>
                        <span className="mt-1 block text-sm text-slate-500">{holding.name}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-5 text-slate-700">{holding.units.toLocaleString("nl-NL")}</td>
                    <td className="px-5 py-5 text-slate-700">{euroTwo.format(holding.currentPrice)}</td>
                    <td className="px-5 py-5 font-semibold text-slate-900">{euro.format(holding.marketValue)}</td>
                    <td className="px-5 py-5 text-slate-700">{holding.weightPercent.toFixed(1)}%</td>
                    <td className={`px-5 py-5 font-semibold ${holding.returnPercent >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {signedPercent(holding.returnPercent)}
                    </td>
                    <td className="px-8 py-5 text-right">
                      <Link href={`/holding/${holding.slug}`} className="inline-flex rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-900 hover:text-white">
                        View →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function KpiCard({
  label,
  value,
  subtitle,
  tone = "neutral",
}: {
  label: string;
  value: string;
  subtitle: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const valueClass = {
    neutral: "text-slate-900",
    positive: "text-emerald-600",
    negative: "text-red-600",
    warning: "text-amber-600",
  }[tone];

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}
