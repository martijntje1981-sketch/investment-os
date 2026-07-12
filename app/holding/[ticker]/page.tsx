import Link from "next/link";
import { notFound } from "next/navigation";
import { getHoldingByTicker } from "@/lib/services/portfolio/portfolioService";

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

export default async function HoldingPage({
  params,
}: {
  params: Promise<{ ticker: string }>;
}) {
  const { ticker } = await params;
  const holding = getHoldingByTicker(ticker);

  if (!holding) notFound();

  const stanceClass =
    holding.stance === "Hold"
      ? "bg-amber-100 text-amber-800"
      : holding.stance === "Core Holding"
        ? "bg-emerald-100 text-emerald-800"
        : holding.stance === "Defensive Holding"
          ? "bg-yellow-100 text-yellow-800"
          : "bg-blue-100 text-blue-800";

  return (
    <main className="min-h-screen bg-slate-100 pb-16">
      <div className="mx-auto max-w-7xl p-6 md:p-8">
        <Link href="/portfolio" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900">
          ← Back to Portfolio
        </Link>

        <section className="mt-6 overflow-hidden rounded-3xl bg-slate-950 p-7 text-white shadow-xl md:p-10">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {holding.category}
                </span>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${stanceClass}`}>
                  {holding.stance}
                </span>
              </div>
              <h1 className="mt-5 text-4xl font-bold tracking-tight md:text-5xl">{holding.ticker}</h1>
              <p className="mt-2 text-lg text-slate-300">{holding.name}</p>
            </div>

            <div className="grid grid-cols-2 gap-8 lg:text-right">
              <div>
                <p className="text-sm text-slate-400">Current Price</p>
                <p className="mt-2 text-3xl font-bold">{euroTwo.format(holding.currentPrice)}</p>
                <p className={`mt-1 font-semibold ${holding.dailyChangePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {signedPercent(holding.dailyChangePercent)} today
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Investment Score</p>
                <p className="mt-2 text-3xl font-bold">
                  {holding.investmentScore}<span className="text-lg text-slate-500">/10</span>
                </p>
                <p className="mt-1 font-semibold text-blue-400">Investment OS rating</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Position Value" value={euro.format(holding.marketValue)} subtitle="Current market value" />
          <MetricCard label="Portfolio Weight" value={`${holding.weightPercent.toFixed(1)}%`} subtitle="Share of total portfolio" />
          <MetricCard label="Total Return" value={signedPercent(holding.returnPercent)} subtitle={`${holding.profitLoss >= 0 ? "+" : ""}${euro.format(holding.profitLoss)}`} positive={holding.returnPercent >= 0} />
          <MetricCard label="Risk Level" value={holding.riskLevel} subtitle={holding.stance} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-blue-600">Investment OS Analysis</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Position Summary</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">{holding.summary}</p>

            <div className="mt-8 h-64 overflow-hidden rounded-2xl bg-gradient-to-b from-blue-50 to-white">
              <svg className="h-full w-full" viewBox="0 0 800 260" preserveAspectRatio="none" aria-label="Placeholder performance chart">
                <path d="M0,215 C90,200 125,150 190,165 C270,184 300,105 370,120 C450,138 495,78 555,100 C625,126 680,60 735,75 C770,84 790,54 800,58" fill="none" stroke="currentColor" strokeWidth="5" className="text-blue-600" />
                <path d="M0,215 C90,200 125,150 190,165 C270,184 300,105 370,120 C450,138 495,78 555,100 C625,126 680,60 735,75 C770,84 790,54 800,58 L800,260 L0,260 Z" className="fill-blue-100/60" />
              </svg>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-7 shadow-sm md:p-8">
            <p className="text-sm font-semibold uppercase tracking-wider text-slate-400">Position Data</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900">Key Metrics</h2>
            <div className="mt-6 divide-y divide-slate-100">
              <DataRow label="Units" value={holding.units.toLocaleString("nl-NL")} />
              <DataRow label="Average price" value={euroTwo.format(holding.averagePrice)} />
              <DataRow label="Cost basis" value={euro.format(holding.costBasis)} />
              <DataRow label="Market value" value={euro.format(holding.marketValue)} />
              <DataRow label="Portfolio weight" value={`${holding.weightPercent.toFixed(1)}%`} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-3">
          <InsightCard title="Investment Thesis" label="Why it belongs" items={holding.thesis} />
          <InsightCard title="Key Catalysts" label="What could drive growth" items={holding.catalysts} />
          <InsightCard title="Primary Risks" label="What to monitor" items={holding.risks} risk />
        </section>
      </div>
    </main>
  );
}

function MetricCard({ label, value, subtitle, positive }: { label: string; value: string; subtitle: string; positive?: boolean }) {
  const valueClass = positive === undefined ? "text-slate-900" : positive ? "text-emerald-600" : "text-red-600";
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className={`mt-3 text-3xl font-bold ${valueClass}`}>{value}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}

function InsightCard({ title, label, items, risk = false }: { title: string; label: string; items: string[]; risk?: boolean }) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm">
      <div className={`flex h-11 w-11 items-center justify-center rounded-2xl text-lg font-bold ${risk ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"}`}>
        {risk ? "!" : "↗"}
      </div>
      <p className="mt-5 text-sm font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <h2 className="mt-2 text-xl font-bold text-slate-900">{title}</h2>
      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div key={item} className="flex items-start gap-3">
            <span className={`mt-2 h-2 w-2 shrink-0 rounded-full ${risk ? "bg-red-500" : "bg-blue-500"}`} />
            <p className="leading-6 text-slate-600">{item}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
