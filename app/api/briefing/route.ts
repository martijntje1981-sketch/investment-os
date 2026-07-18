import { NextResponse } from "next/server";
import {
  type BriefingHolding,
  matchNewsToPortfolioHoldings,
  providerSymbolsForNews,
  resolveBriefingPortfolio,
} from "@/lib/services/briefing/briefingPortfolio";
import type { PortfolioInstrumentPayload } from "@/lib/types/portfolioStorage";

export const dynamic = "force-dynamic";

type Impact = "Positive" | "Neutral" | "Negative";
type Confidence = "High" | "Medium" | "Low";

type BriefingEvent = {
  id: string;
  date: string;
  country: string;
  title: string;
  impact: "High impact" | "Medium impact";
  description: string;
  holdings: string[];
};

type EodhdNewsItem = {
  date?: string;
  title?: string;
  content?: string;
  link?: string;
  symbols?: string[];
  tags?: string[];
  sentiment?: {
    polarity?: number;
    neg?: number;
    neu?: number;
    pos?: number;
  };
};

type EodhdEconomicEvent = {
  type?: string;
  comparison?: string;
  country?: string;
  date?: string;
  actual?: number | null;
  previous?: number | null;
  estimate?: number | null;
  change?: number | null;
  change_percentage?: number | null;
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
};

type AnalysisRating = "Strong" | "Healthy" | "Watch" | "Elevated risk";
type AnalysisAction = "Hold" | "Monitor" | "Review";

type HoldingAssessment = {
  symbol: string;
  name: string;
  score: number;
  outlook: "Constructive" | "Balanced" | "Cautious";
  thesisStatus: "Intact" | "Under review" | "At risk";
  risk: "Low" | "Medium" | "High";
  action: AnalysisAction;
  positiveSignals: number;
  negativeSignals: number;
  neutralSignals: number;
  explanation: string;
};

type PortfolioAnalysisEngine = {
  healthScore: number;
  healthRating: AnalysisRating;
  outlook: "Constructive" | "Balanced" | "Cautious";
  sentimentScore: number;
  diversificationScore: number;
  concentrationScore: number;
  macroRiskScore: number;
  growthScore: number;
  incomeScore: number;
  todaysInsight: string;
  actionItems: string[];
  risks: Array<{
    title: string;
    severity: "Low" | "Medium" | "High";
    description: string;
    holdings: string[];
  }>;
  opportunities: Array<{
    title: string;
    strength: "Moderate" | "Strong";
    description: string;
    holdings: string[];
  }>;
  holdingAssessments: HoldingAssessment[];
};

const HIGH_IMPACT_EVENT_KEYWORDS = [
  "interest rate decision",
  "inflation rate",
  "consumer price index",
  "cpi",
  "core inflation",
  "non farm payrolls",
  "nonfarm payrolls",
  "unemployment rate",
  "gross domestic product",
  "gdp growth rate",
  "federal reserve",
  "ecb",
];

const MEDIUM_IMPACT_EVENT_KEYWORDS = [
  "retail sales",
  "pmi",
  "consumer confidence",
  "industrial production",
  "producer price index",
  "ppi",
  "jobless claims",
  "trade balance",
];

function normaliseText(value: string | undefined) {
  return (value ?? "").trim();
}

function createDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function subtractDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() - days);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getImpactFromSentiment(
  item: EodhdNewsItem,
): Impact {
  const polarity = item.sentiment?.polarity;

  if (!isFiniteNumber(polarity)) {
    return "Neutral";
  }

  if (polarity >= 0.15) {
    return "Positive";
  }

  if (polarity <= -0.15) {
    return "Negative";
  }

  return "Neutral";
}

function getConfidence(
  matchedHoldings: string[],
  item: EodhdNewsItem,
): Confidence {
  const hasSentiment = isFiniteNumber(
    item.sentiment?.polarity,
  );

  if (matchedHoldings.length >= 2 && hasSentiment) {
    return "High";
  }

  if (matchedHoldings.length >= 1) {
    return "Medium";
  }

  return "Low";
}

function truncateText(value: string, maxLength: number) {
  const cleanValue = value.replace(/\s+/g, " ").trim();

  if (cleanValue.length <= maxLength) {
    return cleanValue;
  }

  return `${cleanValue.slice(0, maxLength).trim()}…`;
}

function getHoldingsForNews(
  item: EodhdNewsItem,
  portfolio: BriefingHolding[],
): string[] {
  const haystack = [
    item.title,
    item.content,
    ...(item.tags ?? []),
    ...(item.symbols ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return matchNewsToPortfolioHoldings(haystack, portfolio);
}

function getCategory(
  holdings: string[],
  portfolio: BriefingHolding[],
) {
  const matched = portfolio.filter((holding) =>
    holdings.includes(holding.symbol),
  );
  const label = (
    matched[0]?.instrumentName ??
    matched[0]?.name ??
    ""
  ).toLowerCase();

  if (label.includes("bitcoin") || label.includes("crypto")) {
    return "Bitcoin";
  }

  if (label.includes("gold")) {
    return "Gold";
  }

  if (label.includes("uranium") || label.includes("nuclear")) {
    return "Uranium & nuclear";
  }

  if (
    label.includes("ai") ||
    label.includes("infrastructure") ||
    label.includes("semiconductor")
  ) {
    return "AI infrastructure";
  }

  if (
    label.includes("world") ||
    label.includes("equity") ||
    label.includes("etf")
  ) {
    return "Global equities";
  }

  return "Macro & markets";
}

function getPortfolioEffect(
  holdings: string[],
  impact: Impact,
) {
  const holdingText =
    holdings.length > 0
      ? holdings.join(", ")
      : "the broader portfolio";

  if (impact === "Positive") {
    return `Potentially supportive for ${holdingText}. The effect depends on whether the development is confirmed by market prices and follow-through.`;
  }

  if (impact === "Negative") {
    return `Potential downside risk for ${holdingText}. Monitor whether the development changes the medium-term investment case or only creates short-term volatility.`;
  }

  return `Relevant for ${holdingText}, but the immediate portfolio impact appears balanced or uncertain.`;
}

function mapNewsItem(
  item: EodhdNewsItem,
  index: number,
  portfolio: BriefingHolding[],
): BriefingNewsItem | null {
  const title = normaliseText(item.title);

  if (!title) {
    return null;
  }

  const holdings = getHoldingsForNews(item, portfolio);
  const impact = getImpactFromSentiment(item);
  const content = normaliseText(item.content);

  return {
    id: `${item.date ?? "news"}-${index}-${title}`,
    title,
    category: getCategory(holdings, portfolio),
    summary: content
      ? truncateText(content, 420)
      : "A new market development has been identified. Open the original source for the full details.",
    portfolioEffect: getPortfolioEffect(
      holdings,
      impact,
    ),
    impact,
    confidence: getConfidence(holdings, item),
    holdings,
    publishedAt: item.date ?? null,
    sourceUrl: item.link ?? null,
  };
}

async function fetchJson<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const details = await response.text();

    throw new Error(
      `EODHD returned ${response.status}: ${details}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchNewsForSymbol(
  symbol: string,
  apiKey: string,
  from: string,
  to: string,
): Promise<EodhdNewsItem[]> {
  const url = new URL("https://eodhd.com/api/news");

  url.searchParams.set("s", symbol);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "8");
  url.searchParams.set("offset", "0");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  const data = await fetchJson<unknown>(url);

  return Array.isArray(data)
    ? (data as EodhdNewsItem[])
    : [];
}

async function fetchNewsForTag(
  tag: string,
  apiKey: string,
  from: string,
  to: string,
): Promise<EodhdNewsItem[]> {
  const url = new URL("https://eodhd.com/api/news");

  url.searchParams.set("t", tag);
  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("limit", "10");
  url.searchParams.set("offset", "0");
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  const data = await fetchJson<unknown>(url);

  return Array.isArray(data)
    ? (data as EodhdNewsItem[])
    : [];
}

function deduplicateNews(
  items: EodhdNewsItem[],
): EodhdNewsItem[] {
  const seen = new Set<string>();

  return items.filter((item) => {
    const title = normaliseText(item.title).toLowerCase();

    if (!title || seen.has(title)) {
      return false;
    }

    seen.add(title);
    return true;
  });
}

async function fetchPortfolioNews(
  apiKey: string,
  from: string,
  to: string,
  portfolio: BriefingHolding[],
) {
  const symbols = providerSymbolsForNews(portfolio);

  const tags = ["economy", "markets"];

  const results = await Promise.allSettled([
    ...symbols.map((symbol) =>
      fetchNewsForSymbol(
        symbol,
        apiKey,
        from,
        to,
      ),
    ),
    ...tags.map((tag) =>
      fetchNewsForTag(tag, apiKey, from, to),
    ),
  ]);

  const news = results.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value
      : [],
  );

  const errors = results
    .filter(
      (
        result,
      ): result is PromiseRejectedResult =>
        result.status === "rejected",
    )
    .map((result) =>
      result.reason instanceof Error
        ? result.reason.message
        : "Unknown news API error.",
    );

  return {
    news: deduplicateNews(news),
    errors,
  };
}

async function fetchEconomicEvents(
  apiKey: string,
  from: string,
  to: string,
): Promise<EodhdEconomicEvent[]> {
  const url = new URL(
    "https://eodhd.com/api/economic-events",
  );

  url.searchParams.set("from", from);
  url.searchParams.set("to", to);
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");

  const data = await fetchJson<unknown>(url);

  return Array.isArray(data)
    ? (data as EodhdEconomicEvent[])
    : [];
}

function getEventImportance(
  event: EodhdEconomicEvent,
): "High impact" | "Medium impact" | null {
  const eventType = normaliseText(
    event.type,
  ).toLowerCase();

  if (
    HIGH_IMPACT_EVENT_KEYWORDS.some((keyword) =>
      eventType.includes(keyword),
    )
  ) {
    return "High impact";
  }

  if (
    MEDIUM_IMPACT_EVENT_KEYWORDS.some((keyword) =>
      eventType.includes(keyword),
    )
  ) {
    return "Medium impact";
  }

  return null;
}

function getEventHoldings(
  event: EodhdEconomicEvent,
  portfolioSymbols: string[],
): string[] {
  if (portfolioSymbols.length === 0) {
    return [];
  }

  const type = normaliseText(event.type).toLowerCase();

  if (
    type.includes("interest") ||
    type.includes("inflation") ||
    type.includes("cpi") ||
    type.includes("federal reserve") ||
    type.includes("ecb") ||
    type.includes("gdp") ||
    type.includes("employment") ||
    type.includes("payroll") ||
    type.includes("retail") ||
    type.includes("pmi")
  ) {
    return portfolioSymbols;
  }

  return portfolioSymbols.slice(
    0,
    Math.min(3, portfolioSymbols.length),
  );
}

function getEventDescription(
  event: EodhdEconomicEvent,
) {
  const values = [
    isFiniteNumber(event.estimate)
      ? `Estimate: ${event.estimate}`
      : null,
    isFiniteNumber(event.previous)
      ? `Previous: ${event.previous}`
      : null,
    isFiniteNumber(event.actual)
      ? `Actual: ${event.actual}`
      : null,
  ].filter(Boolean);

  if (values.length === 0) {
    return "This event may influence interest-rate expectations, currencies and risk appetite.";
  }

  return `${values.join(
    " · ",
  )}. The release may affect market expectations and portfolio volatility.`;
}

function mapEconomicEvents(
  events: EodhdEconomicEvent[],
  portfolioSymbols: string[],
): BriefingEvent[] {
  return events
    .map((event, index) => {
      const importance = getEventImportance(event);
      const title = normaliseText(event.type);
      const date = normaliseText(event.date);

      if (!importance || !title || !date) {
        return null;
      }

      return {
        id: `${date}-${event.country ?? "global"}-${index}-${title}`,
        date,
        country:
          normaliseText(event.country) || "Global",
        title,
        impact: importance,
        description: getEventDescription(event),
        holdings: getEventHoldings(event, portfolioSymbols),
      };
    })
    .filter(
      (
        event,
      ): event is BriefingEvent => event !== null,
    )
    .sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    .slice(0, 12);
}


function clampScore(value: number, minimum = 0, maximum = 10) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundScore(value: number) {
  return Math.round(value * 10) / 10;
}

function countNewsSignals(items: BriefingNewsItem[]) {
  return {
    positive: items.filter((item) => item.impact === "Positive").length,
    negative: items.filter((item) => item.impact === "Negative").length,
    neutral: items.filter((item) => item.impact === "Neutral").length,
  };
}

function getHoldingAssessment(
  holding: BriefingHolding,
  news: BriefingNewsItem[],
): HoldingAssessment {
  const relevantNews = news.filter((item) =>
    item.holdings.includes(holding.symbol),
  );
  const signals = countNewsSignals(relevantNews);
  const baseRisk: "Low" | "Medium" | "High" =
    signals.negative >= 3 ? "High" : signals.negative >= 1 ? "Medium" : "Low";
  const config = {
    name: holding.instrumentName ?? holding.name,
    baseRisk,
    growthWeight: 0.5,
    incomeWeight: 0.2,
  };

  const signalBalance = signals.positive - signals.negative;
  const confidenceBonus = relevantNews.filter(
    (item) => item.confidence === "High",
  ).length * 0.15;

  const riskPenalty =
    config.baseRisk === "High"
      ? 0.8
      : config.baseRisk === "Medium"
        ? 0.35
        : 0;

  const score = roundScore(
    clampScore(
      7 +
        signalBalance * 0.55 +
        confidenceBonus -
        riskPenalty,
    ),
  );

  const outlook: HoldingAssessment["outlook"] =
    signalBalance >= 2
      ? "Constructive"
      : signalBalance <= -2
        ? "Cautious"
        : "Balanced";

  const thesisStatus: HoldingAssessment["thesisStatus"] =
    signals.negative >= 3 && signals.negative > signals.positive
      ? "At risk"
      : signals.negative >= 1 &&
          signals.negative >= signals.positive
        ? "Under review"
        : "Intact";

  const action: AnalysisAction =
    thesisStatus === "At risk"
      ? "Review"
      : thesisStatus === "Under review" ||
          config.baseRisk === "High"
        ? "Monitor"
        : "Hold";

  const explanation =
    relevantNews.length === 0
      ? `No material new signals were identified for ${config.name}. The current assessment is based on its structural risk profile.`
      : signalBalance > 0
        ? `Recent news flow is net positive for ${config.name}, although market confirmation and follow-through remain important.`
        : signalBalance < 0
          ? `Recent news flow contains more negative than positive signals for ${config.name}. Monitor whether these developments affect the medium-term thesis.`
          : `Recent signals for ${config.name} are mixed or balanced. No clear thesis-changing development has been identified.`;

  return {
    symbol: holding.symbol,
    name: config.name,
    score,
    outlook,
    thesisStatus,
    risk: config.baseRisk,
    action,
    positiveSignals: signals.positive,
    negativeSignals: signals.negative,
    neutralSignals: signals.neutral,
    explanation,
  };
}

function createPortfolioRisks(
  news: BriefingNewsItem[],
  events: BriefingEvent[],
  portfolio: BriefingHolding[],
): PortfolioAnalysisEngine["risks"] {
  const risks: PortfolioAnalysisEngine["risks"] = [];
  const portfolioSymbols = portfolio.map((holding) => holding.symbol);

  const negativeNews = news.filter((item) => item.impact === "Negative");

  if (negativeNews.length >= 3) {
    risks.push({
      title: "Negative news flow",
      severity: "Medium",
      description:
        "Several recent developments may weigh on portfolio holdings. Monitor whether sentiment stabilises.",
      holdings: Array.from(
        new Set(negativeNews.flatMap((item) => item.holdings)),
      ).slice(0, 6),
    });
  }

  const highImpactEvents = events.filter(
    (event) => event.impact === "High impact",
  );

  if (highImpactEvents.length > 0) {
    risks.push({
      title: "Upcoming macro volatility",
      severity: "Medium",
      description: `${highImpactEvents.length} high-impact economic event${highImpactEvents.length === 1 ? " is" : "s are"} scheduled in the coming week and may affect rates, currencies and risk assets.`,
      holdings: Array.from(
        new Set(highImpactEvents.flatMap((event) => event.holdings)),
      ).slice(0, 6),
    });
  }

  if (portfolioSymbols.length <= 2) {
    risks.push({
      title: "Portfolio concentration",
      severity: "High",
      description:
        "The portfolio contains very few holdings, which increases exposure to individual instrument risk.",
      holdings: portfolioSymbols,
    });
  }

  return risks.slice(0, 4);
}

function createPortfolioOpportunities(
  news: BriefingNewsItem[],
  portfolio: BriefingHolding[],
): PortfolioAnalysisEngine["opportunities"] {
  const positiveByHolding = portfolio.map((holding) => {
    const positiveSignals = news.filter(
      (item) =>
        item.impact === "Positive" &&
        item.holdings.includes(holding.symbol),
    ).length;

    return {
      symbol: holding.symbol,
      name: holding.instrumentName ?? holding.name,
      positiveSignals,
    };
  }).sort((a, b) => b.positiveSignals - a.positiveSignals);

  const opportunities: PortfolioAnalysisEngine["opportunities"] = [];

  for (const item of positiveByHolding) {
    if (item.positiveSignals === 0) continue;

    opportunities.push({
      title: `${item.name} momentum`,
      strength:
        item.positiveSignals >= 3 ? "Strong" : "Moderate",
      description: `${item.positiveSignals} positive signal${item.positiveSignals === 1 ? " has" : "s have"} been identified. Monitor whether fundamentals and market prices confirm the improving news flow.`,
      holdings: [item.symbol],
    });

    if (opportunities.length >= 3) break;
  }

  if (opportunities.length === 0) {
    opportunities.push({
      title: "Portfolio diversification",
      strength: "Moderate",
      description:
        "Adding complementary holdings may improve balance across themes and reduce single-instrument dependence.",
      holdings: portfolio.slice(0, 4).map((holding) => holding.symbol),
    });
  }

  return opportunities;
}

function createPortfolioAnalysis(
  news: BriefingNewsItem[],
  events: BriefingEvent[],
  portfolio: BriefingHolding[],
): PortfolioAnalysisEngine {
  const signals = countNewsSignals(news);
  const totalDirectionalSignals =
    signals.positive + signals.negative;

  const sentimentScore =
    totalDirectionalSignals === 0
      ? 5
      : clampScore(
          5 +
            ((signals.positive - signals.negative) /
              totalDirectionalSignals) *
              3,
        );

  const holdingAssessments = portfolio.map((holding) =>
    getHoldingAssessment(holding, news),
  );

  const averageHoldingScore =
    holdingAssessments.reduce(
      (total, holding) => total + holding.score,
      0,
    ) / Math.max(holdingAssessments.length, 1);

  const highImpactEventCount = events.filter(
    (event) => event.impact === "High impact",
  ).length;

  const macroRiskScore = clampScore(
    4.5 +
      highImpactEventCount * 0.55 +
      signals.negative * 0.12,
  );

  // These structural scores are intentionally conservative until live
  // portfolio weights are connected to this endpoint.
  const diversificationScore = 7.2;
  const concentrationScore = 6.2;

  const growthScore = clampScore(
    6.8 +
      holdingAssessments.reduce(
        (total, holding) =>
          total + ((holding.score - 5) * 0.5) / Math.max(portfolio.length, 1),
        0,
      ),
  );

  const incomeScore = clampScore(
    5.5 +
      holdingAssessments.reduce(
        (total, holding) =>
          total + ((holding.score - 5) * 0.1) / Math.max(portfolio.length, 1),
        0,
      ),
  );

  const healthScore = roundScore(
    clampScore(
      averageHoldingScore * 0.45 +
        sentimentScore * 0.2 +
        diversificationScore * 0.2 +
        (10 - macroRiskScore) * 0.15,
    ),
  );

  const healthRating: AnalysisRating =
    healthScore >= 8
      ? "Strong"
      : healthScore >= 6.5
        ? "Healthy"
        : healthScore >= 5
          ? "Watch"
          : "Elevated risk";

  const outlook: PortfolioAnalysisEngine["outlook"] =
    sentimentScore >= 6.3
      ? "Constructive"
      : sentimentScore <= 3.7
        ? "Cautious"
        : "Balanced";

  const mostPositiveHolding = [...holdingAssessments].sort(
    (a, b) =>
      b.positiveSignals -
      b.negativeSignals -
      (a.positiveSignals - a.negativeSignals),
  )[0];

  const mostAtRiskHolding = [...holdingAssessments].sort(
    (a, b) =>
      b.negativeSignals -
      b.positiveSignals -
      (a.negativeSignals - a.positiveSignals),
  )[0];

  const todaysInsight =
    mostPositiveHolding &&
    mostPositiveHolding.positiveSignals >
      mostPositiveHolding.negativeSignals
      ? `${mostPositiveHolding.name} currently has the strongest positive news balance in your portfolio.`
      : highImpactEventCount > 0
        ? `The portfolio outlook is ${outlook.toLowerCase()}, but ${highImpactEventCount} high-impact macro event${highImpactEventCount === 1 ? "" : "s"} may increase short-term volatility.`
        : `The portfolio outlook is ${outlook.toLowerCase()}. No single news development currently appears strong enough to change the overall investment thesis.`;

  const actionItems = [
    highImpactEventCount > 0
      ? `Monitor ${events.find((event) => event.impact === "High impact")?.title ?? "the next high-impact macro event"}.`
      : "Monitor liquidity, interest rates and broader risk appetite.",
    portfolio.length > 0
      ? "Review whether current holdings remain aligned with your intended risk level."
      : "Add holdings to receive portfolio-specific analysis.",
    mostAtRiskHolding?.negativeSignals > 0
      ? `Watch ${mostAtRiskHolding.name} for confirmation that recent negative signals are temporary rather than thesis-changing.`
      : "No immediate holding-level action is required based on current news signals.",
  ];

  return {
    healthScore,
    healthRating,
    outlook,
    sentimentScore: roundScore(sentimentScore),
    diversificationScore: roundScore(diversificationScore),
    concentrationScore: roundScore(concentrationScore),
    macroRiskScore: roundScore(macroRiskScore),
    growthScore: roundScore(growthScore),
    incomeScore: roundScore(incomeScore),
    todaysInsight,
    actionItems,
    risks: createPortfolioRisks(news, events, portfolio),
    opportunities: createPortfolioOpportunities(news, portfolio),
    holdingAssessments,
  };
}

function createFallbackNews(
  portfolio: BriefingHolding[],
): BriefingNewsItem[] {
  const symbols = portfolio.map((holding) => holding.symbol);

  return [
    {
      id: "fallback-macro",
      title:
        "Interest-rate expectations remain important for portfolio holdings",
      category: "Macro & markets",
      summary:
        "Changes in inflation, central-bank policy and bond yields may influence equities, thematic exposures and risk appetite.",
      portfolioEffect:
        symbols.length > 0
          ? `Macro developments may affect ${symbols.slice(0, 4).join(", ")} and the broader portfolio.`
          : "Macro developments may affect market sentiment and portfolio volatility.",
      impact: "Neutral",
      confidence: "High",
      holdings: symbols.slice(0, 4),
      publishedAt: null,
      sourceUrl: null,
    },
  ];
}

async function buildBriefingResponse(
  portfolioInputs: PortfolioInstrumentPayload[],
) {
  const apiKey = process.env.EODHD_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        error:
          "EODHD_API_KEY is missing from the environment variables.",
      },
      { status: 500 },
    );
  }

  const portfolio = await resolveBriefingPortfolio(portfolioInputs);
  const portfolioSymbolList = portfolio.map((holding) => holding.symbol);

  const now = new Date();
  const newsFrom = createDateString(subtractDays(now, 4));
  const eventsFrom = createDateString(now);
  const eventsTo = createDateString(addDays(now, 7));

  const errors: string[] = [];

  const [newsResult, eventsResult] = await Promise.allSettled([
    fetchPortfolioNews(
      apiKey,
      newsFrom,
      createDateString(now),
      portfolio,
    ),
    fetchEconomicEvents(apiKey, eventsFrom, eventsTo),
  ]);

  let news: BriefingNewsItem[] = [];

  if (newsResult.status === "fulfilled") {
    errors.push(...newsResult.value.errors);

    news = newsResult.value.news
      .map((item, index) => mapNewsItem(item, index, portfolio))
      .filter(
        (item): item is BriefingNewsItem => item !== null,
      )
      .filter(
        (item) =>
          item.holdings.length > 0 ||
          item.category === "Macro & markets",
      )
      .slice(0, 18);
  } else {
    errors.push(
      newsResult.reason instanceof Error
        ? newsResult.reason.message
        : "Portfolio news could not be loaded.",
    );
  }

  if (news.length === 0) {
    news = createFallbackNews(portfolio);
  }

  let events: BriefingEvent[] = [];

  if (eventsResult.status === "fulfilled") {
    events = mapEconomicEvents(eventsResult.value, portfolioSymbolList);
  } else {
    errors.push(
      eventsResult.reason instanceof Error
        ? eventsResult.reason.message
        : "Economic events could not be loaded.",
    );
  }

  const analysis = createPortfolioAnalysis(news, events, portfolio);

  const newsByHolding = Object.fromEntries(
    portfolio.map((holding) => [
      holding.symbol,
      news
        .filter((item) => item.holdings.includes(holding.symbol))
        .slice(0, 5),
    ]),
  );

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),

    portfolio: {
      symbols: portfolioSymbolList,
      holdingCount: portfolio.length,
    },

    summary: {
      outlook: analysis.outlook,
      mainRisk:
        analysis.risks[0]?.description ??
        "Monitor macro volatility and portfolio concentration.",
      mainOpportunity:
        analysis.opportunities[0]?.description ??
        "Positive news flow may create opportunities when confirmed by market prices.",
      keyFocus:
        analysis.actionItems[0] ??
        events[0]?.title ??
        "Monitor liquidity, interest rates and portfolio-specific news.",
    },

    analysis,
    macroNews: news
      .filter(
        (item) =>
          item.category === "Macro & markets" ||
          item.holdings.length >= 2,
      )
      .slice(0, 6),
    portfolioNews: news.slice(0, 18),
    newsByHolding,
    upcomingEvents: events,
    errors,
  });
}

/** Backward-compatible GET — uses demo portfolio seed when no holdings supplied. */
export async function GET() {
  return buildBriefingResponse([]);
}

type BriefingPostBody = {
  holdings?: PortfolioInstrumentPayload[];
};

/** POST — briefing for caller-supplied portfolio holdings with providerSymbol resolution. */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as BriefingPostBody;
    const holdings = Array.isArray(body.holdings) ? body.holdings : [];
    return buildBriefingResponse(holdings);
  } catch (error) {
    console.error("Briefing API POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Something went wrong while loading the briefing.",
      },
      { status: 500 },
    );
  }
}