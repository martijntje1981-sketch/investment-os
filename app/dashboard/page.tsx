"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bitcoin,
  BriefcaseBusiness,
  CalendarDays,
  ChartNoAxesColumnIncreasing,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Goal,
  Layers3,
  Newspaper,
  PieChart,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
  Upload,
  WalletCards,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";

type Currency = "EUR" | "USD" | "GBP";

type Holding = {
  id: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: Currency;
  confidence?: "High" | "Medium" | "Low";
  changePercent?: number;
  updatedAt?: string;
  assetType?: "investment" | "cash";
};

type PortfolioMetric = {
  label: string;
  value: string;
  description: string;
  tone: "neutral" | "positive" | "negative" | "warning";
  icon: React.ReactNode;
};

type CachedPrice = {
  symbol: string;
  price: number;
  changePercent?: number;
  updatedAt?: string;
};

type GoalSettings = {
  targetValue: number;
  targetYear: number;
  monthlyContribution: number;
  expectedAnnualReturn: number;
};

const PRICE_CACHE_KEY = "investment-os-market-price-cache";
const GOAL_STORAGE_KEY = "investment-os-goal";
const HOLDINGS_STORAGE_KEY = "investment-os-holdings";


function applyCachedPrices(holdings: Holding[]): Holding[] {
  const cachedValue = localStorage.getItem(PRICE_CACHE_KEY);

  if (!cachedValue) return holdings;

  const parsed = JSON.parse(cachedValue) as CachedPrice[];

  if (!Array.isArray(parsed)) return holdings;

  const prices = new Map(
    parsed
      .filter((item) => Number.isFinite(item.price) && item.price > 0)
      .map((item) => [item.symbol.trim().toUpperCase(), item]),
  );

  return holdings.map((holding) => {
    const cached = prices.get(holding.symbol);

    return {
      ...holding,
      currentPrice: cached?.price ?? holding.currentPrice,
      changePercent:
        typeof cached?.changePercent === "number"
          ? cached.changePercent
          : undefined,
      updatedAt: cached?.updatedAt,
    };
  });
}

const TARGET_VALUE = 1_000_000;
const TARGET_YEAR = 2036;
const DEFAULT_ANNUAL_CONTRIBUTION = 15_000;
const DEFAULT_GOAL: GoalSettings = {
  targetValue: TARGET_VALUE,
  targetYear: TARGET_YEAR,
  monthlyContribution: DEFAULT_ANNUAL_CONTRIBUTION / 12,
  expectedAnnualReturn: 10,
};

function formatCurrency(
  value: number,
  currency: Currency = "EUR",
  decimals = 0,
) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatPercentage(value: number, decimals = 1) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value / 100);
}

function getHoldingValue(holding: Holding) {
  return holding.quantity * holding.currentPrice;
}

function getHoldingCost(holding: Holding) {
  return holding.quantity * holding.purchasePrice;
}

function calculatePortfolioValue(holdings: Holding[]) {
  return holdings.reduce(
    (total, holding) => total + getHoldingValue(holding),
    0,
  );
}

function calculatePortfolioCost(holdings: Holding[]) {
  return holdings.reduce(
    (total, holding) => total + getHoldingCost(holding),
    0,
  );
}

function calculateRequiredReturn(
  startingValue: number,
  annualContribution: number,
  targetValue: number,
  years: number,
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

function getHoldingCategory(symbol: string) {
  const categories: Record<string, string> = {
    IB1T: "Bitcoin",
    STRC: "Income",
    VWCE: "Global equities",
    NUKL: "Nuclear energy",
    AIFS: "AI infrastructure",
    PPFB: "Gold",
  };

  return categories[symbol.toUpperCase()] ?? "Investment";
}

function getHoldingRole(symbol: string) {
  const roles: Record<string, string> = {
    IB1T: "Growth engine",
    STRC: "Income layer",
    VWCE: "Diversification core",
    NUKL: "Thematic growth",
    AIFS: "Structural growth",
    PPFB: "Defensive diversifier",
  };

  return roles[symbol.toUpperCase()] ?? "Portfolio holding";
}

function getAllocationTone(allocation: number) {
  if (allocation >= 50) {
    return "bg-red-100 text-red-700";
  }

  if (allocation >= 25) {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-emerald-100 text-emerald-700";
}

function getMarketStatus(
  timeZone: string,
  openMinutes: number,
  closeMinutes: number,
) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0,
  );
  const currentMinutes = hour * 60 + minute;
  const isWeekday = weekday ? !["Sat", "Sun"].includes(weekday) : false;

  return isWeekday &&
    currentMinutes >= openMinutes &&
    currentMinutes < closeMinutes
    ? "Open"
    : "Closed";
}

function getDailyMove(holding: Holding) {
  if (
    typeof holding.changePercent !== "number" ||
    !Number.isFinite(holding.changePercent) ||
    holding.changePercent <= -100
  ) {
    return null;
  }

  const currentValue = getHoldingValue(holding);
  const previousValue = currentValue / (1 + holding.changePercent / 100);
  return currentValue - previousValue;
}

export default function DashboardPage() {
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [annualContribution, setAnnualContribution] = useState(
    DEFAULT_ANNUAL_CONTRIBUTION,
  );
  const [goal, setGoal] = useState<GoalSettings>(DEFAULT_GOAL);
  const [isLoaded, setIsLoaded] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearsRemaining = Math.max(goal.targetYear - currentYear, 1);

  useEffect(() => {
    try {
      const savedAnnualContribution = localStorage.getItem(
        "investment-os-annual-contribution",
      );
      const savedGoal = localStorage.getItem(GOAL_STORAGE_KEY);
      const savedHoldings = localStorage.getItem(HOLDINGS_STORAGE_KEY);

      let activeHoldings: Holding[] = [];
      if (savedHoldings) {
        const parsedHoldings = JSON.parse(savedHoldings) as Holding[];
        if (Array.isArray(parsedHoldings)) activeHoldings = parsedHoldings;
      }
      setHoldings(applyCachedPrices(activeHoldings));

      if (savedGoal) {
        const parsedGoal = JSON.parse(savedGoal) as Partial<GoalSettings>;
        const nextGoal = { ...DEFAULT_GOAL, ...parsedGoal };
        setGoal(nextGoal);
        setAnnualContribution(nextGoal.monthlyContribution * 12);
      }

      if (!savedGoal && savedAnnualContribution) {
        const parsedContribution = Number(savedAnnualContribution);

        if (Number.isFinite(parsedContribution) && parsedContribution >= 0) {
          setAnnualContribution(parsedContribution);
        }
      }
    } catch (error) {
      console.error("Could not load Investment OS data:", error);
    } finally {
      setIsLoaded(true);
    }
  }, []);

  useEffect(() => {
    const refreshPortfolio = () => {
      try {
        const savedHoldings = localStorage.getItem(HOLDINGS_STORAGE_KEY);
        const savedGoal = localStorage.getItem(GOAL_STORAGE_KEY);

        if (savedHoldings) {
          const parsedHoldings = JSON.parse(savedHoldings) as Holding[];

          if (Array.isArray(parsedHoldings)) {
            setHoldings(applyCachedPrices(parsedHoldings));
          }
        } else {
          setHoldings([]);
        }

        if (savedGoal) {
          const parsedGoal = JSON.parse(savedGoal) as Partial<GoalSettings>;
          const nextGoal = { ...DEFAULT_GOAL, ...parsedGoal };

          setGoal(nextGoal);
          setAnnualContribution(nextGoal.monthlyContribution * 12);
        }
      } catch (error) {
        console.error("Could not refresh Investment OS data:", error);
      }
    };

    window.addEventListener("focus", refreshPortfolio);
    window.addEventListener("storage", refreshPortfolio);

    return () => {
      window.removeEventListener("focus", refreshPortfolio);
      window.removeEventListener("storage", refreshPortfolio);
    };
  }, []);

  const portfolioValue = useMemo(
    () => calculatePortfolioValue(holdings),
    [holdings],
  );

  const investedCapital = useMemo(
    () => calculatePortfolioCost(holdings),
    [holdings],
  );

  const totalReturn = portfolioValue - investedCapital;

  const totalReturnPercentage =
    investedCapital > 0 ? (totalReturn / investedCapital) * 100 : 0;

  const sortedHoldings = useMemo(() => {
    return [...holdings].sort(
      (a, b) => getHoldingValue(b) - getHoldingValue(a),
    );
  }, [holdings]);

  const largestHolding = sortedHoldings[0];

  const largestHoldingValue = largestHolding
    ? getHoldingValue(largestHolding)
    : 0;

  const largestHoldingAllocation =
    portfolioValue > 0 ? (largestHoldingValue / portfolioValue) * 100 : 0;

  const goalProgress = Math.min((portfolioValue / goal.targetValue) * 100, 100);

  const requiredAnnualReturn = calculateRequiredReturn(
    portfolioValue,
    annualContribution,
    goal.targetValue,
    yearsRemaining,
  );

  const diversificationScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          Math.max(largestHoldingAllocation - 20, 0) * 1.2 +
          Math.min(holdings.length * 2, 12),
      ),
    ),
  );

  const portfolioHealthScore = Math.round(
    Math.max(
      0,
      Math.min(
        100,
        diversificationScore * 0.55 +
          (requiredAnnualReturn <= 15
            ? 92
            : requiredAnnualReturn <= 25
              ? 72
              : 48) *
            0.45,
      ),
    ),
  );

  const concentrationRisk =
    largestHoldingAllocation >= 50
      ? "High"
      : largestHoldingAllocation >= 30
        ? "Elevated"
        : "Controlled";

  const portfolioTone = totalReturn >= 0 ? "Constructive" : "Under pressure";

  const dailyDrivers = holdings
    .map((holding) => ({ holding, move: getDailyMove(holding) }))
    .filter(
      (item): item is { holding: Holding; move: number } =>
        typeof item.move === "number" && Number.isFinite(item.move),
    )
    .sort((a, b) => Math.abs(b.move) - Math.abs(a.move));

  const dailyPortfolioMove = dailyDrivers.reduce(
    (total, item) => total + item.move,
    0,
  );

  const dailyPortfolioMovePercentage =
    portfolioValue - dailyPortfolioMove > 0
      ? (dailyPortfolioMove / (portfolioValue - dailyPortfolioMove)) * 100
      : 0;

  const hasDailyMoveData = dailyDrivers.length > 0;
  const biggestDailyGainer = [...dailyDrivers]
    .filter((item) => item.move > 0)
    .sort((a, b) => b.move - a.move)[0];
  const biggestDailyLoser = [...dailyDrivers]
    .filter((item) => item.move < 0)
    .sort((a, b) => a.move - b.move)[0];
  const europeanMarketStatus = getMarketStatus(
    "Europe/Amsterdam",
    9 * 60,
    17 * 60 + 30,
  );
  const usMarketStatus = getMarketStatus(
    "America/New_York",
    9 * 60 + 30,
    16 * 60,
  );

  const metrics: PortfolioMetric[] = [
    {
      label: "Portfolio value",
      value: formatCurrency(portfolioValue),
      description: `${holdings.length} active holdings`,
      tone: "neutral",
      icon: <CircleDollarSign className="h-5 w-5" />,
    },
    {
      label: "Total return",
      value: `${totalReturn >= 0 ? "+" : ""}${formatCurrency(totalReturn)}`,
      description: `${
        totalReturnPercentage >= 0 ? "+" : ""
      }${formatPercentage(totalReturnPercentage)}`,
      tone: totalReturn >= 0 ? "positive" : "negative",
      icon:
        totalReturn >= 0 ? (
          <TrendingUp className="h-5 w-5" />
        ) : (
          <TrendingDown className="h-5 w-5" />
        ),
    },
    {
      label: "Goal progress",
      value: formatPercentage(goalProgress),
      description: `${formatCurrency(
        goal.targetValue - portfolioValue,
      )} remaining`,
      tone: "positive",
      icon: <Target className="h-5 w-5" />,
    },
    {
      label: "Portfolio health",
      value: `${portfolioHealthScore}/100`,
      description: `${concentrationRisk} concentration risk`,
      tone:
        portfolioHealthScore >= 80
          ? "positive"
          : portfolioHealthScore >= 65
            ? "warning"
            : "negative",
      icon: <Gauge className="h-5 w-5" />,
    },
  ];

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading Investment OS...
          </p>
        </div>
      </main>
    );
  }

  if (holdings.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-12 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[32px] bg-slate-950 p-8 text-white shadow-xl sm:p-12">
            <p className="text-sm font-bold uppercase tracking-[0.16em] text-blue-300">
              Your Investment OS
            </p>
            <h1 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              Start with your portfolio
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Add your holdings to unlock portfolio value, risk, concentration,
              goal progress and a personalised daily summary.
            </p>
            <Link
              href="/upload"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950"
            >
              <Upload className="h-4 w-4" />
              Add portfolio
            </Link>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <EmptyStateCard
              title="Markets today"
              text="Market status and major moves appear here."
            />
            <EmptyStateCard
              title="Macro headlines"
              text="Important macro developments appear here."
            />
            <EmptyStateCard
              title="Market status"
              text="Europe, US and crypto trading hours appear here."
            />
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px)+2rem)] pt-6 text-slate-950 sm:px-8 sm:pt-8">
        <div className="mx-auto w-full min-w-0 max-w-6xl">
          <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-lg">
                  <Sparkles className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                    Complete Investment Operating System
                  </p>

                  <p className="mt-1 text-sm font-semibold text-slate-500">
                    Portfolio intelligence, goals and market context
                  </p>
                </div>
              </div>

              <h1 className="mt-6 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                Your investment
                <span className="block text-slate-400">control centre</span>
              </h1>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <RefreshCw className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                  System status
                </p>

                <p className="mt-1 text-sm font-bold text-slate-950">
                  Portfolio loaded
                </p>
              </div>
            </div>
          </header>

          <section className="mt-8 overflow-hidden rounded-[32px] bg-slate-950 p-7 text-white shadow-xl sm:p-10">
            <div className="grid gap-9 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300">
                    {portfolioTone}
                  </span>

                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-300">
                    Personal goal active
                  </span>
                </div>

                <p className="mt-6 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">
                  Current portfolio value
                </p>

                <h2 className="mt-2 text-5xl font-black tracking-[-0.06em] sm:text-7xl">
                  {formatCurrency(portfolioValue)}
                </h2>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold ${
                      totalReturn >= 0
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {totalReturn >= 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : (
                      <TrendingDown className="h-4 w-4" />
                    )}

                    {totalReturn >= 0 ? "+" : ""}
                    {formatCurrency(totalReturn)}
                  </span>

                  <span className="text-sm font-semibold text-slate-400">
                    since purchase
                  </span>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <DailyHeroCard
                    label="Last 24 hours"
                    value={
                      hasDailyMoveData
                        ? `${dailyPortfolioMove >= 0 ? "+" : "−"}${formatCurrency(Math.abs(dailyPortfolioMove))}`
                        : "Awaiting data"
                    }
                    detail={
                      hasDailyMoveData
                        ? `${dailyPortfolioMovePercentage >= 0 ? "+" : "−"}${formatPercentage(Math.abs(dailyPortfolioMovePercentage))}`
                        : "Previous-close prices required"
                    }
                    tone={
                      !hasDailyMoveData
                        ? "neutral"
                        : dailyPortfolioMove >= 0
                          ? "positive"
                          : "negative"
                    }
                  />
                  <DailyHeroCard
                    label="Biggest positive"
                    value={
                      biggestDailyGainer?.holding.symbol ?? "No positive move"
                    }
                    detail={
                      biggestDailyGainer
                        ? `+${formatCurrency(biggestDailyGainer.move)} · +${formatPercentage(biggestDailyGainer.holding.changePercent ?? 0)}`
                        : "No positive holding today"
                    }
                    tone={biggestDailyGainer ? "positive" : "neutral"}
                  />
                  <DailyHeroCard
                    label="Biggest negative"
                    value={
                      biggestDailyLoser?.holding.symbol ?? "No negative move"
                    }
                    detail={
                      biggestDailyLoser
                        ? `−${formatCurrency(Math.abs(biggestDailyLoser.move))} · −${formatPercentage(Math.abs(biggestDailyLoser.holding.changePercent ?? 0))}`
                        : "No negative holding today"
                    }
                    tone={biggestDailyLoser ? "negative" : "neutral"}
                  />
                </div>

                <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">
                  {largestHolding?.symbol ?? "Your largest holding"} represents{" "}
                  {formatPercentage(largestHoldingAllocation)} of your
                  portfolio. Portfolio health is {portfolioHealthScore}/100 and
                  the average annual return required for your current goal is{" "}
                  {formatPercentage(requiredAnnualReturn)}.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href="/portfolio"
                    className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition hover:bg-slate-100"
                  >
                    View portfolio
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/upload"
                    className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/15"
                  >
                    <Upload className="h-4 w-4" />
                    Update portfolio
                  </Link>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Your goal
                    </p>

                    <p className="mt-2 text-3xl font-black">
                      {formatPercentage(goalProgress)}
                    </p>
                  </div>

                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-500/20 text-violet-300">
                    <Goal className="h-7 w-7" />
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 via-violet-500 to-fuchsia-500"
                    style={{
                      width: `${Math.max(goalProgress, 1)}%`,
                    }}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <HeroDetailRow
                    label="Target"
                    value={formatCurrency(goal.targetValue)}
                  />

                  <HeroDetailRow
                    label="Target year"
                    value={String(goal.targetYear)}
                  />

                  <HeroDetailRow
                    label="Annual contribution"
                    value={formatCurrency(annualContribution)}
                  />

                  <HeroDetailRow
                    label="Required return"
                    value={formatPercentage(requiredAnnualReturn)}
                  />
                </div>

                <Link
                  href="/goals"
                  className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-400"
                >
                  Open goal engine
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <MetricCard key={metric.label} {...metric} />
            ))}
          </section>

          <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-600">
                  Portfolio at a glance
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                  Where you stand now
                </h2>
              </div>
              <p className="max-w-xl text-sm leading-6 text-slate-500 sm:text-right">
                A concise view of portfolio structure. Scores are monitoring
                indicators, not personal financial advice.
              </p>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatusCard
                label="Risk"
                value={concentrationRisk}
                description={`${largestHolding?.symbol ?? "Largest holding"} is ${formatPercentage(largestHoldingAllocation)} of the portfolio.`}
                tone={
                  concentrationRisk === "Controlled" ? "positive" : "warning"
                }
              />
              <StatusCard
                label="Concentration"
                value={formatPercentage(largestHoldingAllocation)}
                description="Weight of the largest single position."
                tone={largestHoldingAllocation < 30 ? "positive" : "warning"}
              />
              <StatusCard
                label="Correlation"
                value="Pending history"
                description="Requires sufficient daily return history across holdings."
                tone="neutral"
              />
              <StatusCard
                label="Income"
                value="Not available"
                description="Dividend metrics appear after verified distribution data is connected."
                tone="neutral"
              />
            </div>
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <PieChart className="h-5 w-5" />
                    </div>

                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                        Portfolio allocation
                      </p>

                      <h2 className="mt-1 text-2xl font-bold">
                        Largest positions
                      </h2>
                    </div>
                  </div>
                </div>

                <Link
                  href="/portfolio"
                  className="inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-slate-950"
                >
                  View all
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-7 space-y-4">
                {sortedHoldings.slice(0, 5).map((holding) => {
                  const value = getHoldingValue(holding);

                  const allocation =
                    portfolioValue > 0 ? (value / portfolioValue) * 100 : 0;

                  return (
                    <Link
                      key={holding.id}
                      href={`/portfolio/${holding.symbol.toLowerCase()}`}
                      className="block rounded-2xl border border-slate-200 bg-slate-50 p-5 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-xs font-black text-white">
                            {holding.symbol.slice(0, 5)}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-slate-950">
                              {holding.name || holding.symbol}
                            </p>

                            <p className="mt-1 text-xs font-semibold text-slate-500">
                              {getHoldingRole(holding.symbol)}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <p className="font-bold text-slate-950">
                            {formatCurrency(value, holding.currency)}
                          </p>

                          <span
                            className={`mt-1 inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ${getAllocationTone(
                              allocation,
                            )}`}
                          >
                            {formatPercentage(allocation)}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-slate-950"
                          style={{
                            width: `${Math.min(allocation, 100)}%`,
                          }}
                        />
                      </div>
                    </Link>
                  );
                })}
              </div>
            </article>

            <div className="space-y-6">
              <article className="rounded-[28px] bg-slate-950 p-7 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                    <AlertTriangle className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Main portfolio risk
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">Concentration</h2>
                  </div>
                </div>

                {largestHolding ? (
                  <>
                    <p className="mt-5 leading-7 text-slate-300">
                      {largestHolding.symbol} currently represents{" "}
                      <strong className="text-white">
                        {formatPercentage(largestHoldingAllocation)}
                      </strong>{" "}
                      of the complete portfolio. This holding remains the
                      dominant source of both return potential and volatility.
                    </p>

                    <div className="mt-6 rounded-2xl bg-white/10 p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                            Largest position
                          </p>

                          <p className="mt-1 text-xl font-bold">
                            {largestHolding.symbol}
                          </p>
                        </div>

                        <p className="text-3xl font-black">
                          {formatPercentage(largestHoldingAllocation)}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="mt-5 text-slate-300">
                    Upload a portfolio to calculate concentration.
                  </p>
                )}

                <Link
                  href="/portfolio"
                  className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white"
                >
                  Review concentration
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <ShieldCheck className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Diversification score
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      {diversificationScore}/100
                    </h2>
                  </div>
                </div>

                <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full ${
                      diversificationScore >= 80
                        ? "bg-emerald-500"
                        : diversificationScore >= 60
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                    style={{
                      width: `${diversificationScore}%`,
                    }}
                  />
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-500">
                  Broad equities, gold and thematic positions improve
                  diversification, but the large Bitcoin allocation still
                  dominates the portfolio.
                </p>
              </article>
            </div>
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-3">
            <QuickActionCard
              href="/portfolio"
              icon={<BriefcaseBusiness className="h-6 w-6" />}
              eyebrow="Portfolio"
              title="Analyse every holding"
              description="View allocation, returns, thesis, risks and monitoring for every investment."
              action="Open portfolio"
              tone="dark"
            />

            <QuickActionCard
              href="/briefing"
              icon={<Newspaper className="h-6 w-6" />}
              eyebrow="Daily intelligence"
              title="Review market impact"
              description="See the market and macro developments that matter most for your holdings."
              action="Read briefing"
              tone="light"
            />

            <QuickActionCard
              href="/goals"
              icon={<Target className="h-6 w-6" />}
              eyebrow="Personal goal"
              title="Track the €1M mission"
              description="Compare scenarios, change contributions and monitor your required growth."
              action="Open goals"
              tone="gradient"
            />
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                  <Bitcoin className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Today&apos;s portfolio summary
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Why is my portfolio moving?
                  </h2>
                </div>
              </div>

              {hasDailyMoveData ? (
                <>
                  <p className="mt-5 leading-7 text-slate-600">
                    Your portfolio is {dailyPortfolioMove >= 0 ? "up" : "down"}{" "}
                    <strong className="text-slate-950">
                      {formatCurrency(Math.abs(dailyPortfolioMove))} (
                      {formatPercentage(Math.abs(dailyPortfolioMovePercentage))}
                      )
                    </strong>{" "}
                    based on the latest available daily market changes.
                  </p>
                  <div className="mt-6 space-y-3">
                    {dailyDrivers
                      .slice(0, 3)
                      .map(({ holding, move }, index) => (
                        <CoachRow
                          key={holding.id}
                          number={String(index + 1)}
                          text={`${holding.symbol}: ${move >= 0 ? "+" : "-"}${formatCurrency(Math.abs(move))} contribution`}
                        />
                      ))}
                  </div>
                </>
              ) : (
                <p className="mt-5 leading-7 text-slate-600">
                  Daily movement will be explained here after current and
                  previous-close data are available for your holdings. No daily
                  driver is inferred from incomplete data.
                </p>
              )}
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <CalendarDays className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Today&apos;s overview
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      Investment OS signals
                    </h2>
                  </div>
                </div>

                <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                  Updated
                </span>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <SignalCard
                  icon={<TrendingUp className="h-5 w-5" />}
                  label="Portfolio outlook"
                  value={portfolioTone}
                  description={`${totalReturn >= 0 ? "Positive" : "Negative"} return since purchase.`}
                  tone={totalReturn >= 0 ? "positive" : "warning"}
                />

                <SignalCard
                  icon={<Layers3 className="h-5 w-5" />}
                  label="Main risk"
                  value={concentrationRisk}
                  description="One position dominates portfolio movement."
                  tone="warning"
                />

                <SignalCard
                  icon={<ChartNoAxesColumnIncreasing className="h-5 w-5" />}
                  label="Goal requirement"
                  value={formatPercentage(requiredAnnualReturn)}
                  description="Average annual growth required."
                  tone={requiredAnnualReturn <= 15 ? "positive" : "warning"}
                />

                <SignalCard
                  icon={<WalletCards className="h-5 w-5" />}
                  label="Best diversifier"
                  value={
                    holdings.some(
                      (holding) => holding.symbol.toUpperCase() === "VWCE",
                    )
                      ? "VWCE"
                      : "Broad equities"
                  }
                  description="Improves portfolio resilience."
                  tone="neutral"
                />
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                    Market status
                  </p>
                  <p className="text-xs text-slate-400">
                    Regular trading hours
                  </p>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  <MarketStatus label="Europe" value={europeanMarketStatus} />
                  <MarketStatus label="United States" value={usMarketStatus} />
                  <MarketStatus label="Crypto" value="24/7" />
                </div>
              </div>
            </article>
          </section>

          <section className="mt-7 rounded-[28px] bg-gradient-to-br from-blue-600 to-violet-700 p-7 text-white shadow-lg sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="flex items-center gap-2 text-blue-100">
                  <Sparkles className="h-5 w-5" />

                  <p className="text-sm font-bold uppercase tracking-[0.14em]">
                    Complete Investment OS
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  Your portfolio, strategy and goal in one system
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                  Upload a new portfolio whenever your positions change. The
                  dashboard, holding pages and your personal goal projections
                  will update automatically.
                </p>
              </div>

              <Link
                href="/upload"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm"
              >
                <Upload className="h-4 w-4" />
                Update portfolio
              </Link>
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm font-bold text-slate-900">
              Important information
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Investment OS is a decision-support and monitoring tool. It does
              not provide personal financial advice and cannot guarantee future
              investment results.
            </p>
          </section>
        </div>
      </main>

      <BottomNavigation />
    </>
  );
}

function HeroDetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4 last:border-none last:pb-0">
      <span className="text-sm text-slate-400">{label}</span>

      <span className="text-right text-sm font-bold text-white">{value}</span>
    </div>
  );
}

function DailyHeroCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone: "positive" | "negative" | "neutral";
}) {
  const toneClasses = {
    positive: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    negative: "border-red-400/20 bg-red-400/10 text-red-300",
    neutral: "border-white/10 bg-white/5 text-slate-300",
  };

  return (
    <div className={`min-w-0 rounded-2xl border p-4 ${toneClasses[tone]}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 truncate text-lg font-black text-current">{value}</p>
      <p className="mt-1 text-xs font-semibold text-current/80">{detail}</p>
    </div>
  );
}

function EmptyStateCard({ title, text }: { title: string; text: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="font-black text-slate-950">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
    </article>
  );
}

function StatusCard({
  label,
  value,
  description,
  tone,
}: {
  label: string;
  value: string;
  description: string;
  tone: "positive" | "warning" | "neutral";
}) {
  const toneClasses = {
    positive: "bg-emerald-50 text-emerald-800",
    warning: "bg-amber-50 text-amber-800",
    neutral: "bg-slate-100 text-slate-700",
  };

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <span
        className={`mt-3 inline-flex rounded-full px-3 py-1.5 text-sm font-black ${toneClasses[tone]}`}
      >
        {value}
      </span>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}

function MarketStatus({ label, value }: { label: string; value: string }) {
  const isOpen = value === "Open" || value === "24/7";

  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3 text-center">
      <p className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={`mt-1 text-xs font-black ${isOpen ? "text-emerald-700" : "text-slate-500"}`}
      >
        {value}
      </p>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone,
}: PortfolioMetric) {
  const iconClasses = {
    neutral: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-50 text-emerald-700",
    negative: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
  };

  const descriptionClasses = {
    neutral: "text-slate-500",
    positive: "text-emerald-600",
    negative: "text-red-600",
    warning: "text-amber-600",
  };

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClasses[tone]}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>

      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
        {value}
      </p>

      <p className={`mt-1 text-xs font-bold ${descriptionClasses[tone]}`}>
        {description}
      </p>
    </article>
  );
}

function QuickActionCard({
  href,
  icon,
  eyebrow,
  title,
  description,
  action,
  tone,
}: {
  href: string;
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  tone: "dark" | "light" | "gradient";
}) {
  const containerClasses = {
    dark: "bg-slate-950 text-white",
    light: "border border-slate-200 bg-white text-slate-950",
    gradient: "bg-gradient-to-br from-blue-600 to-violet-700 text-white",
  };

  const iconClasses = {
    dark: "bg-white/10 text-white",
    light: "bg-slate-100 text-slate-700",
    gradient: "bg-white/15 text-white",
  };

  const eyebrowClasses = {
    dark: "text-slate-400",
    light: "text-slate-400",
    gradient: "text-blue-100",
  };

  const descriptionClasses = {
    dark: "text-slate-300",
    light: "text-slate-500",
    gradient: "text-blue-100",
  };

  return (
    <Link
      href={href}
      className={`group rounded-[28px] p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg ${containerClasses[tone]}`}
    >
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${iconClasses[tone]}`}
      >
        {icon}
      </div>

      <p
        className={`mt-6 text-xs font-bold uppercase tracking-[0.16em] ${eyebrowClasses[tone]}`}
      >
        {eyebrow}
      </p>

      <h3 className="mt-2 text-2xl font-bold">{title}</h3>

      <p
        className={`mt-3 min-h-[72px] text-sm leading-6 ${descriptionClasses[tone]}`}
      >
        {description}
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm font-bold">
        {action}

        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
      </div>
    </Link>
  );
}

function CoachRow({ number, text }: { number: string; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white">
        {number}
      </div>

      <p className="text-sm font-semibold text-slate-700">{text}</p>
    </div>
  );
}

function SignalCard({
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
  tone: "neutral" | "positive" | "warning";
}) {
  const iconClasses = {
    neutral: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClasses[tone]}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-slate-950">{value}</p>

      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}