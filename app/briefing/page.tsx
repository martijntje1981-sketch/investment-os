"use client";

import { useEffect, useMemo, useState } from "react";
import PageNavigation from "../../components/PageNavigation";
import {
  buildBriefingRequestPayload,
  readPortfolioFromStorage,
} from "@/lib/client/portfolioPricing";
import { useAuthenticatedUserSub } from "@/lib/client/useAuthenticatedUserSub";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Brain,
  CalendarDays,
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

type StoredHolding = {
  id?: string;
  symbol?: string;
  ticker?: string;
  name?: string;
  instrumentName?: string;
  assetType?: string;
  units?: number;
  quantity?: number;
  currentPrice?: number;
  averagePrice?: number;
  currency?: string;
};

type UserHolding = {
  symbol: string;
  name: string;
};

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

function normaliseSymbol(value: unknown) {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function readBriefingHoldings(userSub: string): UserHolding[] {
  return readPortfolioFromStorage(userSub)
    .map((holding) => ({
      symbol: normaliseSymbol(holding.symbol),
      name: holding.instrumentName ?? holding.name ?? holding.symbol,
    }))
    .filter((holding) => holding.symbol.length > 0);
}

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

    if (!title || seen.has(title)) {
      return false;
    }

    seen.add(title);
    return true;
  });
}

function filterNewsForPortfolio(
  items: BriefingNewsItem[],
  symbols: Set<string>,
) {
  return deduplicateNews(
    items
      .map((item) => ({
        ...item,
        holdings: item.holdings.filter((holding) =>
          symbols.has(normaliseSymbol(holding)),
        ),
      }))
      .filter((item) => item.holdings.length > 0),
  );
}

function formatBriefingTime(value: string | null) {
  if (!value) {
    return "Recently";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently";
  }

  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Amsterdam",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatGeneratedAt(value: string | null) {
  if (!value) {
    return "Not updated yet";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Recently updated";
  }

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

  if (Number.isNaN(date.getTime())) {
    return value;
  }

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
  if (item.sourceName?.trim()) {
    return item.sourceName.trim();
  }

  if (!item.sourceUrl) {
    return "Investment OS";
  }

  try {
    const hostname = new URL(item.sourceUrl).hostname.replace(
      /^www\./,
      "",
    );

    const root = hostname.split(".")[0];

    return root
      ? root.charAt(0).toUpperCase() + root.slice(1)
      : "Source";
  } catch {
    return "Source";
  }
}

function getHoldingRisk(
  holding: UserHolding,
): "Low" | "Medium" | "High" {
  const searchText =
    `${holding.symbol} ${holding.name}`.toLowerCase();

  if (
    searchText.includes("bitcoin") ||
    searchText.includes("crypto") ||
    searchText.includes("leveraged")
  ) {
    return "High";
  }

  if (
    searchText.includes("etf") ||
    searchText.includes("fund") ||
    searchText.includes("all-world") ||
    searchText.includes("world")
  ) {
    return "Low";
  }

  return "Medium";
}

function buildHoldingAnalysis(
  holding: UserHolding,
  portfolioNews: BriefingNewsItem[],
  newsByHolding: Record<string, BriefingNewsItem[]>,
): HoldingAnalysis {
  const linkedNews = deduplicateNews([
    ...(newsByHolding[holding.symbol] ?? []),
    ...portfolioNews.filter((item) =>
      item.holdings.includes(holding.symbol),
    ),
  ]);

  const positiveCount = linkedNews.filter(
    (item) => item.impact === "Positive",
  ).length;

  const negativeCount = linkedNews.filter(
    (item) => item.impact === "Negative",
  ).length;

  const balance = positiveCount - negativeCount;
  const risk = getHoldingRisk(holding);

  const trend: HoldingAnalysis["trend"] =
    balance > 0
      ? "Bullish"
      : balance < 0
        ? "Cautious"
        : "Balanced";

  const thesis: ThesisStatus =
    negativeCount >= 3
      ? "At risk"
      : negativeCount > positiveCount
        ? "Under review"
        : "Intact";

  const action: HoldingAction =
    thesis === "At risk"
      ? "Review"
      : thesis === "Under review" || risk === "High"
        ? "Monitor"
        : "Hold";

  const riskPenalty =
    risk === "High" ? 0.7 : risk === "Medium" ? 0.3 : 0;

  const score = Math.max(
    1,
    Math.min(
      10,
      7 +
        positiveCount * 0.6 -
        negativeCount * 0.8 -
        riskPenalty,
    ),
  );

  const explanation =
    linkedNews[0]?.portfolioEffect ??
    `No major thesis-changing developments are currently available for ${holding.name}. The position will remain visible while Investment OS monitors new information.`;

  return {
    symbol: holding.symbol,
    name: holding.name,
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

function toneClasses(tone: AnalysisTone) {
  if (tone === "positive") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (tone === "warning") {
    return "bg-amber-100 text-amber-700";
  }

  if (tone === "negative") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-700";
}

function impactClasses(impact: Impact) {
  if (impact === "Positive") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (impact === "Negative") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function confidenceClasses(confidence: Confidence) {
  if (confidence === "High") {
    return "bg-blue-100 text-blue-700";
  }

  if (confidence === "Medium") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-slate-100 text-slate-600";
}

export default function AnalysisPage() {
  const { userSub, authReady } = useAuthenticatedUserSub();
  const [data, setData] =
    useState<BriefingResponse | null>(null);

  const [userHoldings, setUserHoldings] = useState<
    UserHolding[]
  >([]);

  const [portfolioLoaded, setPortfolioLoaded] =
    useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    if (!authReady) {
      setData(null);
      setUserHoldings([]);
      setPortfolioLoaded(false);
      setIsLoading(true);
      setErrorMessage("");
      return () => {
        isMounted = false;
      };
    }

    setData(null);
    setUserHoldings([]);
    setPortfolioLoaded(false);
    setIsLoading(true);
    setErrorMessage("");

    if (!userSub) {
      setPortfolioLoaded(true);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const activeUserSub = userSub;

    async function loadAnalysis() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const savedHoldings = readBriefingHoldings(activeUserSub);
        const storedPortfolio = readPortfolioFromStorage(activeUserSub);

        if (!isMounted) {
          return;
        }

        setUserHoldings(savedHoldings);
        setPortfolioLoaded(true);

        if (savedHoldings.length === 0) {
          setData(null);
          return;
        }

        const response = await fetch("/api/briefing", {
          method: "POST",
          cache: "no-store",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            holdings: buildBriefingRequestPayload(storedPortfolio),
          }),
        });

        const responseData =
          (await response.json()) as BriefingResponse;

        if (!response.ok || !responseData.success) {
          throw new Error(
            responseData.error ??
              "The analysis could not be loaded.",
          );
        }

        if (isMounted) {
          setData(responseData);
        }
      } catch (error) {
        console.error(
          "Could not load portfolio analysis:",
          error,
        );

        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "The analysis could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadAnalysis();

    function refreshFromStorage() {
      const savedHoldings = readBriefingHoldings(activeUserSub);
      setUserHoldings(savedHoldings);
      setPortfolioLoaded(true);
    }

    window.addEventListener("focus", refreshFromStorage);
    window.addEventListener("storage", refreshFromStorage);

    return () => {
      isMounted = false;

      window.removeEventListener(
        "focus",
        refreshFromStorage,
      );

      window.removeEventListener(
        "storage",
        refreshFromStorage,
      );
    };
  }, [authReady, userSub]);

  const userSymbols = useMemo(
    () =>
      new Set(
        userHoldings.map((holding) => holding.symbol),
      ),
    [userHoldings],
  );

  const portfolioNews = useMemo(
    () =>
      filterNewsForPortfolio(
        data?.portfolioNews ?? [],
        userSymbols,
      ).slice(0, 10),
    [data, userSymbols],
  );

  const macroNews = useMemo(
    () =>
      deduplicateNews(data?.macroNews ?? []).slice(0, 4),
    [data],
  );

  const newsByHolding = useMemo(() => {
    const result: Record<string, BriefingNewsItem[]> = {};

    for (const holding of userHoldings) {
      result[holding.symbol] = filterNewsForPortfolio(
        data?.newsByHolding?.[holding.symbol] ?? [],
        userSymbols,
      );
    }

    return result;
  }, [data, userHoldings, userSymbols]);

  const holdingAnalysis = useMemo(
    () =>
      userHoldings.map((holding) =>
        buildHoldingAnalysis(
          holding,
          portfolioNews,
          newsByHolding,
        ),
      ),
    [newsByHolding, portfolioNews, userHoldings],
  );

  const upcomingEvents = useMemo(
    () =>
      (data?.upcomingEvents ?? []).map((event) => ({
        ...event,
        holdings: event.holdings.filter((holding) =>
          userSymbols.has(normaliseSymbol(holding)),
        ),
      })),
    [data, userSymbols],
  );

  const positiveCount = portfolioNews.filter(
    (item) => item.impact === "Positive",
  ).length;

  const negativeCount = portfolioNews.filter(
    (item) => item.impact === "Negative",
  ).length;

  const outlook =
    positiveCount > negativeCount
      ? "Constructive"
      : negativeCount > positiveCount
        ? "Cautious"
        : "Balanced";

  const healthScore =
    holdingAnalysis.length > 0
      ? Math.max(
          1,
          Math.min(
            10,
            holdingAnalysis.reduce(
              (total, item) => total + item.score,
              0,
            ) / holdingAnalysis.length,
          ),
        )
      : 0;

  const sentimentScore =
    portfolioNews.length > 0
      ? Math.max(
          20,
          Math.min(
            80,
            50 +
              positiveCount * 8 -
              negativeCount * 10,
          ),
        )
      : 50;

  const sentimentLabel =
    sentimentScore >= 60
      ? "Bullish"
      : sentimentScore <= 40
        ? "Cautious"
        : "Neutral";

  const mostPositive = holdingAnalysis
    .slice()
    .sort((a, b) => b.score - a.score)[0];

  const mostAtRisk = holdingAnalysis
    .slice()
    .sort((a, b) => a.score - b.score)[0];

  const nextEvent = upcomingEvents[0];

  const mainOpportunity =
    mostPositive?.name ??
    "Add holdings to generate analysis";

  const mainRisk =
    userHoldings.length === 1
      ? "Single-position concentration"
      : mostAtRisk?.name ?? "Portfolio concentration";

  if (!portfolioLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
      </main>
    );
  }

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
                Personalised insights based exclusively on
                the holdings saved in your account.
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
                  {isLoading
                    ? "Updating"
                    : errorMessage
                      ? "Limited data"
                      : "Up to date"}
                </p>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {formatGeneratedAt(
                  data?.generatedAt ?? null,
                )}
              </p>
            </div>
          </div>

          {errorMessage ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
              Live news is temporarily unavailable. Only
              holdings from your own saved portfolio are
              displayed.
            </div>
          ) : null}
        </section>

        {userHoldings.length === 0 ? (
          <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
            <Brain className="mx-auto h-10 w-10 text-blue-700" />

            <h2 className="mt-5 text-3xl font-black">
              Add your first holding
            </h2>

            <p className="mx-auto mt-3 max-w-xl leading-7 text-slate-500">
              Your Analysis page will become available after
              you add a holding through screenshot upload,
              file import or manual entry.
            </p>
          </section>
        ) : (
          <>
            <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
              <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-slate-200">
                    <Brain className="h-4 w-4 text-violet-300" />
                    Executive summary
                  </div>

                  <h2 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-5xl">
                    Portfolio health is{" "}
                    {healthScore.toFixed(1)}/10 with a{" "}
                    {outlook.toLowerCase()} outlook.
                  </h2>

                  <p className="mt-5 max-w-3xl leading-7 text-slate-300">
                    Analysis currently covers{" "}
                    {userHoldings.length}{" "}
                    {userHoldings.length === 1
                      ? "holding"
                      : "holdings"}{" "}
                    from this portfolio. No holdings belonging
                    to another account are included.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <HeroMetric
                    label="Health score"
                    value={`${healthScore.toFixed(1)}/10`}
                  />

                  <HeroMetric
                    label="Outlook"
                    value={outlook}
                  />

                  <HeroMetric
                    label="Sentiment"
                    value={`${sentimentScore}%`}
                  />

                  <HeroMetric
                    label="Holdings"
                    value={String(userHoldings.length)}
                  />
                </div>
              </div>
            </section>

            <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <DigestCard
                icon={
                  <TrendingUp className="h-5 w-5" />
                }
                label="Biggest opportunity"
                value={mainOpportunity}
                detail={
                  mostPositive?.explanation ??
                  "New developments will appear when relevant information becomes available."
                }
                tone="positive"
              />

              <DigestCard
                icon={
                  <AlertTriangle className="h-5 w-5" />
                }
                label="Biggest risk"
                value={mainRisk}
                detail={
                  userHoldings.length === 1
                    ? "A portfolio containing one holding depends entirely on that single position."
                    : "Review whether one position dominates total portfolio risk."
                }
                tone="warning"
              />

              <DigestCard
                icon={<Target className="h-5 w-5" />}
                label="Recommended focus"
                value="Monitor your thesis"
                detail="Use relevant developments as checkpoints and avoid reacting to unrelated market headlines."
                tone="neutral"
              />

              <DigestCard
                icon={
                  <CalendarDays className="h-5 w-5" />
                }
                label="Next key event"
                value={
                  nextEvent?.title ?? "Macro calendar"
                }
                detail={
                  nextEvent
                    ? formatEventDate(nextEvent.date)
                    : "No high-priority event is currently available."
                }
                tone="neutral"
              />
            </section>

            <section className="mt-10">
              <div className="mb-5">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Portfolio analysis
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Every holding, one clear view
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  Only holdings currently saved in this
                  portfolio are shown below.
                </p>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {holdingAnalysis.map((holding) => (
                  <HoldingCard
                    key={holding.symbol}
                    holding={holding}
                  />
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

                    <h2 className="mt-1 text-2xl font-black">
                      What could hurt progress
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <RiskOpportunityRow
                    title={
                      userHoldings.length === 1
                        ? "Single-position concentration"
                        : "Position concentration"
                    }
                    description={
                      userHoldings.length === 1
                        ? "The portfolio currently depends entirely on one holding."
                        : "A large individual holding may dominate total portfolio volatility."
                    }
                    level={
                      userHoldings.length === 1
                        ? "High"
                        : "Monitor"
                    }
                    tone={
                      userHoldings.length === 1
                        ? "negative"
                        : "warning"
                    }
                  />

                  <RiskOpportunityRow
                    title="Market sensitivity"
                    description="Individual holdings can react to company results, interest rates, economic conditions and market sentiment."
                    level="Medium"
                    tone="warning"
                  />

                  <RiskOpportunityRow
                    title="Limited information"
                    description="A lack of recent news does not mean that an investment is risk-free."
                    level="Monitor"
                    tone="neutral"
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

                    <h2 className="mt-1 text-2xl font-black">
                      Where the portfolio can improve
                    </h2>
                  </div>
                </div>

                <div className="mt-6 space-y-4">
                  <RiskOpportunityRow
                    title="Build diversification"
                    description="Additional holdings can reduce dependence on one company, sector or investment theme."
                    level="Priority"
                    tone="positive"
                  />

                  <RiskOpportunityRow
                    title="Monitor relevant developments"
                    description="Holding-specific information can support a more disciplined review of the investment thesis."
                    level="Positive"
                    tone="positive"
                  />

                  <RiskOpportunityRow
                    title="Use events as checkpoints"
                    description="Company announcements and macro events can be used as structured review moments."
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

                  <h2 className="mt-2 text-3xl font-black">
                    Developments linked to your holdings
                  </h2>
                </div>

                <div className="space-y-5">
                  {portfolioNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                      large
                    />
                  ))}

                  {portfolioNews.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-7 text-slate-500 shadow-sm">
                      No relevant holding-specific
                      developments are available yet for{" "}
                      {userHoldings
                        .map((holding) => holding.symbol)
                        .join(", ")}
                      .
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
                        Portfolio sentiment
                      </p>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                      <div>
                        <p className="text-4xl font-black">
                          {sentimentScore}%
                        </p>

                        <p className="mt-1 font-bold text-slate-200">
                          {sentimentLabel}
                        </p>
                      </div>

                      <Activity className="h-10 w-10 text-emerald-300" />
                    </div>

                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{
                          width: `${sentimentScore}%`,
                        }}
                      />
                    </div>

                    <p className="mt-5 text-sm leading-6 text-slate-300">
                      Based only on developments connected to
                      holdings in this portfolio.
                    </p>
                  </article>

                  <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                    <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                      Upcoming events
                    </p>

                    <h2 className="mt-2 text-2xl font-black">
                      What to watch next
                    </h2>

                    <div className="mt-6 space-y-6">
                      {upcomingEvents
                        .slice(0, 5)
                        .map((event) => (
                          <div
                            key={event.id}
                            className="border-b border-slate-100 pb-6 last:border-none last:pb-0"
                          >
                            <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                              {formatEventDate(event.date)}
                            </p>

                            <h3 className="mt-3 font-bold text-slate-900">
                              {event.title}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {event.description}
                            </p>
                          </div>
                        ))}

                      {upcomingEvents.length === 0 ? (
                        <p className="text-sm leading-6 text-slate-500">
                          No high-priority economic events are
                          currently available.
                        </p>
                      ) : null}
                    </div>
                  </article>
                </div>
              </aside>
            </section>

            {macroNews.length > 0 ? (
              <section className="mt-10">
                <div className="mb-5">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Macro intelligence
                  </p>

                  <h2 className="mt-2 text-3xl font-black">
                    Broader market developments
                  </h2>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  {macroNews.map((item) => (
                    <NewsCard
                      key={item.id}
                      item={item}
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}

        <section className="mt-7 rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />

            <div>
              <p className="text-sm font-bold text-amber-900">
                Important reminder
              </p>

              <p className="mt-2 text-sm leading-6 text-amber-800">
                Investment OS provides decision-support
                information, not personal financial advice.
                Scores and indicators do not guarantee future
                performance.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function HeroMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>

      <p className="mt-2 text-xl font-bold text-white">
        {value}
      </p>
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
      <div
        className={`inline-flex rounded-xl p-2.5 ${toneClasses(
          tone,
        )}`}
      >
        {icon}
      </div>

      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function HoldingCard({
  holding,
}: {
  holding: HoldingAnalysis;
}) {
  const trendTone: AnalysisTone =
    holding.trend === "Bullish"
      ? "positive"
      : holding.trend === "Cautious"
        ? "warning"
        : "neutral";

  const thesisTone: AnalysisTone =
    holding.thesis === "Intact"
      ? "positive"
      : holding.thesis === "At risk"
        ? "negative"
        : "warning";

  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">
            {holding.symbol}
          </p>

          <h3 className="mt-2 text-xl font-black">
            {holding.name}
          </h3>
        </div>

        <div className="rounded-2xl bg-slate-950 px-3 py-2 text-center text-white">
          <p className="text-lg font-black">
            {holding.score.toFixed(1)}
          </p>

          <p className="text-[10px] font-semibold text-slate-400">
            / 10
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <AnalysisValue
          label="Trend"
          value={holding.trend}
          tone={trendTone}
        />

        <AnalysisValue
          label="Thesis"
          value={holding.thesis}
          tone={thesisTone}
        />

        <AnalysisValue
          label="Risk"
          value={holding.risk}
          tone={
            holding.risk === "High"
              ? "warning"
              : "neutral"
          }
        />

        <AnalysisValue
          label="Action"
          value={holding.action}
          tone="neutral"
        />
      </div>

      <p className="mt-5 line-clamp-4 text-sm leading-6 text-slate-500">
        {holding.explanation}
      </p>

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
      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>

      <span
        className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${toneClasses(
          tone,
        )}`}
      >
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
          <h3 className="font-black text-slate-900">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {description}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${toneClasses(
            tone,
          )}`}
        >
          {level}
        </span>
      </div>
    </div>
  );
}

function NewsCard({
  item,
  large = false,
}: {
  item: BriefingNewsItem;
  large?: boolean;
}) {
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

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${impactClasses(
                item.impact,
              )}`}
            >
              {item.impact}
            </span>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClasses(
                item.confidence,
              )}`}
            >
              {item.confidence} confidence
            </span>
          </div>

          <h3
            className={`mt-4 max-w-3xl font-black leading-7 ${
              large ? "text-xl" : "text-lg"
            }`}
          >
            {item.title}
          </h3>
        </div>

        <span className="text-sm font-medium text-slate-400">
          {formatBriefingTime(item.publishedAt)}
        </span>
      </div>

      <p className="mt-4 leading-7 text-slate-600">
        {item.summary}
      </p>

      <div className="mt-5 rounded-2xl bg-slate-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Portfolio impact
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {item.portfolioEffect}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {item.holdings.map((holding) => (
            <span
              key={holding}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white"
            >
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