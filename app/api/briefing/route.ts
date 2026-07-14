import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Impact = "Positive" | "Neutral" | "Negative";
type Confidence = "High" | "Medium" | "Low";

type HoldingConfig = {
  symbol: string;
  name: string;
  newsSymbols: string[];
  newsTags: string[];
  keywords: string[];
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

type BriefingEvent = {
  id: string;
  date: string;
  country: string;
  title: string;
  impact: "High impact" | "Medium impact";
  description: string;
  holdings: string[];
};

const HOLDINGS: HoldingConfig[] = [
  {
    symbol: "IB1T",
    name: "iShares Bitcoin ETP",
    newsSymbols: ["BTC-USD.CC"],
    newsTags: ["bitcoin", "cryptocurrency", "crypto"],
    keywords: [
      "bitcoin",
      "crypto",
      "digital asset",
      "etf inflow",
      "etf outflow",
      "liquidity",
    ],
  },
  {
    symbol: "STRC",
    name: "21Shares Strategy Yield ETP",
    newsSymbols: ["MSTR.US", "BTC-USD.CC"],
    newsTags: ["bitcoin", "cryptocurrency"],
    keywords: [
      "strategy",
      "microstrategy",
      "bitcoin",
      "yield",
      "preferred",
      "credit",
    ],
  },
  {
    symbol: "AIFS",
    name: "iShares AI Infrastructure UCITS ETF",
    newsSymbols: ["NVDA.US", "MSFT.US", "GOOGL.US"],
    newsTags: [
      "technology",
      "artificial intelligence",
      "semiconductors",
    ],
    keywords: [
      "artificial intelligence",
      "ai infrastructure",
      "data center",
      "semiconductor",
      "nvidia",
      "cloud",
      "electricity demand",
    ],
  },
  {
    symbol: "NUKL",
    name: "VanEck Uranium and Nuclear Technologies UCITS ETF",
    newsSymbols: ["CCJ.US"],
    newsTags: ["uranium", "nuclear", "energy"],
    keywords: [
      "uranium",
      "nuclear",
      "reactor",
      "cameco",
      "kazatomprom",
      "energy security",
    ],
  },
  {
    symbol: "VWCE",
    name: "Vanguard FTSE All-World UCITS ETF",
    newsSymbols: ["VTI.US", "SPY.US"],
    newsTags: [
      "economy",
      "markets",
      "earnings",
      "stocks",
    ],
    keywords: [
      "global equities",
      "stock market",
      "earnings",
      "economic growth",
      "recession",
      "trade",
    ],
  },
  {
    symbol: "PPFB",
    name: "iShares Physical Gold ETC",
    newsSymbols: ["GLD.US", "GC.COMM"],
    newsTags: ["gold", "commodities"],
    keywords: [
      "gold",
      "precious metals",
      "central bank",
      "real yields",
      "dollar",
      "geopolitical",
    ],
  },
];

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

  return HOLDINGS.filter((holding) => {
    const matchesSymbol = holding.newsSymbols.some(
      (symbol) =>
        haystack.includes(symbol.toLowerCase()),
    );

    const matchesTag = holding.newsTags.some((tag) =>
      haystack.includes(tag.toLowerCase()),
    );

    const matchesKeyword = holding.keywords.some(
      (keyword) =>
        haystack.includes(keyword.toLowerCase()),
    );

    return matchesSymbol || matchesTag || matchesKeyword;
  }).map((holding) => holding.symbol);
}

function getCategory(holdings: string[]) {
  if (holdings.includes("IB1T")) {
    return "Bitcoin";
  }

  if (holdings.includes("STRC")) {
    return "Income & Bitcoin";
  }

  if (holdings.includes("AIFS")) {
    return "AI infrastructure";
  }

  if (holdings.includes("NUKL")) {
    return "Uranium & nuclear";
  }

  if (holdings.includes("PPFB")) {
    return "Gold";
  }

  if (holdings.includes("VWCE")) {
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
): BriefingNewsItem | null {
  const title = normaliseText(item.title);

  if (!title) {
    return null;
  }

  const holdings = getHoldingsForNews(item);
  const impact = getImpactFromSentiment(item);
  const content = normaliseText(item.content);

  return {
    id: `${item.date ?? "news"}-${index}-${title}`,
    title,
    category: getCategory(holdings),
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
) {
  const symbols = Array.from(
    new Set(
      HOLDINGS.flatMap(
        (holding) => holding.newsSymbols,
      ),
    ),
  );

  const tags = [
    "economy",
    "markets",
    "bitcoin",
    "technology",
    "uranium",
    "gold",
  ];

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
): string[] {
  const type = normaliseText(event.type).toLowerCase();

  if (
    type.includes("interest") ||
    type.includes("inflation") ||
    type.includes("cpi") ||
    type.includes("federal reserve") ||
    type.includes("ecb")
  ) {
    return [
      "IB1T",
      "STRC",
      "AIFS",
      "VWCE",
      "PPFB",
    ];
  }

  if (
    type.includes("gdp") ||
    type.includes("employment") ||
    type.includes("payroll") ||
    type.includes("retail") ||
    type.includes("pmi")
  ) {
    return ["VWCE", "AIFS", "NUKL"];
  }

  return ["VWCE"];
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
        holdings: getEventHoldings(event),
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

function createFallbackNews(): BriefingNewsItem[] {
  return [
    {
      id: "fallback-bitcoin",
      title:
        "Bitcoin remains the largest driver of portfolio volatility",
      category: "Bitcoin",
      summary:
        "Bitcoin price movements continue to have an outsized effect on the total portfolio because IB1T remains the largest position.",
      portfolioEffect:
        "IB1T and STRC remain highly sensitive to Bitcoin price direction, liquidity and market sentiment.",
      impact: "Neutral",
      confidence: "High",
      holdings: ["IB1T", "STRC"],
      publishedAt: null,
      sourceUrl: null,
    },
    {
      id: "fallback-macro",
      title:
        "Interest-rate expectations remain important for growth assets",
      category: "Macro & markets",
      summary:
        "Changes in inflation, central-bank policy and bond yields may influence Bitcoin, global equities, AI infrastructure and gold.",
      portfolioEffect:
        "Lower yields may support IB1T, AIFS and VWCE, while unexpected inflation could increase volatility.",
      impact: "Neutral",
      confidence: "High",
      holdings: [
        "IB1T",
        "AIFS",
        "VWCE",
        "PPFB",
      ],
      publishedAt: null,
      sourceUrl: null,
    },
  ];
}

export async function GET() {
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

  const now = new Date();
  const newsFrom = createDateString(
    subtractDays(now, 4),
  );
  const eventsFrom = createDateString(now);
  const eventsTo = createDateString(
    addDays(now, 7),
  );

  const errors: string[] = [];

  const [newsResult, eventsResult] =
    await Promise.allSettled([
      fetchPortfolioNews(
        apiKey,
        newsFrom,
        createDateString(now),
      ),
      fetchEconomicEvents(
        apiKey,
        eventsFrom,
        eventsTo,
      ),
    ]);

  let news: BriefingNewsItem[] = [];

  if (newsResult.status === "fulfilled") {
    errors.push(...newsResult.value.errors);

    news = newsResult.value.news
      .map(mapNewsItem)
      .filter(
        (
          item,
        ): item is BriefingNewsItem =>
          item !== null,
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
    news = createFallbackNews();
  }

  let events: BriefingEvent[] = [];

  if (eventsResult.status === "fulfilled") {
    events = mapEconomicEvents(
      eventsResult.value,
    );
  } else {
    errors.push(
      eventsResult.reason instanceof Error
        ? eventsResult.reason.message
        : "Economic events could not be loaded.",
    );
  }

  const newsByHolding = Object.fromEntries(
    HOLDINGS.map((holding) => [
      holding.symbol,
      news
        .filter((item) =>
          item.holdings.includes(
            holding.symbol,
          ),
        )
        .slice(0, 5),
    ]),
  );

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),

    portfolio: {
      symbols: HOLDINGS.map(
        (holding) => holding.symbol,
      ),
      holdingCount: HOLDINGS.length,
    },

    summary: {
      outlook:
        news.filter(
          (item) => item.impact === "Positive",
        ).length >
        news.filter(
          (item) => item.impact === "Negative",
        ).length
          ? "Constructive"
          : "Balanced",

      mainRisk:
        "Portfolio concentration and sensitivity to Bitcoin remain the main risk.",

      mainOpportunity:
        "Diversified exposure through global equities, AI infrastructure and uranium may reduce dependence on a single return driver.",

      keyFocus:
        events[0]?.title ??
        "Monitor liquidity, interest rates and portfolio-specific news.",
    },

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