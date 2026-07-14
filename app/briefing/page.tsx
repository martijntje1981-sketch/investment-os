"use client";

import { useEffect, useMemo, useState } from "react";
import PageNavigation from "../../components/PageNavigation";

type Impact = "Positive" | "Neutral" | "Negative";
type Confidence = "High" | "Medium" | "Low";

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

  newsByHolding: Record<
    string,
    BriefingNewsItem[]
  >;

  upcomingEvents: BriefingEvent[];
  errors: string[];

  error?: string;
};

type DisplaySignal = {
  label: string;
  value: string;
  description: string;
  tone: "positive" | "warning" | "neutral";
};

const HOLDING_ORDER = [
  "IB1T",
  "STRC",
  "AIFS",
  "NUKL",
  "VWCE",
  "PPFB",
];

const HOLDING_NAMES: Record<string, string> = {
  IB1T: "Bitcoin",
  STRC: "Income & Bitcoin",
  AIFS: "AI Infrastructure",
  NUKL: "Uranium & Nuclear",
  VWCE: "Global Equities",
  PPFB: "Gold",
};

const fallbackNews: BriefingNewsItem[] = [
  {
    id: "fallback-bitcoin",
    title:
      "Bitcoin remains the largest driver of portfolio volatility",
    category: "Bitcoin",
    summary:
      "Bitcoin price movements continue to have an outsized effect on the total portfolio because IB1T remains the largest position.",
    portfolioEffect:
      "IB1T and STRC remain highly sensitive to Bitcoin price direction, liquidity and broader risk sentiment.",
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
      "Lower yields may support IB1T, AIFS and VWCE, while unexpected inflation could increase portfolio volatility.",
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

function normaliseTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ");
}

function deduplicateNews(
  items: BriefingNewsItem[],
) {
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

function selectPortfolioNews(
  items: BriefingNewsItem[],
) {
  const uniqueItems = deduplicateNews(items);
  const selected: BriefingNewsItem[] = [];
  const holdingCounts = new Map<string, number>();

  for (const item of uniqueItems) {
    const linkedHoldings = item.holdings.filter(
      (holding) =>
        HOLDING_ORDER.includes(holding),
    );

    if (linkedHoldings.length === 0) {
      continue;
    }

    const canUseItem = linkedHoldings.some(
      (holding) =>
        (holdingCounts.get(holding) ?? 0) < 2,
    );

    if (!canUseItem) {
      continue;
    }

    selected.push(item);

    for (const holding of linkedHoldings) {
      const currentCount =
        holdingCounts.get(holding) ?? 0;

      if (currentCount < 2) {
        holdingCounts.set(
          holding,
          currentCount + 1,
        );
      }
    }

    if (selected.length >= 10) {
      break;
    }
  }

  return selected;
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

function confidenceClasses(
  confidence: Confidence,
) {
  if (confidence === "High") {
    return "bg-blue-100 text-blue-700";
  }

  if (confidence === "Medium") {
    return "bg-violet-100 text-violet-700";
  }

  return "bg-slate-100 text-slate-600";
}

function signalClasses(
  tone: DisplaySignal["tone"],
) {
  if (tone === "positive") {
    return "bg-emerald-400";
  }

  if (tone === "warning") {
    return "bg-amber-400";
  }

  return "bg-sky-400";
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

export default function BriefingPage() {
  const [data, setData] =
    useState<BriefingResponse | null>(null);

  const [isLoading, setIsLoading] =
    useState(true);

  const [errorMessage, setErrorMessage] =
    useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadBriefing() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const response = await fetch(
          "/api/briefing",
          {
            method: "GET",
            cache: "no-store",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const responseData =
          (await response.json()) as
            BriefingResponse;

        if (!response.ok || !responseData.success) {
          throw new Error(
            responseData.error ||
              "The briefing could not be loaded.",
          );
        }

        if (isMounted) {
          setData(responseData);
        }
      } catch (error) {
        console.error(
          "Could not load portfolio briefing:",
          error,
        );

        if (isMounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "The briefing could not be loaded.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadBriefing();

    return () => {
      isMounted = false;
    };
  }, []);

  const macroNews = useMemo(() => {
    const source =
      data?.macroNews?.length
        ? data.macroNews
        : fallbackNews;

    return deduplicateNews(source).slice(0, 5);
  }, [data]);

  const portfolioNews = useMemo(() => {
    const source =
      data?.portfolioNews?.length
        ? data.portfolioNews
        : fallbackNews;

    return selectPortfolioNews(source);
  }, [data]);

  const signals: DisplaySignal[] = [
    {
      label: "Portfolio outlook",
      value:
        data?.summary.outlook ?? "Balanced",
      description:
        "Current news sentiment and macro conditions across the portfolio.",
      tone:
        data?.summary.outlook ===
        "Constructive"
          ? "positive"
          : "neutral",
    },
    {
      label: "Main risk",
      value: "Concentration",
      description:
        data?.summary.mainRisk ??
        "Bitcoin remains the dominant source of portfolio volatility.",
      tone: "warning",
    },
    {
      label: "Main opportunity",
      value: "Diversification",
      description:
        data?.summary.mainOpportunity ??
        "Global equities, AI infrastructure and uranium broaden the return drivers.",
      tone: "positive",
    },
    {
      label: "Key focus",
      value:
        data?.summary.keyFocus ??
        "Macro liquidity",
      description:
        "The most relevant development to monitor over the next few sessions.",
      tone: "neutral",
    },
  ];

  const positiveCount = portfolioNews.filter(
    (item) => item.impact === "Positive",
  ).length;

  const negativeCount = portfolioNews.filter(
    (item) => item.impact === "Negative",
  ).length;

  const heroTone =
    positiveCount > negativeCount
      ? "Constructive"
      : negativeCount > positiveCount
        ? "Cautious"
        : "Balanced";

  return (
    <main className="min-h-screen bg-slate-50 px-5 pb-32 pt-8 text-slate-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <PageNavigation />

        <section className="mb-8 mt-6">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">
            Daily intelligence
          </p>

          <div className="mt-2 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
                Portfolio briefing
              </h1>

              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
                Macro developments, market news and
                holding-specific intelligence in one
                clear daily overview.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                Briefing status
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
                      ? "Fallback active"
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
              Live briefing data is temporarily
              unavailable. Stable fallback insights
              remain visible.
            </div>
          ) : null}
        </section>

        <section className="overflow-hidden rounded-[2rem] bg-slate-950 p-7 text-white shadow-xl sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                Today&apos;s conclusion
              </p>

              <h2 className="mt-3 max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
                The portfolio outlook is{" "}
                {heroTone.toLowerCase()}, while
                concentration remains the main risk.
              </h2>

              <p className="mt-5 max-w-3xl leading-7 text-slate-300">
                {data?.summary.mainOpportunity ??
                  "The portfolio has multiple long-term growth drivers, but new capital should continue to improve diversification rather than increase dependence on Bitcoin."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <HeroMetric
                label="Portfolio tone"
                value={heroTone}
              />

              <HeroMetric
                label="Risk level"
                value="High"
              />

              <HeroMetric
                label="Positive items"
                value={String(positiveCount)}
              />

              <HeroMetric
                label="Warnings"
                value={String(negativeCount)}
              />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {signals.map((signal) => (
            <article
              key={signal.label}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`h-3 w-3 rounded-full ${signalClasses(
                    signal.tone,
                  )}`}
                />

                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {signal.label}
                </p>
              </div>

              <p className="mt-4 text-2xl font-bold">
                {signal.value}
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                {signal.description}
              </p>
            </article>
          ))}
        </section>

        <section className="mt-9">
          <div className="mb-5">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
              Macro intelligence
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              Developments affecting multiple holdings
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
              Central-bank policy, inflation,
              liquidity, economic growth and broader
              market developments.
            </p>
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

        <section className="mt-10 grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div>
            <div className="mb-5">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                Portfolio intelligence
              </p>

              <h2 className="mt-2 text-3xl font-bold">
                News linked to your holdings
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                The selection is limited to the most
                relevant items, with no more than two
                primary items per holding.
              </p>
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
                  No relevant holding-specific news is
                  available at the moment.
                </div>
              ) : null}
            </div>
          </div>

          <aside>
            <div className="sticky top-6 space-y-6">
              <article className="rounded-[1.75rem] bg-slate-900 p-7 text-white shadow-lg">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Investment coach
                </p>

                <h2 className="mt-3 text-2xl font-bold">
                  Keep improving portfolio balance
                </h2>

                <p className="mt-4 leading-7 text-slate-300">
                  The portfolio already has strong
                  upside exposure. The priority for new
                  capital remains improving
                  diversification without selling the
                  main Bitcoin position.
                </p>

                <div className="mt-6 space-y-3">
                  <CoachRow
                    number="1"
                    text="Prioritise diversified contributions"
                  />

                  <CoachRow
                    number="2"
                    text="Monitor Bitcoin concentration"
                  />

                  <CoachRow
                    number="3"
                    text="Avoid reacting to one news headline"
                  />
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Upcoming events
                </p>

                <h2 className="mt-2 text-2xl font-bold">
                  What to watch next
                </h2>

                <div className="mt-6 space-y-6">
                  {(data?.upcomingEvents ?? [])
                    .slice(0, 6)
                    .map((event) => (
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

                        <h3 className="mt-3 font-bold text-slate-900">
                          {event.title}
                        </h3>

                        <p className="mt-1 text-xs font-semibold text-slate-400">
                          {event.country}
                        </p>

                        <p className="mt-2 text-sm leading-6 text-slate-500">
                          {event.description}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {event.holdings.map(
                            (holding) => (
                              <span
                                key={holding}
                                className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600"
                              >
                                {holding}
                              </span>
                            ),
                          )}
                        </div>
                      </div>
                    ))}

                  {(data?.upcomingEvents ?? [])
                    .length === 0 ? (
                    <p className="text-sm leading-6 text-slate-500">
                      No high-priority economic events
                      are currently available.
                    </p>
                  ) : null}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-slate-200 bg-white p-7 shadow-sm">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Holdings covered
                </p>

                <div className="mt-5 space-y-3">
                  {HOLDING_ORDER.map((holding) => {
                    const itemCount =
                      portfolioNews.filter((item) =>
                        item.holdings.includes(
                          holding,
                        ),
                      ).length;

                    return (
                      <div
                        key={holding}
                        className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3"
                      >
                        <div>
                          <p className="font-bold text-slate-900">
                            {holding}
                          </p>

                          <p className="text-xs text-slate-500">
                            {HOLDING_NAMES[holding]}
                          </p>
                        </div>

                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm">
                          {itemCount}{" "}
                          {itemCount === 1
                            ? "item"
                            : "items"}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-6">
                <p className="text-sm font-bold text-amber-900">
                  Important reminder
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-800">
                  This briefing is a decision-support
                  tool. News sentiment and portfolio
                  impact assessments can change and are
                  not guarantees of future performance.
                </p>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </main>
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
            className={`mt-4 max-w-3xl font-bold leading-7 ${
              large
                ? "text-xl"
                : "text-lg"
            }`}
          >
            {item.title}
          </h3>
        </div>

        <span className="text-sm font-medium text-slate-400">
          {formatBriefingTime(
            item.publishedAt,
          )}
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
            className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
          >
            Open source →
          </a>
        ) : null}
      </div>
    </article>
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

function CoachRow({
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