"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  CircleDollarSign,
  Gauge,
  Home,
  Clock3,
  Newspaper,
  CalendarDays,
  LineChart,
  Layers3,
  PieChart,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import {
  applyCachedPrices,
  readPortfolioFromStorage,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";

type Currency = "EUR" | "USD" | "GBP";

type Holding = {
  id: number;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  currency: Currency;
  confidence?: "High" | "Medium" | "Low";
  changePercent?: number;
  updatedAt?: string;
};

type HoldingIntelligence = {
  category: string;
  role: string;
  stance: string;
  healthScore: number;
  concentrationLimit: number;
  thesis: string;
  osInsight: string;
  action: string;
  actionReason: string;
  drivers: {
    title: string;
    description: string;
  }[];
  risks: {
    title: string;
    description: string;
  }[];
  monitors: {
    title: string;
    description: string;
  }[];
};

function formatUpdatedAt(value?: string) {
  if (!value) return "Awaiting market data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Awaiting market data";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const holdingIntelligence: Record<string, HoldingIntelligence> = {
  IB1T: {
    category: "Digital assets",
    role: "Primary growth engine",
    stance: "Hold",
    healthScore: 88,
    concentrationLimit: 35,
    thesis:
      "IB1T gives the portfolio exposure to Bitcoin’s long-term adoption, scarcity and institutional demand without requiring direct self-custody.",
    osInsight:
      "This remains the portfolio’s strongest potential return driver, but it is also the largest source of concentration and volatility.",
    action: "Do not add",
    actionReason:
      "The long-term thesis remains intact, but new capital should currently strengthen diversification rather than increase Bitcoin exposure.",
    drivers: [
      {
        title: "Institutional adoption",
        description:
          "Growing institutional access and investment products can support long-term demand.",
      },
      {
        title: "Limited supply",
        description:
          "Bitcoin’s fixed maximum supply remains central to the long-term investment case.",
      },
      {
        title: "Global liquidity",
        description:
          "Improving liquidity conditions can provide support for scarce risk assets.",
      },
    ],
    risks: [
      {
        title: "Portfolio concentration",
        description:
          "A large allocation means Bitcoin movements can dominate total portfolio performance.",
      },
      {
        title: "High volatility",
        description:
          "Large price movements can occur even when the long-term thesis remains unchanged.",
      },
      {
        title: "Regulation",
        description:
          "Regulatory changes can affect adoption, access and market sentiment.",
      },
    ],
    monitors: [
      {
        title: "ETF flows",
        description:
          "Shows whether institutional capital is entering or leaving the market.",
      },
      {
        title: "Exchange balances",
        description:
          "Provides an indication of available Bitcoin supply on trading platforms.",
      },
      {
        title: "Macro liquidity",
        description:
          "Tracks whether the wider environment supports or pressures risk assets.",
      },
      {
        title: "Market structure",
        description:
          "Monitors volatility, leverage and potential liquidation risk.",
      },
    ],
  },

  STRC: {
    category: "Income",
    role: "Cash-flow layer",
    stance: "Hold",
    healthScore: 78,
    concentrationLimit: 15,
    thesis:
      "STRC adds an income-focused return source to the portfolio and reduces reliance on price appreciation alone.",
    osInsight:
      "The position improves portfolio cash flow, but it remains linked to the Bitcoin and Strategy ecosystem and is not a complete diversifier.",
    action: "Hold and monitor",
    actionReason:
      "The income function is valuable, but issuer structure, dividend sustainability and Bitcoin-linked risk should remain under review.",
    drivers: [
      {
        title: "Portfolio income",
        description:
          "Distributions can create a recurring cash-flow component within the portfolio.",
      },
      {
        title: "Different return source",
        description:
          "Income adds a return source beyond direct market-price appreciation.",
      },
      {
        title: "Capital flexibility",
        description:
          "Cash distributions can eventually be reinvested or used for living expenses.",
      },
    ],
    risks: [
      {
        title: "Issuer risk",
        description:
          "The investment outcome depends partly on the financial strength and structure of the issuer.",
      },
      {
        title: "Bitcoin relationship",
        description:
          "The position does not fully diversify the portfolio away from Bitcoin-related risk.",
      },
      {
        title: "Distribution changes",
        description:
          "Future distributions may change and should never be treated as guaranteed.",
      },
    ],
    monitors: [
      {
        title: "Distribution coverage",
        description:
          "Checks whether the income payments remain financially sustainable.",
      },
      {
        title: "Issuer balance sheet",
        description: "Tracks financial resilience and access to capital.",
      },
      {
        title: "Bitcoin exposure",
        description:
          "Measures how changes in Bitcoin affect the underlying investment case.",
      },
      {
        title: "Product structure",
        description:
          "Monitors changes to product terms, costs and investor protections.",
      },
    ],
  },

  VWCE: {
    category: "Global equities",
    role: "Diversification core",
    stance: "Build",
    healthScore: 94,
    concentrationLimit: 50,
    thesis:
      "VWCE provides broad exposure to thousands of companies across developed and emerging markets.",
    osInsight:
      "This is the portfolio’s strongest broad diversifier and reduces dependence on Bitcoin and concentrated thematic investments.",
    action: "Prioritise new contributions",
    actionReason:
      "Increasing this position improves regional, sector and company diversification without requiring the sale of high-conviction holdings.",
    drivers: [
      {
        title: "Global earnings growth",
        description:
          "Long-term corporate growth supports broad equity-market returns.",
      },
      {
        title: "Wide diversification",
        description:
          "Exposure is spread across countries, sectors and thousands of companies.",
      },
      {
        title: "Automatic rebalancing",
        description:
          "The index naturally changes as the global market composition evolves.",
      },
    ],
    risks: [
      {
        title: "Equity drawdowns",
        description:
          "Broad markets can experience meaningful declines during recessions and crises.",
      },
      {
        title: "US market weight",
        description:
          "Global indices currently remain heavily influenced by large US companies.",
      },
      {
        title: "Currency movements",
        description:
          "Foreign currency movements can affect the euro value of global investments.",
      },
    ],
    monitors: [
      {
        title: "Global earnings",
        description:
          "Tracks whether company profits continue supporting valuations.",
      },
      {
        title: "Market valuation",
        description:
          "Measures whether global equities are becoming expensive or attractive.",
      },
      {
        title: "Economic growth",
        description:
          "Monitors whether the global economy supports corporate performance.",
      },
      {
        title: "Market breadth",
        description:
          "Checks whether gains are broadly shared or driven by only a few companies.",
      },
    ],
  },

  NUKL: {
    category: "Nuclear energy",
    role: "Thematic growth",
    stance: "Build selectively",
    healthScore: 84,
    concentrationLimit: 15,
    thesis:
      "NUKL provides exposure to uranium, nuclear technology and growing electricity demand from electrification, data centres and AI infrastructure.",
    osInsight:
      "The structural investment case remains attractive, but the position can be cyclical and sensitive to commodity sentiment and policy changes.",
    action: "Build gradually",
    actionReason:
      "The long-term theme is strong, but purchases should remain controlled because uranium investments can experience large cyclical movements.",
    drivers: [
      {
        title: "Electricity demand",
        description:
          "AI, data centres and electrification require growing amounts of reliable power.",
      },
      {
        title: "Energy security",
        description:
          "Countries are increasingly focused on dependable domestic energy sources.",
      },
      {
        title: "Nuclear investment",
        description:
          "New reactors and reactor restarts can support long-term uranium demand.",
      },
    ],
    risks: [
      {
        title: "Commodity cycles",
        description:
          "Uranium-related investments can move sharply during changes in commodity sentiment.",
      },
      {
        title: "Political risk",
        description:
          "Nuclear policy can change following elections, accidents or public opposition.",
      },
      {
        title: "Project delays",
        description:
          "Nuclear projects are complex, expensive and regularly face construction delays.",
      },
    ],
    monitors: [
      {
        title: "Uranium price",
        description:
          "Tracks the underlying commodity environment for miners and producers.",
      },
      {
        title: "Reactor pipeline",
        description:
          "Monitors new builds, restarts and extensions of existing reactors.",
      },
      {
        title: "Long-term contracts",
        description:
          "Shows whether utilities are securing future uranium supply.",
      },
      {
        title: "Government policy",
        description:
          "Tracks subsidies, regulation and political support for nuclear energy.",
      },
    ],
  },

  AIFS: {
    category: "AI infrastructure",
    role: "Structural growth satellite",
    stance: "Build selectively",
    healthScore: 86,
    concentrationLimit: 15,
    thesis:
      "AIFS provides exposure to the physical infrastructure behind artificial intelligence, including data centres, semiconductors, networks and electricity systems.",
    osInsight:
      "The position captures a powerful long-term capital-investment theme, but valuations and technology spending should be watched carefully.",
    action: "Build gradually",
    actionReason:
      "The theme strengthens portfolio growth potential outside Bitcoin, but it should remain a controlled satellite rather than become another dominant position.",
    drivers: [
      {
        title: "AI investment",
        description:
          "Companies continue investing heavily in computing capacity and AI systems.",
      },
      {
        title: "Data-centre growth",
        description:
          "Rising computing demand supports infrastructure, energy and network investment.",
      },
      {
        title: "Semiconductor demand",
        description:
          "Advanced chips remain essential for training and operating AI models.",
      },
    ],
    risks: [
      {
        title: "High valuations",
        description:
          "Strong expectations can make AI-related investments vulnerable to disappointment.",
      },
      {
        title: "Capital-spending slowdown",
        description:
          "Reduced technology investment could weaken the growth outlook.",
      },
      {
        title: "Technology concentration",
        description:
          "The ETF may remain dependent on a relatively small number of major companies.",
      },
    ],
    monitors: [
      {
        title: "AI capital expenditure",
        description:
          "Tracks whether major technology companies continue increasing investment.",
      },
      {
        title: "Data-centre demand",
        description:
          "Measures growth in computing, electricity and network capacity.",
      },
      {
        title: "Semiconductor cycle",
        description:
          "Monitors chip demand, inventory and manufacturing capacity.",
      },
      {
        title: "Valuation",
        description:
          "Checks whether expected growth is already fully reflected in prices.",
      },
    ],
  },

  PPFB: {
    category: "Precious metals",
    role: "Defensive diversifier",
    stance: "Build selectively",
    healthScore: 90,
    concentrationLimit: 15,
    thesis:
      "PPFB provides exposure to physical gold and can support the portfolio during geopolitical stress, currency weakness and unexpected inflation.",
    osInsight:
      "Gold reduces dependency on growth assets and improves resilience, although it is not expected to be the portfolio’s primary growth engine.",
    action: "Strengthen gradually",
    actionReason:
      "A somewhat larger defensive allocation can improve balance while the portfolio remains heavily exposed to volatile growth assets.",
    drivers: [
      {
        title: "Monetary uncertainty",
        description:
          "Gold can benefit when confidence in currencies or monetary policy weakens.",
      },
      {
        title: "Central-bank demand",
        description:
          "Purchases by central banks can provide structural support.",
      },
      {
        title: "Geopolitical risk",
        description:
          "Investors often seek gold during periods of uncertainty and market stress.",
      },
    ],
    risks: [
      {
        title: "No cash flow",
        description: "Gold does not produce earnings, interest or dividends.",
      },
      {
        title: "Real interest rates",
        description:
          "Higher real rates can make non-yielding assets less attractive.",
      },
      {
        title: "Currency sensitivity",
        description:
          "Changes in the US dollar can influence gold prices and euro returns.",
      },
    ],
    monitors: [
      {
        title: "Real interest rates",
        description:
          "Tracks the relative attractiveness of holding a non-yielding asset.",
      },
      {
        title: "Central-bank purchases",
        description: "Monitors official-sector demand for physical gold.",
      },
      {
        title: "Inflation expectations",
        description:
          "Checks whether investors are becoming more concerned about purchasing power.",
      },
      {
        title: "Geopolitical stress",
        description:
          "Tracks events that may increase demand for defensive assets.",
      },
    ],
  },
};

const defaultIntelligence: HoldingIntelligence = {
  category: "Investment",
  role: "Portfolio holding",
  stance: "Review",
  healthScore: 75,
  concentrationLimit: 15,
  thesis:
    "This investment forms part of the portfolio. Its precise role and investment thesis should be reviewed and classified.",
  osInsight:
    "Investment OS has loaded the position successfully, but more product information is needed for a complete intelligence assessment.",
  action: "Review holding",
  actionReason:
    "Confirm the investment category, strategic role and acceptable portfolio allocation.",
  drivers: [
    {
      title: "Investment thesis",
      description:
        "Confirm which long-term development should drive this investment.",
    },
    {
      title: "Portfolio role",
      description:
        "Determine whether the holding provides growth, income or diversification.",
    },
    {
      title: "Expected return",
      description:
        "Define the return expectations and appropriate investment horizon.",
    },
  ],
  risks: [
    {
      title: "Unclassified risk",
      description:
        "The holding has not yet received a complete risk classification.",
    },
    {
      title: "Concentration",
      description:
        "Review whether the position size is appropriate for the portfolio.",
    },
    {
      title: "Thesis changes",
      description:
        "Monitor developments that could weaken the original investment case.",
    },
  ],
  monitors: [
    {
      title: "Price development",
      description:
        "Track price performance and meaningful changes in volatility.",
    },
    {
      title: "Investment thesis",
      description:
        "Review whether the reason for owning the investment remains intact.",
    },
    {
      title: "Portfolio allocation",
      description:
        "Monitor whether the position becomes too large or too small.",
    },
    {
      title: "Relevant news",
      description: "Follow developments that materially affect the investment.",
    },
  ],
};

function formatCurrency(value: number, currency: Currency = "EUR") {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

function getHoldingValue(holding: Holding) {
  return holding.quantity * holding.currentPrice;
}

function getCostValue(holding: Holding) {
  return holding.quantity * holding.purchasePrice;
}

function getReturnValue(holding: Holding) {
  return getHoldingValue(holding) - getCostValue(holding);
}

function getReturnPercentage(holding: Holding) {
  const costValue = getCostValue(holding);

  if (costValue <= 0) {
    return 0;
  }

  return (getReturnValue(holding) / costValue) * 100;
}

function getScoreClasses(score: number) {
  if (score >= 85) {
    return {
      background: "bg-emerald-50",
      text: "text-emerald-700",
      badge: "bg-emerald-100 text-emerald-700",
      label: "Strong",
    };
  }

  if (score >= 70) {
    return {
      background: "bg-amber-50",
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700",
      label: "Monitor",
    };
  }

  return {
    background: "bg-red-50",
    text: "text-red-700",
    badge: "bg-red-100 text-red-700",
    label: "Attention",
  };
}

export default function HoldingDetailPage() {
  const router = useRouter();
  const params = useParams<{ symbol: string }>();
  const { userSub, authReady } = useAuthenticatedUserSub();

  const symbol = decodeURIComponent(params.symbol ?? "").toUpperCase();

  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    if (!authReady) {
      setHoldings([]);
      setIsLoaded(false);
      return;
    }

    setHoldings([]);
    setIsLoaded(false);

    if (!userSub) {
      setIsLoaded(true);
      return;
    }

    try {
      const savedPortfolio = readPortfolioFromStorage(userSub);

      if (Array.isArray(savedPortfolio) && savedPortfolio.length > 0) {
        setHoldings(
          applyCachedPrices(
            userSub,
            savedPortfolio as unknown as StoredPortfolioHolding[],
          ) as unknown as Holding[],
        );
      }
    } catch (error) {
      console.error("Could not load portfolio:", error);
    } finally {
      setIsLoaded(true);
    }
  }, [authReady, userSub]);

  const holding = useMemo(() => {
    return holdings.find((item) => item.symbol.trim().toUpperCase() === symbol);
  }, [holdings, symbol]);

  const totalPortfolioValue = useMemo(() => {
    return holdings.reduce((total, item) => total + getHoldingValue(item), 0);
  }, [holdings]);

  const intelligence = holdingIntelligence[symbol] ?? defaultIntelligence;

  if (!isLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />

          <p className="mt-4 text-sm font-semibold text-slate-500">
            Loading holding intelligence...
          </p>
        </div>
      </main>
    );
  }

  if (!holding) {
    return (
      <>
        <main className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 sm:px-8">
          <div className="mx-auto max-w-4xl">
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>

              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm"
              >
                <Home className="h-4 w-4" />
                Home
              </Link>
            </div>

            <section className="mt-8 rounded-[32px] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />

              <h1 className="mt-5 text-3xl font-bold text-slate-950">
                Holding not found
              </h1>

              <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
                {symbol || "This investment"} is not available in the saved
                portfolio.
              </p>

              <Link
                href="/portfolio"
                className="mt-7 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white"
              >
                Return to portfolio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </section>
          </div>
        </main>

        <BottomNavigation />
      </>
    );
  }

  const currentValue = getHoldingValue(holding);
  const investedCapital = getCostValue(holding);
  const returnValue = getReturnValue(holding);
  const returnPercentage = getReturnPercentage(holding);

  const allocation =
    totalPortfolioValue > 0 ? (currentValue / totalPortfolioValue) * 100 : 0;

  const concentrationDifference = allocation - intelligence.concentrationLimit;

  const scoreClasses = getScoreClasses(intelligence.healthScore);
  const positiveReturn = returnValue >= 0;
  const aboveLimit = concentrationDifference > 0;
  const dailyChange = holding.changePercent;
  const hasDailyChange =
    typeof dailyChange === "number" && Number.isFinite(dailyChange);
  const thesisStatus =
    intelligence.healthScore >= 85
      ? "Thesis intact"
      : intelligence.healthScore >= 70
        ? "Under review"
        : "Thesis at risk";
  const thesisTone =
    intelligence.healthScore >= 85
      ? "positive"
      : intelligence.healthScore >= 70
        ? "warning"
        : "negative";

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
            <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                    {intelligence.category}
                  </span>

                  <span className="rounded-full bg-blue-500/20 px-3 py-1.5 text-xs font-bold text-blue-300">
                    {intelligence.stance}
                  </span>
                </div>

                <div className="mt-6 flex items-start gap-4">
                  <div className="flex h-14 min-w-14 items-center justify-center rounded-2xl bg-white text-sm font-black text-slate-950">
                    {holding.symbol.slice(0, 5)}
                  </div>

                  <div>
                    <h1 className="text-3xl font-bold tracking-[-0.04em] sm:text-5xl">
                      {holding.name || holding.symbol}
                    </h1>

                    <p className="mt-2 text-base font-semibold text-slate-400">
                      {intelligence.role}
                    </p>
                  </div>
                </div>

                <p className="mt-6 max-w-3xl text-base leading-7 text-slate-300">
                  {intelligence.osInsight}
                </p>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/5 p-6 text-center">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  Holding health
                </p>

                <p className="mt-3 text-6xl font-black tracking-[-0.06em] text-white">
                  {intelligence.healthScore}
                </p>

                <p className="mt-1 text-sm font-semibold text-slate-400">
                  out of 100
                </p>

                <span
                  className={`mt-5 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${scoreClasses.badge}`}
                >
                  {scoreClasses.label} holding
                </span>
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-4 md:grid-cols-4">
            <LiveMetric
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Current price"
              value={formatCurrency(holding.currentPrice, holding.currency)}
              detail={holding.symbol.toUpperCase()}
            />
            <LiveMetric
              icon={
                hasDailyChange && dailyChange >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
              label="Today's change"
              value={
                hasDailyChange
                  ? `${dailyChange >= 0 ? "+" : ""}${formatPercentage(dailyChange)}`
                  : "Awaiting data"
              }
              detail="Versus previous close"
              tone={
                !hasDailyChange
                  ? "neutral"
                  : dailyChange >= 0
                    ? "positive"
                    : "negative"
              }
            />
            <LiveMetric
              icon={<Clock3 className="h-5 w-5" />}
              label="Last updated"
              value={formatUpdatedAt(holding.updatedAt)}
              detail="Latest available market price"
            />
            <LiveMetric
              icon={<LineChart className="h-5 w-5" />}
              label="Market status"
              value="Latest close"
              detail="Live status will follow provider data"
            />
          </section>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={<CircleDollarSign className="h-5 w-5" />}
              label="Current value"
              value={formatCurrency(currentValue, holding.currency)}
              description={`${holding.quantity.toLocaleString("en-GB")} units`}
            />

            <MetricCard
              icon={<BarChart3 className="h-5 w-5" />}
              label="Invested capital"
              value={formatCurrency(investedCapital, holding.currency)}
              description={`${formatCurrency(
                holding.purchasePrice,
                holding.currency,
              )} average price`}
            />

            <MetricCard
              icon={
                positiveReturn ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )
              }
              label="Total return"
              value={`${positiveReturn ? "+" : ""}${formatCurrency(
                returnValue,
                holding.currency,
              )}`}
              description={`${returnPercentage >= 0 ? "+" : ""}${formatPercentage(
                returnPercentage,
              )}`}
              tone={positiveReturn ? "positive" : "negative"}
            />

            <MetricCard
              icon={<PieChart className="h-5 w-5" />}
              label="Portfolio allocation"
              value={formatPercentage(allocation)}
              description={
                aboveLimit
                  ? `${formatPercentage(
                      concentrationDifference,
                    )} above monitoring level`
                  : "Within monitoring level"
              }
              tone={aboveLimit ? "warning" : "positive"}
            />
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <article className="rounded-[28px] bg-slate-950 p-7 text-white shadow-lg sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10">
                  <Brain className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Investment thesis
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    Why this belongs in the portfolio
                  </h2>
                </div>
              </div>

              <p className="mt-6 leading-7 text-slate-300">
                {intelligence.thesis}
              </p>

              <div
                className={`mt-6 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${
                  thesisTone === "positive"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : thesisTone === "warning"
                      ? "bg-amber-500/20 text-amber-300"
                      : "bg-red-500/20 text-red-300"
                }`}
              >
                {thesisTone === "positive" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <AlertTriangle className="h-4 w-4" />
                )}
                {thesisStatus}
              </div>
            </article>

            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  <Target className="h-5 w-5" />
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                    Investment OS action
                  </p>

                  <h2 className="mt-1 text-2xl font-bold">
                    {intelligence.action}
                  </h2>
                </div>
              </div>

              <p className="mt-5 leading-7 text-slate-600">
                {intelligence.actionReason}
              </p>
            </article>
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-2">
            <IntelligenceCard
              title="What can drive this holding"
              subtitle="Long-term positive drivers"
              icon={<TrendingUp className="h-5 w-5" />}
              items={intelligence.drivers}
              tone="positive"
            />

            <IntelligenceCard
              title="What can weaken the thesis"
              subtitle="Risks and warning triggers"
              icon={<ShieldAlert className="h-5 w-5" />}
              items={intelligence.risks}
              tone="warning"
            />
          </section>

          <section className="mt-7 rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
                    <Gauge className="h-5 w-5" />
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      Continuous monitoring
                    </p>

                    <h2 className="mt-1 text-2xl font-bold">
                      What Investment OS follows
                    </h2>
                  </div>
                </div>
              </div>

              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                Thesis monitoring active
              </span>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {intelligence.monitors.map((monitor, index) => (
                <div
                  key={monitor.title}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white font-bold text-slate-700 shadow-sm">
                      {index + 1}
                    </div>

                    <div>
                      <h3 className="font-bold text-slate-950">
                        {monitor.title}
                      </h3>

                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {monitor.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-3">
            <ComingSoonCard
              title="Analyst consensus"
              description="Buy, hold and sell consensus from verified analyst data."
            />
            <ComingSoonCard
              title="Price targets"
              description="Consensus targets, upside and downside ranges."
            />
            <ComingSoonCard
              title="Market sentiment"
              description="News and market sentiment connected to this holding."
            />
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-2">
            <PlaceholderFeedCard
              icon={<Newspaper className="h-5 w-5" />}
              eyebrow="Holding intelligence"
              title="Latest news"
              description="Verified holding-specific news will appear here after the news provider is connected."
              action="Open insights"
              href="/news"
            />
            <PlaceholderFeedCard
              icon={<CalendarDays className="h-5 w-5" />}
              eyebrow="Forward calendar"
              title="Upcoming events"
              description="Earnings, distributions, ETF events and relevant macro dates will appear here."
              action="View upcoming events"
              href="/news"
            />
          </section>

          <section className="mt-7 grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
              <div className="flex items-center gap-3">
                <Layers3 className="h-5 w-5 text-slate-500" />

                <h2 className="text-xl font-bold">Position details</h2>
              </div>

              <div className="mt-6 divide-y divide-slate-100">
                <DetailRow
                  label="Symbol"
                  value={holding.symbol.toUpperCase()}
                />

                <DetailRow
                  label="Current price"
                  value={formatCurrency(holding.currentPrice, holding.currency)}
                />

                <DetailRow
                  label="Average purchase price"
                  value={formatCurrency(
                    holding.purchasePrice,
                    holding.currency,
                  )}
                />

                <DetailRow
                  label="Quantity"
                  value={holding.quantity.toLocaleString("en-GB")}
                />

                <DetailRow label="Currency" value={holding.currency} />
              </div>
            </article>

            <article
              className={`rounded-[28px] border p-7 shadow-sm ${
                aboveLimit
                  ? "border-amber-200 bg-amber-50"
                  : "border-emerald-200 bg-emerald-50"
              }`}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                    aboveLimit
                      ? "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {aboveLimit ? (
                    <AlertTriangle className="h-5 w-5" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                </div>

                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-[0.16em] ${
                      aboveLimit ? "text-amber-700" : "text-emerald-700"
                    }`}
                  >
                    Allocation check
                  </p>

                  <h2 className="mt-2 text-2xl font-bold text-slate-950">
                    {aboveLimit
                      ? "Position requires concentration monitoring"
                      : "Position is within its monitoring range"}
                  </h2>

                  <p className="mt-3 leading-7 text-slate-600">
                    The position currently represents{" "}
                    <strong>{formatPercentage(allocation)}</strong> of the
                    portfolio. Its Investment OS monitoring level is{" "}
                    <strong>
                      {formatPercentage(intelligence.concentrationLimit)}
                    </strong>
                    .
                  </p>
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
                    Portfolio intelligence
                  </p>
                </div>

                <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                  One holding is only one part of the mission
                </h2>

                <p className="mt-3 max-w-2xl leading-7 text-blue-100">
                  Return to the complete portfolio to see how this position
                  affects concentration, diversification and your long-term
                  goal.
                </p>
              </div>

              <Link
                href="/portfolio"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-slate-950 shadow-sm"
              >
                View complete portfolio
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </div>
      </main>

      <BottomNavigation />
    </>
  );
}

function LiveMetric({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  const tones = {
    neutral: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-50 text-emerald-700",
    negative: "bg-red-50 text-red-700",
  };

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}
      >
        {icon}
      </div>
      <p className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-xl font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500">{detail}</p>
    </article>
  );
}

function ComingSoonCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-sm">
      <span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700">
        Coming soon
      </span>
      <h2 className="mt-5 text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}

function PlaceholderFeedCard({
  icon,
  eyebrow,
  title,
  description,
  action,
  href,
}: {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  href: string;
}) {
  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
        {icon}
      </div>
      <p className="mt-5 text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-bold text-slate-950">{title}</h2>
      <p className="mt-3 leading-7 text-slate-500">{description}</p>
      <Link
        href={href}
        className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-slate-950"
      >
        {action}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </article>
  );
}

function MetricCard({
  icon,
  label,
  value,
  description,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  description: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const toneClasses = {
    neutral: "bg-slate-100 text-slate-700",
    positive: "bg-emerald-50 text-emerald-700",
    negative: "bg-red-50 text-red-700",
    warning: "bg-amber-50 text-amber-700",
  };

  return (
    <article className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-2xl ${toneClasses[tone]}`}
      >
        {icon}
      </div>

      <p className="mt-5 text-sm font-semibold text-slate-500">{label}</p>

      <p className="mt-1 text-2xl font-bold tracking-[-0.03em] text-slate-950">
        {value}
      </p>

      <p
        className={`mt-1 text-xs font-bold ${
          tone === "positive"
            ? "text-emerald-600"
            : tone === "negative"
              ? "text-red-600"
              : tone === "warning"
                ? "text-amber-600"
                : "text-slate-500"
        }`}
      >
        {description}
      </p>
    </article>
  );
}

function IntelligenceCard({
  title,
  subtitle,
  icon,
  items,
  tone,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  items: {
    title: string;
    description: string;
  }[];
  tone: "positive" | "warning";
}) {
  const iconClasses =
    tone === "positive"
      ? "bg-emerald-50 text-emerald-700"
      : "bg-amber-50 text-amber-700";

  return (
    <article className="rounded-[28px] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClasses}`}
        >
          {icon}
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
            {subtitle}
          </p>

          <h2 className="mt-1 text-2xl font-bold">{title}</h2>
        </div>
      </div>

      <div className="mt-7 space-y-4">
        {items.map((item) => (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-100 bg-slate-50 p-5"
          >
            <h3 className="font-bold text-slate-950">{item.title}</h3>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <span className="text-sm text-slate-500">{label}</span>

      <span className="text-right text-sm font-bold text-slate-950">
        {value}
      </span>
    </div>
  );
}