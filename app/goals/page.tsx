import { getPortfolioSnapshot } from "@/lib/services/portfolio/portfolioService";

const TARGET_VALUE = 1_000_000;
const MONTHLY_CONTRIBUTION = 1_000;
const YEARS = 10;

const scenarios = [
  {
    name: "Bear",
    annualReturn: 8,
    description: "Slower growth with challenging market periods.",
  },
  {
    name: "Base",
    annualReturn: 15,
    description: "Strong long-term growth with normal volatility.",
  },
  {
    name: "Bull",
    annualReturn: 25,
    description: "Excellent performance from growth-oriented holdings.",
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return new Intl.NumberFormat("nl-NL", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function calculateFutureValue(
  startingValue: number,
  monthlyContribution: number,
  annualReturnPercent: number,
  years: number,
) {
  const monthlyRate = annualReturnPercent / 100 / 12;
  const months = years * 12;

  if (monthlyRate === 0) {
    return startingValue + monthlyContribution * months;
  }

  const portfolioGrowth = startingValue * (1 + monthlyRate) ** months;

  const contributionGrowth =
    monthlyContribution *
    (((1 + monthlyRate) ** months - 1) / monthlyRate);

  return portfolioGrowth + contributionGrowth;
}

function calculateRequiredAnnualReturn(
  startingValue: number,
  monthlyContribution: number,
  targetValue: number,
  years: number,
) {
  let low = 0;
  let high = 100;

  for (let index = 0; index < 100; index += 1) {
    const midpoint = (low + high) / 2;

    const projectedValue = calculateFutureValue(
      startingValue,
      monthlyContribution,
      midpoint,
      years,
    );

    if (projectedValue < targetValue) {
      low = midpoint;
    } else {
      high = midpoint;
    }
  }

  return (low + high) / 2;
}

function calculateYearsToTarget(
  startingValue: number,
  monthlyContribution: number,
  annualReturnPercent: number,
  targetValue: number,
) {
  let value = startingValue;
  const monthlyRate = annualReturnPercent / 100 / 12;

  for (let month = 1; month <= 50 * 12; month += 1) {
    value = value * (1 + monthlyRate) + monthlyContribution;

    if (value >= targetValue) {
      return month / 12;
    }
  }

  return null;
}

export default function GoalsPage() {
  const portfolio = getPortfolioSnapshot();

  const progressPercent = Math.min(
    (portfolio.totalValue / TARGET_VALUE) * 100,
    100,
  );

  const remainingValue = Math.max(
    TARGET_VALUE - portfolio.totalValue,
    0,
  );

  const requiredAnnualReturn = calculateRequiredAnnualReturn(
    portfolio.totalValue,
    MONTHLY_CONTRIBUTION,
    TARGET_VALUE,
    YEARS,
  );

  const baseYearsToTarget = calculateYearsToTarget(
    portfolio.totalValue,
    MONTHLY_CONTRIBUTION,
    15,
    TARGET_VALUE,
  );

  const projectedScenarios = scenarios.map((scenario) => {
    const projectedValue = calculateFutureValue(
      portfolio.totalValue,
      MONTHLY_CONTRIBUTION,
      scenario.annualReturn,
      YEARS,
    );

    const yearsToTarget = calculateYearsToTarget(
      portfolio.totalValue,
      MONTHLY_CONTRIBUTION,
      scenario.annualReturn,
      TARGET_VALUE,
    );

    return {
      ...scenario,
      projectedValue,
      yearsToTarget,
      reachesTarget: projectedValue >= TARGET_VALUE,
    };
  });

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <section className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Wealth plan
          </p>

          <div className="mt-2 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Your path to €1 million
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600">
                Track your progress, compare growth scenarios and see what is
                required to reach financial independence.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Planning horizon
              </p>
              <p className="mt-1 text-2xl font-bold">{YEARS} years</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Main financial goal
              </p>

              <h2 className="mt-3 text-4xl font-bold sm:text-6xl">
                {formatCurrency(TARGET_VALUE)}
              </h2>

              <p className="mt-4 max-w-xl leading-7 text-slate-300">
                Build enough invested capital to create long-term freedom and
                eventually generate sustainable portfolio income.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-slate-400">Current portfolio</p>
              <p className="mt-2 text-3xl font-bold">
                {formatCurrency(portfolio.totalValue)}
              </p>

              <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-all duration-700"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="font-semibold text-emerald-300">
                  {formatPercent(progressPercent)}% complete
                </span>
                <span className="text-slate-400">
                  {formatCurrency(remainingValue)} remaining
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Current value"
            value={formatCurrency(portfolio.totalValue)}
            subtitle={`${portfolio.holdings.length} active holdings`}
          />

          <MetricCard
            label="Monthly contribution"
            value={formatCurrency(MONTHLY_CONTRIBUTION)}
            subtitle="Current planning assumption"
          />

          <MetricCard
            label="Required return"
            value={`${formatPercent(requiredAnnualReturn)}%`}
            subtitle={`Annualised return for the ${YEARS}-year goal`}
          />

          <MetricCard
            label="Base-case target"
            value={
              baseYearsToTarget
                ? `${formatPercent(baseYearsToTarget)} years`
                : "50+ years"
            }
            subtitle="At 15% annual growth"
          />
        </section>

        <section className="mt-8">
          <div className="mb-4">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Scenario monitor
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Where could the portfolio be in {YEARS} years?
            </h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            {projectedScenarios.map((scenario) => {
              const scenarioProgress = Math.min(
                (scenario.projectedValue / TARGET_VALUE) * 100,
                100,
              );

              return (
                <article
                  key={scenario.name}
                  className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                        {scenario.name} case
                      </p>

                      <p className="mt-2 text-3xl font-bold">
                        {scenario.annualReturn}%
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Expected annual growth
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        scenario.reachesTarget
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {scenario.reachesTarget
                        ? "Goal achieved"
                        : "Below target"}
                    </span>
                  </div>

                  <div className="mt-8">
                    <p className="text-sm text-slate-500">
                      Projected portfolio
                    </p>

                    <p className="mt-1 text-3xl font-bold">
                      {formatCurrency(scenario.projectedValue)}
                    </p>
                  </div>

                  <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-slate-900"
                      style={{ width: `${scenarioProgress}%` }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-sm">
                    <span className="text-slate-500">
                      {formatPercent(
                        (scenario.projectedValue / TARGET_VALUE) * 100,
                      )}
                      % of goal
                    </span>

                    <span className="font-semibold text-slate-700">
                      {scenario.yearsToTarget
                        ? `${formatPercent(scenario.yearsToTarget)} years`
                        : "Not reached"}
                    </span>
                  </div>

                  <p className="mt-6 border-t border-slate-100 pt-5 text-sm leading-6 text-slate-600">
                    {scenario.description}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Goal assessment
            </p>

            <h2 className="mt-2 text-2xl font-bold">
              The goal is ambitious, but achievable
            </h2>

            <div className="mt-6 space-y-5">
              <AssessmentRow
                title="Starting capital"
                text={`${formatCurrency(
                  portfolio.totalValue,
                )} is already invested and compounding.`}
                status="Strong"
              />

              <AssessmentRow
                title="Monthly investing"
                text={`${formatCurrency(
                  MONTHLY_CONTRIBUTION,
                )} per month adds €120,000 in new capital over ten years before investment growth.`}
                status="Positive"
              />

              <AssessmentRow
                title="Required performance"
                text={`The current plan requires approximately ${formatPercent(
                  requiredAnnualReturn,
                )}% annualised growth. That is possible, but it requires both strong performance and disciplined risk management.`}
                status="Demanding"
              />

              <AssessmentRow
                title="Main portfolio risk"
                text={`${portfolio.largestHolding.ticker} currently represents ${formatPercent(
                  portfolio.largestHolding.weightPercent,
                )}% of the portfolio, making concentration the biggest risk to the plan.`}
                status="Monitor"
              />
            </div>
          </article>

          <article className="rounded-[1.75rem] bg-slate-900 p-7 text-white shadow-lg">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
              Next milestone
            </p>

            <h2 className="mt-3 text-4xl font-bold">€100,000</h2>

            <p className="mt-3 leading-7 text-slate-300">
              The first major milestone is close. Reaching it strengthens the
              compounding effect and makes future percentage gains more
              meaningful in euro terms.
            </p>

            <div className="mt-7 rounded-2xl bg-white/10 p-5">
              <p className="text-sm text-slate-400">Still required</p>

              <p className="mt-1 text-2xl font-bold">
                {formatCurrency(
                  Math.max(100_000 - portfolio.totalValue, 0),
                )}
              </p>
            </div>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              The assumptions on this page are planning scenarios, not
              guarantees or personalised financial advice.
            </p>
          </article>
        </section>
      </div>
    </main>
  );
}

function MetricCard({
  label,
  value,
  subtitle,
}: {
  label: string;
  value: string;
  subtitle: string;
}) {
  return (
    <article className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>

      <p className="mt-2 text-sm leading-6 text-slate-500">{subtitle}</p>
    </article>
  );
}

function AssessmentRow({
  title,
  text,
  status,
}: {
  title: string;
  text: string;
  status: string;
}) {
  return (
    <div className="flex items-start gap-4">
      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-slate-900" />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold text-slate-900">{title}</h3>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
            {status}
          </span>
        </div>

        <p className="mt-1 text-sm leading-6 text-slate-600">{text}</p>
      </div>
    </div>
  );
}