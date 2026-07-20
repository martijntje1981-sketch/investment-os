import type {
  NewsContentItem,
  TodaysMarketBrief,
  UpcomingMarketEvent,
} from "@/lib/types/newsContent";

function stripTitleSuffix(title: string): string {
  return title.replace(/\s*[|–—-]\s*.+$/, "").trim();
}

function buildInsight(
  id: string,
  label: string,
  text: string,
  kind: TodaysMarketBrief["keyInsights"][number]["kind"],
) {
  return { id, label, text, kind };
}

function synthesizeMacroInsight(item: NewsContentItem): string {
  const topic = stripTitleSuffix(item.title);
  return `${item.sourceName}: ${item.aiSummary || topic}`;
}

function synthesizePortfolioInsight(item: NewsContentItem): string {
  const symbols = item.matchedSymbols.join(", ");
  return `${symbols} exposure — ${item.aiSummary || stripTitleSuffix(item.title)}`;
}

function buildFallbackInsights(
  macroNews: NewsContentItem[],
  portfolioNews: NewsContentItem[],
): TodaysMarketBrief["keyInsights"] {
  const insights: TodaysMarketBrief["keyInsights"] = [
    buildInsight(
      "macro-default",
      "Macro pulse",
      "Markets are digesting the latest policy, inflation, and growth signals from official video coverage.",
      "macro",
    ),
    buildInsight(
      "portfolio-default",
      "Portfolio lens",
      portfolioNews.length > 0
        ? "At least one headline today maps directly to your saved holdings."
        : "Add holdings to unlock portfolio-specific read-through in tomorrow's brief.",
      "portfolio",
    ),
    buildInsight(
      "risk-default",
      "Risk context",
      "Cross-asset volatility remains sensitive to central-bank guidance and earnings expectations.",
      "general",
    ),
    buildInsight(
      "action-default",
      "Stay prepared",
      "Use upcoming catalysts below to decide what deserves attention before the next portfolio review.",
      "general",
    ),
  ];

  return insights;
}

function pickWhatToWatch(
  upcomingEvents: UpcomingMarketEvent[],
  macroNews: NewsContentItem[],
): string {
  const highImpactEvent = upcomingEvents.find((event) => event.impact === "High");
  if (highImpactEvent) {
    return `${highImpactEvent.title} on ${highImpactEvent.timeLabel} — ${highImpactEvent.description}`;
  }

  const topMacro = macroNews[0];
  if (topMacro) {
    return `Follow ${stripTitleSuffix(topMacro.title)} for the latest macro read-through.`;
  }

  return "Scan upcoming CPI, Fed, and ECB dates for the next volatility catalyst.";
}

export function buildTodaysMarketBrief(
  portfolioNews: NewsContentItem[],
  macroNews: NewsContentItem[],
  upcomingEvents: UpcomingMarketEvent[],
  updatedAt: string,
): TodaysMarketBrief {
  const insights: TodaysMarketBrief["keyInsights"] = [];

  if (macroNews[0]) {
    insights.push(
      buildInsight(
        "macro-1",
        "Macro headline",
        synthesizeMacroInsight(macroNews[0]),
        "macro",
      ),
    );
  }

  if (macroNews[1]) {
    insights.push(
      buildInsight(
        "macro-2",
        "Macro development",
        synthesizeMacroInsight(macroNews[1]),
        "macro",
      ),
    );
  }

  if (portfolioNews[0]) {
    insights.push(
      buildInsight(
        "portfolio-1",
        "Portfolio headline",
        synthesizePortfolioInsight(portfolioNews[0]),
        "portfolio",
      ),
    );
  }

  if (portfolioNews[1]) {
    insights.push(
      buildInsight(
        "portfolio-2",
        "Holdings watch",
        synthesizePortfolioInsight(portfolioNews[1]),
        "portfolio",
      ),
    );
  }

  const nextEvent = upcomingEvents[0];
  if (nextEvent) {
    insights.push(
      buildInsight(
        `event-${nextEvent.id}`,
        "Calendar catalyst",
        `${nextEvent.title} (${nextEvent.timeLabel}) — ${nextEvent.description}`,
        "general",
      ),
    );
  }

  if (macroNews[2]) {
    insights.push(
      buildInsight(
        "macro-3",
        "Market signal",
        synthesizeMacroInsight(macroNews[2]),
        "macro",
      ),
    );
  }

  const keyInsights =
    insights.length >= 4
      ? insights.slice(0, 6)
      : [...insights, ...buildFallbackInsights(macroNews, portfolioNews)].slice(
          0,
          6,
        );

  return {
    title: "Today's Market Brief",
    updatedAt,
    keyInsights,
    biggestMacroDevelopment: macroNews[0]
      ? synthesizeMacroInsight(macroNews[0])
      : "No major macro headline is available yet — refresh shortly for the latest official coverage.",
    biggestPortfolioDevelopment: portfolioNews[0]
      ? synthesizePortfolioInsight(portfolioNews[0])
      : null,
    whatToWatchToday: pickWhatToWatch(upcomingEvents, macroNews),
  };
}

export function createEmptyMarketBrief(updatedAt: string): TodaysMarketBrief {
  return {
    title: "Today's Market Brief",
    updatedAt,
    keyInsights: buildFallbackInsights([], []),
    biggestMacroDevelopment:
      "Market brief unavailable right now. Refresh to load the latest intelligence.",
    biggestPortfolioDevelopment: null,
    whatToWatchToday: "Check upcoming events once the feed reconnects.",
  };
}
