import PageNavigation from "../../components/PageNavigation";
import BottomNavigation from "../../components/home/BottomNav";
import { getPortfolioSnapshot } from "@/lib/services/portfolio/portfolioService";

const euro = new Intl.NumberFormat("nl-NL", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

function calculateFutureValue(
  currentValue: number,
  monthlyContribution: number,
  annualReturn: number,
  years: number
) {
  const monthlyRate = annualReturn / 12;
  const months = years * 12;

  const currentGrowth =
    currentValue * Math.pow(1 + monthlyRate, months);

  const contributionGrowth =
    monthlyRate > 0
      ? monthlyContribution *
        ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
      : monthlyContribution * months;

  return currentGrowth + contributionGrowth;
}

function calculateYearsToGoal(
  currentValue: number,
  target: number,
  monthlyContribution: number,
  annualReturn: number
) {
  let value = currentValue;
  let months = 0;
  const monthlyRate = annualReturn / 12;

  while (value < target && months < 1200) {
    value = value * (1 + monthlyRate) + monthlyContribution;
    months += 1;
  }

  return months / 12;
}

export default function GoalsPage() {
  const portfolio = getPortfolioSnapshot();

  const target = 1_000_000;
  const monthlyContribution = 1_250;
  const targetYears = 10;

  const scenarios = [
    {
      name: "Bear case",
      annualReturn: 0.07,
      description: "Conservative long-term growth scenario.",
    },
    {
      name: "Base case",
      annualReturn: 0.15,
      description: "Your main Investment OS growth scenario.",
    },
    {
      name: "Bull case",
      annualReturn: 0.22,
      description: "Strong growth with higher volatility.",
    },
  ];

  const progress = Math.min(
    (portfolio.totalValue / target) * 100,
    100
  );

  const requiredAnnualGrowth =
    Math.pow(target / portfolio.totalValue, 1 / targetYears) - 1;

  return (
    <main className="min-h-screen bg-slate-100 pb-28">
      <div className="px-6 pt-6 md:px-8 md:pt-8">
        <PageNavigation />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-10 md:px-8">
        <header className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Investment OS
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">
            Financial goals
          </h1>

          <p className="mt-3 max-w-2xl text-slate-600">
            Track your progress toward financial independence and compare
            different portfolio growth scenarios.
          </p>
        </header>

        <section className="rounded-3xl bg-slate-950 p-7 text-white shadow-lg md:p-9">
          <div className="grid gap-8 md:grid-cols-[1.5fr_1fr] md:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-300">
                Project Million
              </p>

              <h2 className="mt-3 text-3xl font-bold md:text-4xl">
                {euro.format(portfolio.totalValue)}
              </h2>

              <p className="mt-2 text-slate-300">
                Current portfolio value toward a target of{" "}
                {euro.format(target)}.
              </p>

              <div className="mt-7 h-4 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="mt-3 flex justify-between text-sm text-slate-300">
                <span>{progress.toFixed(1)}% complete</span>
                <span>
                  {euro.format(
                    Math.max(target - portfolio.totalValue, 0)
                  )}{" "}
                  remaining
                </span>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-700 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Target timeframe
              </p>

              <p className="mt-2 text-3xl font-bold">
                {targetYears} years
              </p>

              <p className="mt-4 text-sm leading-6 text-slate-300">
                Required annual portfolio growth without additional
                contributions:
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-300">
                {(requiredAnnualGrowth * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Monthly contribution
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-950">
              {euro.format(monthlyContribution)}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Equivalent to {euro.format(monthlyContribution * 12)} per year.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Invested capital
            </p>

            <p className="mt-3 text-3xl font-bold text-slate-950">
              {euro.format(portfolio.totalCostBasis)}
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Total calculated cost basis of all holdings.
            </p>
          </article>

          <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Portfolio return
            </p>

            <p
              className={`mt-3 text-3xl font-bold ${
                portfolio.totalReturn >= 0
                  ? "text-emerald-600"
                  : "text-rose-600"
              }`}
            >
              {portfolio.totalReturnPercent >= 0 ? "+" : ""}
              {portfolio.totalReturnPercent.toFixed(1)}%
            </p>

            <p className="mt-3 text-sm text-slate-500">
              Return compared with total invested capital.
            </p>
          </article>
        </section>

        <section className="mt-8">
          <div className="mb-5">
            <h2 className="text-2xl font-bold text-slate-950">
              Growth scenarios
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Projected portfolio value with your current monthly contribution.
            </p>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {scenarios.map((scenario) => {
              const projectedValue = calculateFutureValue(
                portfolio.totalValue,
                monthlyContribution,
                scenario.annualReturn,
                targetYears
              );

              const yearsToGoal = calculateYearsToGoal(
                portfolio.totalValue,
                target,
                monthlyContribution,
                scenario.annualReturn
              );

              const reachesTarget = projectedValue >= target;

              return (
                <article
                  key={scenario.name}
                  className={`rounded-3xl border bg-white p-6 shadow-sm ${
                    scenario.name === "Base case"
                      ? "border-blue-300 ring-2 ring-blue-100"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-xl font-bold text-slate-950">
                      {scenario.name}
                    </h3>

                    <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700">
                      {(scenario.annualReturn * 100).toFixed(0)}% yearly
                    </span>
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {scenario.description}
                  </p>

                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <p className="text-sm text-slate-500">
                      Value after {targetYears} years
                    </p>

                    <p className="mt-2 text-3xl font-bold text-slate-950">
                      {euro.format(projectedValue)}
                    </p>
                  </div>

                  <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">
                      Estimated time to €1 million
                    </p>

                    <p
                      className={`mt-1 text-xl font-bold ${
                        reachesTarget
                          ? "text-emerald-600"
                          : "text-slate-950"
                      }`}
                    >
                      {yearsToGoal.toFixed(1)} years
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-blue-100 bg-blue-50 p-6">
          <h2 className="font-semibold text-blue-950">
            Investment OS assessment
          </h2>

          <p className="mt-2 text-sm leading-6 text-blue-800">
            Your current portfolio is strongly growth-oriented. The base case
            assumes a high 15% annual return and should be monitored against
            actual performance over time.
          </p>
        </section>
      </div>

      <BottomNavigation />
    </main>
  );
}