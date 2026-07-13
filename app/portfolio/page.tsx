import Link from "next/link";
import PageNavigation from "../../components/PageNavigation";
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

type Holding = {
  ticker?: string;
  symbol?: string;
  name?: string;
  category?: string;
  price?: number;
  currentPrice?: number;
  value?: number;
  marketValue?: number;
  weight?: number;
  allocation?: number;
  dayChangePercent?: number;
  dailyChangePercent?: number;
};

export default function PortfolioPage() {
  const portfolio = getPortfolioSnapshot() as {
    totalValue?: number;
    value?: number;
    totalDayChange?: number;
    dayChange?: number;
    totalDayChangePercent?: number;
    dayChangePercent?: number;
    totalReturn?: number;
    returnValue?: number;
    totalReturnPercent?: number;
    returnPercent?: number;
    holdings?: Holding[];
    positions?: Holding[];
  };

  const holdings = portfolio.holdings ?? portfolio.positions ?? [];
  const totalValue = portfolio.totalValue ?? portfolio.value ?? 0;

  const dayChange =
    portfolio.totalDayChange ??
    portfolio.dayChange ??
    holdings.reduce((total, holding) => {
      const holdingValue = holding.value ?? holding.marketValue ?? 0;
      const change =
        holding.dayChangePercent ?? holding.dailyChangePercent ?? 0;

      return total + holdingValue * (change / 100);
    }, 0);

  const dayChangePercent =
    portfolio.totalDayChangePercent ??
    portfolio.dayChangePercent ??
    (totalValue > 0 ? (dayChange / totalValue) * 100 : 0);

  const totalReturn =
    portfolio.totalReturn ?? portfolio.returnValue ?? 0;

  const totalReturnPercent =
    portfolio.totalReturnPercent ?? portfolio.returnPercent ?? 0;

  const positiveDay = dayChange >= 0;
  const positiveReturn = totalReturn >= 0;

  return (
    <main className="min-h-screen bg-slate-100 pb-28">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageNavigation />
      </div>

      <div className="mx-auto max-w-7xl px-6 pb-8 pt-10 md:px-8">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
              Investment OS
            </p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
              Portfolio
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
              A complete overview of your holdings, allocation and portfolio
              performance.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Portfolio value
            </p>

            <p className="mt-1 text-2xl font-bold text-slate-950">
              {euro.format(totalValue)}
            </p>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total portfolio
            </p>

            <p className="mt-3 text-3xl font-bold tracking-tight text-slate-950">
              {euro.format(totalValue)}
            </p>

            <p className="mt-5 text-sm text-slate-500">
              Current market value of all holdings.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Today&apos;s change
                </p>

                <p
                  className={`mt-3 text-3xl font-bold tracking-tight ${
                    positiveDay ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {dayChange >= 0 ? "+" : ""}
                  {euro.format(dayChange)}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  positiveDay
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {signedPercent(dayChangePercent)}
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Combined movement across your portfolio today.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  Return since start
                </p>

                <p
                  className={`mt-3 text-3xl font-bold tracking-tight ${
                    positiveReturn ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {totalReturn >= 0 ? "+" : ""}
                  {euro.format(totalReturn)}
                </p>
              </div>

              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  positiveReturn
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-rose-50 text-rose-700"
                }`}
              >
                {signedPercent(totalReturnPercent)}
              </span>
            </div>

            <p className="mt-5 text-sm text-slate-500">
              Performance compared with your total invested capital.
            </p>
          </article>
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Your holdings
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Select a holding to open its full detail page.
              </p>
            </div>

            <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
              {holdings.length} holdings
            </span>
          </div>

          <div className="hidden grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-4 border-b border-slate-200 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 md:grid">
            <span>Holding</span>
            <span className="text-right">Price</span>
            <span className="text-right">Value</span>
            <span className="text-right">Weight</span>
            <span className="text-right">Today</span>
          </div>

          <div className="divide-y divide-slate-200">
            {holdings.map((holding, index) => {
              const ticker =
                holding.ticker ?? holding.symbol ?? `holding-${index + 1}`;

              const displayTicker = ticker.toUpperCase();
              const holdingName = holding.name ?? displayTicker;
              const category = holding.category ?? "Investment";
              const price = holding.price ?? holding.currentPrice ?? 0;
              const value = holding.value ?? holding.marketValue ?? 0;

              const weight =
                holding.weight ??
                holding.allocation ??
                (totalValue > 0 ? (value / totalValue) * 100 : 0);

              const dailyChange =
                holding.dayChangePercent ??
                holding.dailyChangePercent ??
                0;

              const positiveHolding = dailyChange >= 0;

              return (
                <Link
                  key={`${ticker}-${index}`}
                  href={`/holding/${ticker.toLowerCase()}`}
                  className="group block transition hover:bg-slate-50"
                >
                  <div className="grid gap-4 px-6 py-5 md:grid-cols-[2fr_1fr_1fr_1fr_1fr] md:items-center">
                    <div className="flex min-w-0 items-center gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-xs font-bold text-white">
                        {displayTicker.slice(0, 4)}
                      </div>

                      <div className="min-w-0">
                        <h3 className="truncate font-semibold text-slate-950 group-hover:text-blue-600">
                          {holdingName}
                        </h3>

                        <p className="mt-1 truncate text-sm text-slate-500">
                          {displayTicker} · {category}
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-medium text-slate-700">
                      {euroTwo.format(price)}
                    </div>

                    <div className="text-right font-semibold text-slate-950">
                      {euro.format(value)}
                    </div>

                    <div className="text-right font-medium text-slate-700">
                      {weight.toFixed(1)}%
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold ${
                          positiveHolding
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {signedPercent(dailyChange)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}