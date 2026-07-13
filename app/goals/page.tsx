"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Flag,
  Gauge,
  Home,
  LineChart,
  PiggyBank,
  Rocket,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

type Currency = "EUR" | "USD" | "GBP";

type Holding = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: Currency;
};

type Scenario = {
  name: string;
  annualReturn: number;
  description: string;
  tone: "bear" | "base" | "bull";
};

type ProjectionPoint = {
  year: number;
  portfolioValue: number;
};

const fallbackHoldings: Holding[] = [
  {
    id: 1,
    symbol: "IB1T",
    name: "iShares Bitcoin ETP",
    quantity: 11269,
    purchasePrice: 5.16,
    currentPrice: 5.16,
    currency: "EUR",
  },
  {
    id: 2,
    symbol: "STRC",
    name: "21Shares Strategy Yield ETP",
    quantity: 450,
    purchasePrice: 15.56,
    currentPrice: 15.56,
    currency: "EUR",
  },
  {
    id: 3,
    symbol: "VWCE",
    name: "Vanguard FTSE All-World ETF",
    quantity: 99,
    purchasePrice: 87.88,
    currentPrice: 87.88,
    currency: "EUR",
  },
  {
    id: 4,
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies ETF",
    quantity: 161,
    purchasePrice: 46.58,
    currentPrice: 46.58,
    currency: "EUR",
  },
  {
    id: 5,
    symbol: "AIFS",
    name: "AI Infrastructure ETF",
    quantity: 520,
    purchasePrice: 10.19,
    currentPrice: 10.19,
    currency: "EUR",
  },
  {
    id: 6,
    symbol: "PPFB",
    name: "iShares Physical Gold ETC",
    quantity: 200,
    purchasePrice: 10,
    currentPrice: 10,
    currency: "EUR",
  },
];

const scenarios: Scenario[] = [
  {
    name: "Bear case",
    annualReturn: 7,
    description:
      "Slower markets, prolonged volatility and lower-than-expected growth.",
    tone: "bear",
  },
  {
    name: "Base case",
    annualReturn: 15,
    description:
      "Strong long-term growth with periods of normal market volatility.",
    tone: "base",
  },
  {
    name: "Bull case",
    annualReturn: 25,
    description:
      "Bitcoin and growth themes perform exceptionally strongly.",
    tone: "bull",
  },
];

const TARGET_VALUE = 1_000_000;
const TARGET_YEAR = 2036;
const DEFAULT_ANNUAL_CONTRIBUTION = 15_000;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDetailedCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number, decimals = 1) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

function calculatePortfolioValue(holdings: Holding[]) {
  return holdings.reduce(
    (total, holding) =>
      total + holding.quantity * holding.currentPrice,
    0
  );
}

function calculateFutureValue(
  startingValue: number,
  annualContribution: number,
  annualReturn: number,
  years: number
) {
  let value = startingValue;

  for (let year = 0; year < years; year += 1) {
    value = value * (1 + annualReturn / 100);
    value += annualContribution;
  }

  return value;
}

function calculateProjection(
  startingValue: number,
  annualContribution: number,
  annualReturn: number,
  startYear: number,
  endYear: number
): ProjectionPoint[] {
  const result: ProjectionPoint[] = [];
  let value = startingValue;

  result.push({
    year: startYear,
    portfolioValue: value,
  });

  for (let year = startYear + 1; year <= endYear; year += 1) {
    value = value * (1 + annualReturn / 100);
    value += annualContribution;

    result.push({
      year,
      portfolioValue: value,
    });
  }

  return result;
}

function calculateRequiredReturn(
  startingValue: number,
  annualContribution: number,
  targetValue: number,
  years: number
) {
  if (startingValue <= 0 || years <= 0) {
    return 0;
  }

  let lower = -0.99;
  let upper = 2;

  for (let iteration = 0; iteration < 200; iteration += 1) {
    const middle = (lower + upper) / 2;
    let value = startingValue;

    for (let year = 0; year < years; year += 1) {
      value = value * (1 + middle);
      value += annualContribution;
    }

    if (value < targetValue) {
      lower = middle;
    } else {
      upper = middle;
    }
  }

  return ((lower + upper) / 2) * 100;
}

function calculateYearsToTarget(
  startingValue: number,
  annualContribution: number,
  annualReturn: number,
  targetValue: number
) {
  let value = startingValue;

  for (let year = 1; year <= 100; year += 1) {
    value = value * (1 + annualReturn / 100);
    value += annualContribution;

    if (value >= targetValue) {
      return year;
    }
  }

  return null;
}

function getScenarioClasses(tone: Scenario["tone"]) {
  if (tone === "bull") {
    return {
      container: "border-emerald-200 bg-emerald-50",
      badge: "bg-emerald-100 text-emerald-700",
      icon: "bg-emerald-100 text-emerald-700",
      progress: "bg-emerald-500",
    };
  }

  if (tone === "bear") {
    return {
      container: "border-amber-200 bg-amber-50",
      badge: "bg-amber-100 text-amber-700",
      icon: "bg-amber-100 text-amber-700",
      progress: "bg-amber-500",
    };
  }

  return {
    container: "border-blue-200 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
    icon: "bg-blue-100 text-blue-700",
    progress: "bg-blue-500",
  };
}

export default function GoalsPage() {
  const router = useRouter();

  const [holdings, setHoldings] = useState<Holding[]>(
    fallbackHoldings
  );

  const [annualContribution, setAnnualContribution] = useState(
    DEFAULT_ANNUAL_CONTRIBUTION
  );

  const [selectedScenario, setSelectedScenario] =
    useState<Scenario>(scenarios[1]);

  const [isLoaded, setIsLoaded] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearsRemaining = Math.max(TARGET_YEAR - currentYear, 1);

  useEffect(() => {
    try {
      const savedPortfolio = localStorage.getItem(
        "investment-os-portfolio"
      );

      const savedAnnualContribution = localStorage.getItem(
        "investment-os-annual-contribution"
      );

      if (savedPortfolio) {
        const parsedPortfolio = JSON.parse(savedPortfolio) as Holding[];

        if (Array.isArray(parsedPortfolio)) {
          setHoldings(parsedPortfolio);
        }
      }

      if (savedAnnualContribution) {
        const parsedContribution = Number(savedAnnualContribution);

        if (
          Number.isFinite(parsedContribution) &&
          parsedContribution >= 0
        ) {
          setAnnualContribution(parsedContribution);
        }
      }
    } catch (error) {
      console.error("Could not load goal data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    localStorage.setItem(
      "investment-os-annual-contribution",
      String(annualContribution)
    );
  }, [annualContribution, isLoaded]);

  const currentPortfolioValue = useMemo(
    () => calculatePortfolioValue(holdings),
    [holdings]
  );

  const goalProgress = Math.min(
    (currentPortfolioValue / TARGET_VALUE) * 100,
    100
  );

  const capitalRemaining = Math.max(
    TARGET_VALUE - currentPortfolioValue,
    0
  );

  const requiredAnnualReturn = calculateRequiredReturn(
    currentPortfolioValue,
    annualContribution,
    TARGET_VALUE,
    yearsRemaining
  );

  const selectedProjection = useMemo(
    () =>
      calculateProjection(
        currentPortfolioValue,
        annualContribution,
        selectedScenario.annualReturn,
        currentYear,
        TARGET_YEAR
      ),
    [
      annualContribution,
      currentPortfolioValue,
      currentYear,
      selectedScenario,
    ]
  );

  const selectedFutureValue =
    selectedProjection[selectedProjection.length - 1]
      ?.portfolioValue ?? currentPortfolioValue;

  const projectedSurplus =
    selectedFutureValue - TARGET_VALUE;

  const projectedYearsToTarget = calculateYearsToTarget(
    currentPortfolioValue,
    annualContribution,
    selectedScenario.annualReturn,
    TARGET_VALUE
  );

  const targetYearAtSelectedScenario = projectedYearsToTarget
    ? currentYear + projectedYearsToTarget
    : null;

  const totalFutureContributions =
    annualContribution * yearsRemaining;

  const projectedInvestmentGrowth =
    selectedFutureValue -
    currentPortfolioValue -
    totalFutureContributions;

  const monthlyContribution = annualContribution / 12;

  const requiredMonthlyGrowth =
    Math.pow(1 + requiredAnnualReturn / 100, 1 / 12) - 1;

  const requiredWeeklyGrowth =
    Math.pow(1 + requiredAnnualReturn / 100, 1 / 52) - 1;

  const requiredDailyGrowth =
    Math.pow(1 + requiredAnnualReturn / 100, 1 / 365) - 1;

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading Project Million...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen bg-slate-50 px-5 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-8 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100"
            >
              <Home className="h-4 w-4" />
              Home
            </Link>
          </div>

          <section className="mt-6 overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
            <div className="grid gap-9 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-violet-500/20 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-violet-200">
                    Project Million
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">
                    Target year {TARGET_YEAR}
                  </span>
                </div>

                <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                  Build the portfolio to{" "}
                  <span className="text-violet-300">
                    €1,000,000
                  </span>
                </h1>

                <p className="mt-5 max-w-3xl text-base leading-7 text-slate-300">
                  Investment OS translates your current portfolio,
                  annual contributions and expected return into a clear
                  path towards financial independence.
                </p>

                <div className="mt-8">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-400">
                        Current progress
                      </p>

                      <p className="mt-1 text-3xl font-bold">
                        {formatCurrency(currentPortfolioValue)}
                      </p>
                    </div>

                    <p className="text-xl font-bold text-violet-300">
                      {formatPercentage(goalProgress)}
                    </p>
                  </div>

                  <div className="mt-4 h-4 overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500 transition-all duration-700"
                      style={{
                        width: `${Math.max(
                          Math.min(goalProgress, 100),
                          1
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="mt-3 flex justify-between text-xs font-semibold text-slate-400">
                    <span>Starting point</span>
                    <span>{formatCurrency(TARGET_VALUE)}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-200">
                    <Trophy className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Capital remaining
                    </p>

                    <p className="mt-1 text-2xl font-bold">
                      {formatCurrency(capitalRemaining)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <HeroRow
                    label="Time remaining"
                    value={`${yearsRemaining} years`}
                  />

                  <HeroRow
                    label="Required annual return"
                    value={formatPercentage(requiredAnnualReturn)}
                  />

                  <HeroRow
                    label="Annual contribution"
                    value={formatCurrency(annualContribution)}
                  />

                  <HeroRow
                    label="Selected scenario"
                    value={selectedScenario.name}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Current portfolio"
              value={formatCurrency(currentPortfolioValue)}
              description="Loaded from your portfolio"
              tone="neutral"
            />

            <MetricCard
              icon={<PiggyBank className="h-5 w-5" />}
              label="Monthly contribution"
              value={formatDetailedCurrency(monthlyContribution)}
              description={`${formatCurrency(
                annualContribution
              )} per year`}
              tone="positive"
            />

            <MetricCard
              icon={<TrendingUp className="h-5 w-5" />}
              label="Required return"
              value={formatPercentage(requiredAnnualReturn)}
              description={`To reach the target in ${yearsRemaining} years`}
              tone={
                requiredAnnualReturn <= 15
                  ? "positive"
                  : requiredAnnualReturn <= 25
                    ? "warning"
                    : "negative"
              }
            />

            <MetricCard
              icon={<CalendarDays className="h-5 w-5" />}
              label="Projected target year"
              value={
                targetYearAtSelectedScenario
                  ? String(targetYearAtSelectedScenario)
                  : "Beyond range"
              }
              description={`${selectedScenario.annualReturn}% scenario`}
              tone={
                targetYearAtSelectedScenario &&
                targetYearAtSelectedScenario <= TARGET_YEAR
                  ? "positive"
                  : "warning"
              }
            />
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[0.75fr_1.25fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <PiggyBank className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Contribution plan
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Annual investment
                  </h2>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-slate-500">
                Change the amount you expect to add each year. Your
                Project Million projections update immediately.
              </p>

              <label className="mt-7 block">
                <span className="text-sm font-bold text-slate-700">
                  Annual contribution
                </span>

                <div className="mt-2 flex items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
                  <span className="font-bold text-slate-500">€</span>

                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={annualContribution}
                    onChange={(event) => {
                      const value = Number(event.target.value);

                      if (Number.isFinite(value) && value >= 0) {
                        setAnnualContribution(value);
                      }
                    }}
                    className="w-full bg-transparent px-3 py-4 text-xl font-bold outline-none"
                  />
                </div>
              </label>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {[10000, 15000, 20000].map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    onClick={() => setAnnualContribution(amount)}
                    className={`rounded-xl px-3 py-3 text-sm font-bold transition ${
                      annualContribution === amount
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {formatCurrency(amount)}
                  </button>
                ))}
              </div>

              <div className="mt-7 rounded-2xl bg-slate-950 p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                  Total future contributions
                </p>

                <p className="mt-2 text-3xl font-bold">
                  {formatCurrency(totalFutureContributions)}
                </p>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Based on {yearsRemaining} remaining years and the
                  current annual plan.
                </p>
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                      <LineChart className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Growth projection
                      </p>

                      <h2 className="mt-1 text-2xl font-bold">
                        Portfolio path
                      </h2>
                    </div>
                  </div>
                </div>

                <span className="w-fit rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
                  {selectedScenario.name} ·{" "}
                  {selectedScenario.annualReturn}% yearly
                </span>
              </div>

              <ProjectionChart
                projection={selectedProjection}
                targetValue={TARGET_VALUE}
              />

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <ProjectionMetric
                  label="Projected value"
                  value={formatCurrency(selectedFutureValue)}
                />

                <ProjectionMetric
                  label="Investment growth"
                  value={formatCurrency(
                    Math.max(projectedInvestmentGrowth, 0)
                  )}
                />

                <ProjectionMetric
                  label={
                    projectedSurplus >= 0
                      ? "Above target"
                      : "Below target"
                  }
                  value={`${projectedSurplus >= 0 ? "+" : "-"}${formatCurrency(
                    Math.abs(projectedSurplus)
                  )}`}
                  tone={projectedSurplus >= 0 ? "positive" : "warning"}
                />
              </div>
            </article>
          </section>

          <section className="mt-7">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                Scenario engine
              </p>

              <h2 className="mt-2 text-3xl font-bold tracking-[-0.03em]">
                Choose your growth scenario
              </h2>

              <p className="mt-3 max-w-3xl leading-7 text-slate-500">
                These scenarios are planning tools, not guarantees.
                Select one to update the complete projection.
              </p>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              {scenarios.map((scenario) => {
                const classes = getScenarioClasses(scenario.tone);

                const futureValue = calculateFutureValue(
                  currentPortfolioValue,
                  annualContribution,
                  scenario.annualReturn,
                  yearsRemaining
                );

                const scenarioProgress = Math.min(
                  (futureValue / TARGET_VALUE) * 100,
                  100
                );

                const isSelected =
                  selectedScenario.name === scenario.name;

                return (
                  <button
                    key={scenario.name}
                    type="button"
                    onClick={() => setSelectedScenario(scenario)}
                    className={`rounded-[28px] border p-6 text-left shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${
                      classes.container
                    } ${
                      isSelected
                        ? "ring-2 ring-slate-950 ring-offset-2"
                        : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div
                        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${classes.icon}`}
                      >
                        {scenario.tone === "bull" ? (
                          <Rocket className="h-5 w-5" />
                        ) : scenario.tone === "base" ? (
                          <Target className="h-5 w-5" />
                        ) : (
                          <Gauge className="h-5 w-5" />
                        )}
                      </div>

                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-bold ${classes.badge}`}
                      >
                        {scenario.annualReturn}% yearly
                      </span>
                    </div>

                    <h3 className="mt-5 text-2xl font-bold">
                      {scenario.name}
                    </h3>

                    <p className="mt-3 min-h-[72px] text-sm leading-6 text-slate-600">
                      {scenario.description}
                    </p>

                    <div className="mt-6">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                        Projected value in {TARGET_YEAR}
                      </p>

                      <p className="mt-2 text-3xl font-black tracking-[-0.04em]">
                        {formatCurrency(futureValue)}
                      </p>
                    </div>

                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/70">
                      <div
                        className={`h-full rounded-full ${classes.progress}`}
                        style={{
                          width: `${Math.max(scenarioProgress, 2)}%`,
                        }}
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs font-bold text-slate-500">
                      <span>
                        {formatPercentage(scenarioProgress)} of target
                      </span>

                      {futureValue >= TARGET_VALUE ? (
                        <span className="flex items-center gap-1 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Target reached
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          Gap remains
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <Gauge className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Required pace
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Growth translated into time
                  </h2>
                </div>
              </div>

              <p className="mt-5 leading-7 text-slate-500">
                To reach €1 million by {TARGET_YEAR}, the portfolio
                currently requires approximately{" "}
                <strong className="text-slate-950">
                  {formatPercentage(requiredAnnualReturn)}
                </strong>{" "}
                average annual growth, including your planned
                contributions.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <PaceCard
                  label="Per day"
                  value={formatPercentage(
                    requiredDailyGrowth * 100,
                    3
                  )}
                />

                <PaceCard
                  label="Per week"
                  value={formatPercentage(
                    requiredWeeklyGrowth * 100,
                    2
                  )}
                />

                <PaceCard
                  label="Per month"
                  value={formatPercentage(
                    requiredMonthlyGrowth * 100,
                    2
                  )}
                />
              </div>
            </article>

            <article className="rounded-[28px] bg-slate-950 p-7 text-white shadow-lg sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Investment OS verdict
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {requiredAnnualReturn <= 15
                      ? "The target remains achievable"
                      : requiredAnnualReturn <= 25
                        ? "The target is ambitious"
                        : "The current path needs strengthening"}
                  </h2>
                </div>
              </div>

              <p className="mt-5 leading-7 text-slate-300">
                {requiredAnnualReturn <= 15
                  ? "Your current capital and annual contribution create a realistic path towards the target. The focus should remain on consistent investing, diversification and avoiding unnecessary risk."
                  : requiredAnnualReturn <= 25
                    ? "Reaching the target is possible, but it requires strong long-term performance. Increasing annual contributions would reduce the return you need from the market."
                    : "The required return is extremely high. The most reliable improvement would come from increasing contributions, extending the timeline or combining both."}
              </p>

              <div className="mt-6 space-y-3">
                <VerdictRow
                  number="1"
                  text="Keep annual contributions consistent"
                />

                <VerdictRow
                  number="2"
                  text="Reduce portfolio concentration over time"
                />

                <VerdictRow
                  number="3"
                  text="Review progress at every portfolio update"
                />
              </div>
            </article>
          </section>

          <section className="mt-7 rounded-[28px] bg-gradient-to-br from-blue-600 to-violet-700 p-7 text-white shadow-lg sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 text-blue-100">
                  <Flag className="h-5 w-5" />

                  <p className="text-sm font-bold uppercase tracking-[0.14em]">
                    Project Million
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Every portfolio update moves the mission forward
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                  Your goal dashboard now automatically responds to
                  portfolio values and annual contributions. The next
                  portfolio upload will immediately update the complete
                  projection.
                </p>
              </div>

              <Link
                href="/portfolio"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm"
              >
                View portfolio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <p className="text-sm font-bold text-amber-900">
              Planning disclaimer
            </p>

            <p className="mt-2 text-sm leading-6 text-amber-800">
              Projections are illustrative scenarios and are not
              guarantees. Actual returns, contributions, inflation,
              taxes, product costs and market conditions can differ
              materially.
            </p>
          </section>
        </div>
      </main>

      <BottomNavigation />
    </>
  );
}

function HeroRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 last:border-none last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>

      <span className="text-right text-sm font-bold text-white">
        {value}
      </span>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone: "neutral" | "positive" | "warning" | "negative";
}) {
  const toneClasses = {
    neutral: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
    negative: "bg-red-50 text-red-700",
  };

  const descriptionClasses = {
    neutral: "text-slate-500",
    positive: "text-emerald-600",
    warning: "text-amber-600",
    negative: "text-red-600",
  };

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
        {value}
      </p>

      <p
        className={`mt-1 text-xs font-bold ${descriptionClasses[tone]}`}
      >
        {description}
      </p>
    </article>
  );
}

function ProjectionChart({
  projection,
  targetValue,
}: {
  projection: ProjectionPoint[];
  targetValue: number;
}) {
  const maximumValue = Math.max(
    targetValue,
    ...projection.map((point) => point.portfolioValue)
  );

  const chartPoints = projection
    .map((point, index) => {
      const x =
        projection.length <= 1
          ? 0
          : (index / (projection.length - 1)) * 100;

      const y = 100 - (point.portfolioValue / maximumValue) * 88;

      return `${x},${Math.max(Math.min(y, 100), 2)}`;
    })
    .join(" ");

  const targetY =
    100 - Math.min((targetValue / maximumValue) * 88, 88);

  return (
    <div className="mt-8">
      <div className="relative h-72 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        <div className="absolute inset-x-0 top-1/4 border-t border-dashed border-slate-200" />
        <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-slate-200" />
        <div className="absolute inset-x-0 top-3/4 border-t border-dashed border-slate-200" />

        <div
          className="absolute inset-x-0 z-10 border-t-2 border-dashed border-violet-300"
          style={{ top: `${targetY}%` }}
        >
          <span className="absolute right-3 -top-7 rounded-lg bg-violet-100 px-2 py-1 text-[10px] font-bold text-violet-700">
            €1M target
          </span>
        </div>

        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
          aria-label="Portfolio projection chart"
        >
          <defs>
            <linearGradient
              id="projectionArea"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor="rgb(124 58 237)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="rgb(124 58 237)" stopOpacity="0" />
            </linearGradient>
          </defs>

          <polygon
            points={`0,100 ${chartPoints} 100,100`}
            fill="url(#projectionArea)"
          />

          <polyline
            points={chartPoints}
            fill="none"
            stroke="rgb(124 58 237)"
            strokeWidth="2.5"
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className="absolute inset-x-4 bottom-3 flex justify-between text-[10px] font-bold text-slate-400">
          {projection
            .filter(
              (_, index) =>
                index === 0 ||
                index === projection.length - 1 ||
                index === Math.floor(projection.length / 2)
            )
            .map((point) => (
              <span key={point.year}>{point.year}</span>
            ))}
        </div>
      </div>
    </div>
  );
}

function ProjectionMetric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "positive" | "warning";
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-bold uppercase tracking-[0.13em] text-slate-400">
        {label}
      </p>

      <p
        className={`mt-2 text-xl font-bold ${
          tone === "positive"
            ? "text-emerald-700"
            : tone === "warning"
              ? "text-amber-700"
              : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function PaceCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {value}
      </p>
    </div>
  );
}

function VerdictRow({
  number,
  text,
}: {
  number: string;
  text: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white font-bold text-slate-950">
        {number}
      </div>

      <p className="text-sm font-semibold text-slate-100">
        {text}
      </p>
    </div>
  );
}