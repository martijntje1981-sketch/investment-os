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
  insightType: "fact" | "interpretation",
  sourceName?: string | null,
) {
  return { id, label, text, kind, insightType, sourceName };
}

function factFromItem(item: NewsContentItem): string {
  const topic = stripTitleSuffix(item.title);
  return `${item.sourceName}: ${item.summary || topic}`;
}

function interpretationFromPortfolioItem(item: NewsContentItem): string {
  const symbols = item.matchedSymbols.join(", ");
  return `${symbols} exposure — ${item.interpretation}`;
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
    return `Follow ${stripTitleSuffix(topMacro.title)} (${topMacro.sourceName}) for the latest verified macro headline.`;
  }

  return "No verified calendar catalysts are available right now. Check back after the next data refresh.";
}

function countSources(items: NewsContentItem[]): number {
  return new Set(items.map((item) => item.sourceName)).size;
}

export function buildTodaysMarketBrief(
  portfolioNews: NewsContentItem[],
  macroNews: NewsContentItem[],
  upcomingEvents: UpcomingMarketEvent[],
  updatedAt: string,
): TodaysMarketBrief {
  const allItems = [...portfolioNews, ...macroNews];
  const sourceCount = countSources(allItems);
  const hasVerifiedContent = allItems.length > 0 || upcomingEvents.length > 0;

  const insights: TodaysMarketBrief["keyInsights"] = [];

  if (macroNews[0]) {
    insights.push(
      buildInsight(
        "macro-fact-1",
        "Confirmed macro headline",
        factFromItem(macroNews[0]),
        "macro",
        "fact",
        macroNews[0].sourceName,
      ),
    );
  }

  if (macroNews[1]) {
    insights.push(
      buildInsight(
        "macro-fact-2",
        "Macro development",
        factFromItem(macroNews[1]),
        "macro",
        "fact",
        macroNews[1].sourceName,
      ),
    );
  }

  if (portfolioNews[0]) {
    insights.push(
      buildInsight(
        "portfolio-fact-1",
        "Confirmed portfolio headline",
        factFromItem(portfolioNews[0]),
        "portfolio",
        "fact",
        portfolioNews[0].sourceName,
      ),
    );
    insights.push(
      buildInsight(
        "portfolio-read-1",
        "Portfolio read-through",
        interpretationFromPortfolioItem(portfolioNews[0]),
        "portfolio",
        "interpretation",
        portfolioNews[0].sourceName,
      ),
    );
  }

  const nextEvent = upcomingEvents[0];
  if (nextEvent) {
    insights.push(
      buildInsight(
        `event-${nextEvent.id}`,
        "Verified calendar event",
        `${nextEvent.title} (${nextEvent.timeLabel}) — ${nextEvent.description}`,
        "general",
        "fact",
        nextEvent.source,
      ),
    );
  }

  if (macroNews[0] && !portfolioNews[0]) {
    insights.push(
      buildInsight(
        "macro-read-1",
        "Macro read-through",
        macroNews[0].interpretation,
        "macro",
        "interpretation",
        macroNews[0].sourceName,
      ),
    );
  }

  return {
    title: "Today's Market Brief",
    updatedAt,
    keyInsights: insights.slice(0, 6),
    biggestMacroDevelopment: macroNews[0]
      ? factFromItem(macroNews[0])
      : "No verified macro headline is available in the current feed.",
    biggestMacroDevelopmentType: macroNews[0] ? "fact" : "unavailable",
    biggestPortfolioDevelopment: portfolioNews[0]
      ? factFromItem(portfolioNews[0])
      : null,
    biggestPortfolioDevelopmentType: portfolioNews[0] ? "fact" : "unavailable",
    whatToWatchToday: pickWhatToWatch(upcomingEvents, macroNews),
    sourceCount,
    hasVerifiedContent,
  };
}

export function createEmptyMarketBrief(updatedAt: string): TodaysMarketBrief {
  return {
    title: "Today's Market Brief",
    updatedAt,
    keyInsights: [],
    biggestMacroDevelopment:
      "Market brief unavailable right now. Refresh to load verified headlines when sources reconnect.",
    biggestMacroDevelopmentType: "unavailable",
    biggestPortfolioDevelopment: null,
    biggestPortfolioDevelopmentType: "unavailable",
    whatToWatchToday:
      "No verified events or headlines are available until data sources reconnect.",
    sourceCount: 0,
    hasVerifiedContent: false,
  };
}
