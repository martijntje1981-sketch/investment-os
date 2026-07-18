"use client";

import { useEffect, useMemo, useState } from "react";
import PageNavigation from "../../components/PageNavigation";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BarChart3,
  Brain,
  CalendarDays,
  CircleGauge,
  Eye,
  Gauge,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";

type Impact = "Positive" | "Neutral" | "Negative";
type Confidence = "High" | "Medium" | "Low";
type AnalysisTone = "positive" | "warning" | "neutral" | "negative";
type ThesisStatus = "Intact" | "Under review" | "At risk";
type HoldingAction = "Hold" | "Monitor" | "Review";

type BriefingNewsItem = {
  id: string;
  title: string;
  category: string;
  summary: string;
  portfolioEffect: string;
  impact: Impact;
  confidence: Confidence;
  holdings: string[];
  publishedAt: string | null;
  sourceUrl: string | null;
  sourceName?: string | null;
};

type BriefingEvent = {
  id: string;
  date: string;
  country: string;
  title: string;
  impact: "High impact" | "Medium impact";
  description: string;
  holdings: string[];
};

type BriefingResponse = {
  success: boolean;
  generatedAt: string;
  portfolio: {
    symbols: string[];
    holdingCount: number;
  };
  summary: {
    outlook: string;
    mainRisk: string;
    mainOpportunity: string;
    keyFocus: string;
  };
  macroNews: BriefingNewsItem[];
  portfolioNews: BriefingNewsItem[];
  newsByHolding: Record<string, BriefingNewsItem[]>;
  upcomingEvents: BriefingEvent[];
  errors: string[];
  error?: string;
};

type HoldingAnalysis = {
  symbol: string;
  name: string;
  score: number;
  trend: "Bullish" | "Balanced" | "Cautious";
  thesis: ThesisStatus;
  risk: "Low" | "Medium" | "High";
  action: HoldingAction;
  explanation: string;
  positiveCount: number;
  negativeCount: number;
};

const HOLDING_ORDER = ["IB1T", "STRC", "AIFS", "NUKL", "VWCE", "PPFB"];

const HOLDING_NAMES: Record<string, string> = {
  IB1T: "Bitcoin",
  STRC: "Income & Bitcoin",
  AIFS: "AI Infrastructure",
  NUKL: "Uranium & Nuclear",
  VWCE: "Global Equities",
  PPFB: "Gold",
};

const HOLDING_BASE_RISK: Record<string, "Low" | "Medium" | "High"> = {
  IB1T: "High",
  STRC: "High",
  AIFS: "Medium",
  NUKL: "Medium",
  VWCE: "Low",
  PPFB: "Low",
};

const fallbackNews: BriefingNewsItem[] = [
  {
    id: "fallback-bitcoin",
    title: "Bitcoin remains the largest driver of portfolio volatility",
    category: "Bitcoin",
    summary:
      "Bitcoin price movements continue to have an outsized effect on the portfolio because IB1T remains the largest position.",
    portfolioEffect:
      "IB1T and STRC remain sensitive to Bitcoin direction, liquidity and broader risk sentiment.",
    impact: "Neutral",
    confidence: "High",
    holdings: ["IB1T", "STRC"],
    publishedAt: null,
    sourceUrl: null,
    sourceName: "Investment OS",
  },
  {
    id: "fallback-macro",
    title: "Interest-rate expectations remain important for growth assets",
    category: "Macro & markets",
    summary:
      "Changes in inflation, central-bank policy and bond yields may influence Bitcoin, global equities, AI infrastructure and gold.",
    portfolioEffect:
      "Lower yields may support growth assets, while unexpected inflation could increase portfolio volatility.",
    impact: "Neutral",
    confidence: "High",
    holdings: ["IB1T", "AIFS", "VWCE", "PPFB"],
    publishedAt: null,
    sourceUrl: null,
    sourceName: "Investment OS",
  },
];

const watchItems = [
  {
    title: "Central-bank policy",
    detail: "Fed and ECB guidance, rate expectations and liquidity conditions.",
    icon: CircleGauge,
  },
  {
    title: "Bitcoin market flows",
    detail: "ETF flows, risk appetite and crypto-market liquidity.",
    icon: Activity,
  },
  {
    title: "Inflation and bond yields",
    detail: "A key driver for growth assets, gold and valuation multiples.",
    icon: BarChart3,
  },
  {
    title: "Portfolio concentration",
    detail: "Monitor whether one position dominates total portfolio risk.",
    icon: ShieldAlert,
  },
];

function normaliseTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function deduplicateNews(items: BriefingNewsItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    const title = normaliseTitle(item.title);
    if (!title || seen.has(title)) return false;
    seen.add(title);
    return true;
  });
}

function selectPortfolioNews(items: BriefingNewsItem[]) {
  const uniqueItems = deduplicateNews(items);
  const selected: BriefingNewsItem[] = [];
  const holdingCounts = new Map<string, number>();

  for (const item of uniqueItems) {
    const linkedHoldings = item.holdings.filter((holding) =>
      HOLDING_ORDER.includes(holding),
    );

    if (linkedHoldings.length === 0) continue;

    const canUseItem = linkedHoldings.some(
      (holding) => (holdingCounts.get(holding) ?? 0) < 2,
    );

    if (!canUseItem) continue;

    selected.push(item);

    for (const holding of linkedHoldings) {
      const currentCount = holdingCounts.get(holding) ?? 0;
      if (currentCount < 2) holdingCounts.set(holding, currentCount + 1);
    }

    if (selected.length >= 10) break;
  }

  return selected;
}

function formatBriefingTime(value: string | null) {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatGeneratedAt(value: string | null) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently updated";

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatEventDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(item: BriefingNewsItem) {
  if (item.sourceName?.trim()) return item.sourceName.trim();
  if (!item.sourceUrl) return "Investment OS";

  try {
    const hostname = new URL(item.sourceUrl).hostname.replace(/^www\./, "");
    const root = hostname.split(".")[0];
    return root ? root.charAt(0).toUpperCase() + root.slice(1) : "Source";
  } catch {
    return "Source";
  }
}

function toneClasses(tone: AnalysisTone) {
  if (tone === "positive") return "bg-emerald-100 text-emerald-700";
  if (tone === "warning") return "bg-amber-100 text-amber-700";
  if (tone === "negative") return "bg-red-100 text-red-700";
  return "bg-slate-100 text-slate-700";
}

function impactClasses(impact: Impact) {
  if (impact === "Positive") return "bg-emerald-100 text-emerald-700";
  if (impact === "Negative") return "bg-red-100 text-red-700";
  return "bg-amber-100 text-amber-700";
}

function confidenceClasses(confidence: Confidence) {
  if (confidence === "High") return "bg-blue-100 text-blue-700";
  if (confidence === "Medium") return "bg-violet-100 text-violet-700";
  return "bg-slate-100 text-slate-600";
}

function buildHoldingAnalysis(
  symbol: string,
  newsByHolding: Record<string, BriefingNewsItem[]>,
  allPortfolioNews: BriefingNewsItem[],
): HoldingAnalysis {
  const linked = deduplicateNews([
    ...(newsByHolding[symbol] ?? []),
    ...allPortfolioNews.filter((item) => item.holdings.includes(symbol)),
  ]);

  const positiveCount = linked.filter((item) => item.impact === "Positive").length;
  const negativeCount = linked.filter((item) => item.impact === "Negative").length;
  const balance = positiveCount - negativeCount;
  const risk = HOLDING_BASE_RISK[symbol] ?? "Medium";

  const trend =
    balance > 0 ? "Bullish" : balance < 0 ? "Cautious" : "Balanced";

  const thesis: ThesisStatus =
    negativeCount >= 3
      ? "At risk"
      : negativeCount > positiveCount
        ? "Under review"
        : "Intact";

  const action: HoldingAction =
    thesis === "At risk" ? "Review" : risk === "High" || thesis === "Under review" ? "Monitor" : "Hold";

  const score = Math.max(
    1,
    Math.min(
      10,
      7 + positiveCount * 0.6 - negativeCount * 0.8 - (risk === "High" ? 0.7 : 0),
    ),
  );

  const explanation =
    linked[0]?.portfolioEffect ??
    `No major thesis-changing signal is currently available for ${HOLDING_NAMES[symbol] ?? symbol}.`;

  return {
    symbol,
    name: HOLDING_NAMES[symbol] ?? symbol,
    score,
    trend,
    thesis,
    risk,
    action,
    explanation,
    positiveCount,
    negativeCount,
  };
}

export default function AnalysisPage() {
  const [data, setData] = useState<BriefingResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAnalysis() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch("/api/briefing", {
          method: "GET",
          cache: "no-store",
          headers: { Accept: "application/json" },
        });

        const responseData = (await response.json()) as BriefingResponse;

        if (!response.ok || !responseData.success) {
          throw new Error(responseData.error || "The analysis could not be loaded.");
        }

        if (isMounted) setData(responseData);
      } catch (error) {
        console.error("Could not load portfolio analysis:", error);
        if (isMounted) {
          setErrorMessage(
            error instanceof Error ? error.message : "The analysis could not be loaded.",
          );
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadAnalysis();
    return () => {
      isMounted = false;
    };
  }, []);

  const macroNews = useMemo(() => {
    const source = data?.macroNews?.length ? data.macroNews : fallbackNews;
    return deduplicateNews(source).slice(0, 4);
  }, [data]);

  const portfolioNews = useMemo(() => {
    const source = data?.portfolioNews?.length ? data.portfolioNews : fallbackNews;
    return selectPortfolioNews(source);
  }, [data]);

  const holdingAnalysis = useMemo(
    () =>
      HOLDING_ORDER.map((symbol) =>
        buildHoldingAnalysis(symbol, data?.newsByHolding ?? {}, portfolioNews),
      ),
    [data, portfolioNews],
  );

  const positiveCount = portfolioNews.filter((item) => item.impact === "Positive").length;
  const negativeCount = portfolioNews.filter((item) => item.impact === "Negative").length;

  const outlook =
    positiveCount > negativeCount
      ? "Constructive"
      : negativeCount > positiveCount
        ? "Cautious"
        : data?.summary.outlook ?? "Balanced";

  const healthScore = Math.max(
    1,
    Math.min(
      10,
      holdingAnalysis.reduce((total, item) => total + item.score, 0) /
        Math.max(holdingAnalysis.length, 1),
    ),
  );

  const sentimentScore = Math.max(
    20,
    Math.min(80, 50 + positiveCount * 8 - negativeCount * 10),
  );

  const sentimentLabel =
    sentimentScore >= 60 ? "Bullish" : sentimentScore <= 40 ? "Cautious" : "Neutral";

  const mostPositive =
    holdingAnalysis.slice().sort((a, b) => b.score - a.score)[0] ?? holdingAnalysis[0];
  const mostAtRisk =
    holdingAnalysis.slice().sort((a, b) => a.score - b.score)[0] ?? holdingAnalysis[0];
  const nextEvent = data?.upcomingEvents?.[0];

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <PageNavigation />

        <section className="mb-8 mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-700">
            Portfolio intelligence
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-[-0.045em] sm:text-6xl">
                Analysis
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                A clear view of portfolio health, investment theses, risks,
                opportunities and the developments that matter most.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Analysis status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    errorMessage
                      ? "bg-amber-500"
                      : isLoading
                        ? "animate-pulse bg-blue-500"
                        : "bg-emerald-500"
                  }`}
                />
                <p className="font-bold text-slate-900">
                  {isLoading ? "Updating" : errorMessage ? "Fallback active" : "Up to date"}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {formatGeneratedAt(data?.generatedAt ?? null)}
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              Live analysis data is temporarily unavailable. Stable fallback
              insights remain visible.
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
                <Brain className="h-4 w-4 text-violet-300" />
                Executive summary
              </div>

              <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                Portfolio health is {healthScore.toFixed(1)}/10 with a{" "}
                {outlook.toLowerCase()} outlook.
              </h2>

              <p className="mt-5 max-w-3xl leading-7 text-slate-300">
                {data?.summary.mainOpportunity ??
                  "The portfolio contains several long-term growth drivers. The main priority remains improving diversification while monitoring concentration risk."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric label="Health score" value={`${healthScore.toFixed(1)}/10`} />
              <HeroMetric label="Outlook" value={outlook} />
              <HeroMetric label="Sentiment" value={`${sentimentScore}%`} />
              <HeroMetric label="Main action" value="Monitor" />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <DigestCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="Biggest opportunity"
            value={data?.summary.mainOpportunity ?? mostPositive?.name ?? "Diversification"}
            detail={mostPositive?.explanation ?? "Continue monitoring portfolio drivers."}
            tone="positive"
          />
          <DigestCard
            icon={<AlertTriangle className="h-5 w-5" />}
            label="Biggest risk"
            value={data?.summary.mainRisk ?? mostAtRisk?.name ?? "Concentration"}
            detail="Review exposure size and whether portfolio risk is dominated by one position."
            tone="warning"
          />
          <DigestCard
            icon={<Target className="h-5 w-5" />}
            label="Recommended focus"
            value={data?.summary.keyFocus ?? "Portfolio balance"}
            detail="Use new contributions to improve diversification rather than reacting to individual headlines."
            tone="neutral"
          />
          <DigestCard
            icon={<CalendarDays className="h-5 w-5" />}
            label="Next key event"
            value={nextEvent?.title ?? "Macro calendar"}
            detail={nextEvent ? formatEventDate(nextEvent.date) : "No high-priority event is currently available."}
            tone="neutral"
          />
        </section>

        <section className="mt-10">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Portfolio analysis
              </p>
              <h2 className="mt-2 text-3xl font-black">Every holding, one clear view</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Thesis status and signals are decision-support indicators based on available portfolio news and risk characteristics.
              </p>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {holdingAnalysis.map((holding) => (
              <HoldingCard key={holding.symbol} holding={holding} />
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-red-50 p-3 text-red-700">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Portfolio risks
                </p>
                <h2 className="mt-1 text-2xl font-black">What could hurt progress</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <RiskOpportunityRow
                title="Position concentration"
                description="A large Bitcoin-linked allocation can dominate total portfolio volatility."
                level="High"
                tone="negative"
              />
              <RiskOpportunityRow
                title="Growth-asset sensitivity"
                description="Bitcoin, AI infrastructure and global equities can react strongly to rates and liquidity."
                level="Medium"
                tone="warning"
              />
              <RiskOpportunityRow
                title="Theme concentration"
                description="Several positions depend on long-duration themes that may experience sharp drawdowns."
                level="Medium"
                tone="warning"
              />
            </div>
          </article>

          <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-emerald-700">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Opportunities
                </p>
                <h2 className="mt-1 text-2xl font-black">Where the portfolio can improve</h2>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <RiskOpportunityRow
                title="Diversify through contributions"
                description="New capital can gradually reduce concentration without forcing a sale of the core position."
                level="Priority"
                tone="positive"
              />
              <RiskOpportunityRow
                title="Multiple return drivers"
                description="Global equities, AI, uranium and gold broaden exposure beyond Bitcoin."
                level="Positive"
                tone="positive"
              />
              <RiskOpportunityRow
                title="Use events as checkpoints"
                description="Macro and holding-specific events can support disciplined thesis reviews."
                level="Monitor"
                tone="neutral"
              />
            </div>
          </article>
        </section>

        <section className="mt-10 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Portfolio intelligence
              </p>
              <h2 className="mt-2 text-3xl font-black">Developments linked to your holdings</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                Relevant items are deduplicated and linked directly to the holdings they may affect.
              </p>
            </div>

            <div className="space-y-5">
              {portfolioNews.map((item) => (
                <NewsCard key={item.id} item={item} large />
              ))}

              {portfolioNews.length === 0 ? (
                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 text-slate-500 shadow-sm">
                  No relevant holding-specific developments are available at the moment.
                </div>
              ) : null}
            </div>
          </div>

          <aside>
            <div className="sticky top-6 space-y-6">
              <article className="rounded-[1.75rem] bg-slate-900 p-7 text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <Gauge className="h-5 w-5 text-violet-300" />
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Market sentiment
                  </p>
                </div>

                <div className="mt-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-4xl font-black">{sentimentScore}%</p>
                    <p className="mt-1 font-bold text-slate-200">{sentimentLabel}</p>
                  </div>
                  <Activity className="h-10 w-10 text-emerald-300" />
                </div>

                <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${sentimentScore}%` }}
                  />
                </div>

                <p className="mt-5 text-sm leading-6 text-slate-300">
                  Based on the balance of positive and negative portfolio-linked developments. This is not a prediction of future returns.
                </p>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Analyst consensus
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Coming soon</h2>
                  </div>
                  <Brain className="h-8 w-8 text-violet-600" />
                </div>

                <div className="mt-6 space-y-3">
                  <PlaceholderRow label="Consensus rating" value="Awaiting data feed" />
                  <PlaceholderRow label="Price targets" value="Awaiting data feed" />
                  <PlaceholderRow label="Revisions" value="Awaiting data feed" />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Upcoming events
                </p>
                <h2 className="mt-2 text-2xl font-black">What to watch next</h2>

                <div className="mt-6 space-y-6">
                  {(data?.upcomingEvents ?? []).slice(0, 5).map((event) => (
                    <div
                      key={event.id}
                      className="border-b border-slate-100 pb-6 last:border-none last:pb-0"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                          {formatEventDate(event.date)}
                        </p>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {event.impact}
                        </span>
                      </div>
                      <h3 className="mt-3 font-bold text-slate-900">{event.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{event.description}</p>
                    </div>
                  ))}

                  {(data?.upcomingEvents ?? []).length === 0 ? (
                    <p className="text-sm leading-6 text-slate-500">
                      No high-priority economic events are currently available.
                    </p>
                  ) : null}
                </div>
              </article>
            </div>
          </aside>
        </section>

        <section className="mt-10">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Macro intelligence
            </p>
            <h2 className="mt-2 text-3xl font-black">Developments affecting multiple holdings</h2>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {macroNews.map((item) => (
              <NewsCard key={item.id} item={item} />
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Watchlist
              </p>
              <h2 className="mt-2 text-2xl font-black">Signals to monitor</h2>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {watchItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl bg-slate-50 p-5">
                  <Icon className="h-5 w-5 text-slate-700" />
                  <h3 className="mt-4 font-black text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{item.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-7 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="text-sm font-bold text-amber-900">Important reminder</p>
              <p className="mt-2 text-sm leading-6 text-amber-800">
                Investment OS provides decision-support information, not personal financial advice. Scores, sentiment and thesis indicators may change as new information becomes available and do not guarantee future performance.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function DigestCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: AnalysisTone;
}) {
  return (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`inline-flex rounded-xl p-2.5 ${toneClasses(tone)}`}>{icon}</div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">{detail}</p>
    </article>
  );
}

function HoldingCard({ holding }: { holding: HoldingAnalysis }) {
  const trendTone: AnalysisTone =
    holding.trend === "Bullish" ? "positive" : holding.trend === "Cautious" ? "warning" : "neutral";
  const thesisTone: AnalysisTone =
    holding.thesis === "Intact" ? "positive" : holding.thesis === "At risk" ? "negative" : "warning";

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{holding.symbol}</p>
          <h3 className="mt-2 text-xl font-black">{holding.name}</h3>
        </div>
        <div className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white">
          <p className="text-lg font-black">{holding.score.toFixed(1)}</p>
          <p className="text-[10px] font-semibold text-slate-400">/ 10</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <AnalysisValue label="Trend" value={holding.trend} tone={trendTone} />
        <AnalysisValue label="Thesis" value={holding.thesis} tone={thesisTone} />
        <AnalysisValue label="Risk" value={holding.risk} tone={holding.risk === "High" ? "warning" : "neutral"} />
        <AnalysisValue label="Action" value={holding.action} tone="neutral" />
      </div>

      <p className="mt-5 line-clamp-4 text-sm leading-6 text-slate-500">{holding.explanation}</p>

      <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-500">
        <span>{holding.positiveCount} positive</span>
        <span>{holding.negativeCount} warnings</span>
      </div>
    </article>
  );
}

function AnalysisValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: AnalysisTone;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <span className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses(tone)}`}>
        {value}
      </span>
    </div>
  );
}

function RiskOpportunityRow({
  title,
  description,
  level,
  tone,
}: {
  title: string;
  description: string;
  level: string;
  tone: AnalysisTone;
}) {
  return (
    <div className="rounded-2xl bg-slate-50 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900">{title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
        </div>
        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${toneClasses(tone)}`}>{level}</span>
      </div>
    </div>
  );
}

function PlaceholderRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-50 px-4 py-3">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <span className="text-xs font-bold text-slate-400">{value}</span>
    </div>
  );
}

function NewsCard({ item, large = false }: { item: BriefingNewsItem; large?: boolean }) {
  return (
    <article
      className={`rounded-[1.75rem] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg ${
        large ? "p-6" : "p-5"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-bold text-white">
              {sourceLabel(item)}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
              {item.category}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${impactClasses(item.impact)}`}>
              {item.impact}
            </span>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClasses(item.confidence)}`}>
              {item.confidence} confidence
            </span>
          </div>

          <h3 className={`mt-4 max-w-3xl font-black leading-7 ${large ? "text-xl" : "text-lg"}`}>
            {item.title}
          </h3>
        </div>

        <span className="text-sm font-medium text-slate-400">{formatBriefingTime(item.publishedAt)}</span>
      </div>

      <p className="mt-4 leading-7 text-slate-600">{item.summary}</p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Portfolio impact</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{item.portfolioEffect}</p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {item.holdings.map((holding) => (
            <span key={holding} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white">
              {holding}
            </span>
          ))}
        </div>

        {item.sourceUrl ? (
          <a
            href={item.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            Open source
            <ArrowUpRight className="h-4 w-4" />
          </a>
        ) : null}
      </div>
    </article>
  );
}