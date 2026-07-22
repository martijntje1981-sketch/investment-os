import { detectPortfolioMarketImpact } from "@/lib/services/news/newsPortfolioSentiment";
import type { NewsContentItem, UpcomingMarketEvent } from "@/lib/types/newsContent";

export type MarketsTodayRegionId = "us" | "europe" | "crypto";

export type MarketsTodayRegion = {
  id: MarketsTodayRegionId;
  label: string;
  sentiment: "Positive" | "Neutral" | "Negative";
  largestMovers: string[];
  majorEvents: string[];
};

const US_PATTERN =
  /\b(us|u\.s\.|usa|nasdaq|s&p|dow|wall street|fed|fomc|treasury)\b/i;
const EUROPE_PATTERN =
  /\b(europe|eurozone|ecb|ftse|dax|cac|stoxx|uk|germany|france)\b/i;
const CRYPTO_PATTERN =
  /\b(bitcoin|btc|ethereum|eth|crypto|blockchain|digital asset)\b/i;

function regionForItem(item: NewsContentItem): MarketsTodayRegionId | null {
  const text = `${item.title} ${item.description ?? ""}`;
  if (item.marketCategory === "crypto" || CRYPTO_PATTERN.test(text)) {
    return "crypto";
  }
  if (EUROPE_PATTERN.test(text)) {
    return "europe";
  }
  if (US_PATTERN.test(text)) {
    return "us";
  }
  return null;
}

function aggregateSentiment(
  items: NewsContentItem[],
): "Positive" | "Neutral" | "Negative" {
  let positive = 0;
  let negative = 0;

  for (const item of items) {
    const impact = detectPortfolioMarketImpact(item);
    if (impact === "Positive") positive += 1;
    if (impact === "Negative") negative += 1;
  }

  if (positive > negative) return "Positive";
  if (negative > positive) return "Negative";
  return "Neutral";
}

function largestMovers(items: NewsContentItem[]): string[] {
  return items
    .slice(0, 3)
    .map((item) => item.title.replace(/\s*[|–—-]\s*.+$/, "").trim());
}

function eventsForRegion(
  region: MarketsTodayRegionId,
  events: UpcomingMarketEvent[],
): string[] {
  return events
    .filter((event) => {
      const text = `${event.title} ${event.description}`.toLowerCase();
      if (region === "crypto") {
        return /\b(bitcoin|crypto|btc)\b/i.test(text);
      }
      if (region === "europe") {
        return /\b(ecb|europe|euro)\b/i.test(text);
      }
      return /\b(fed|cpi|jobs|us|treasury)\b/i.test(text);
    })
    .slice(0, 2)
    .map((event) => event.title);
}

export function buildMarketsTodayRegions(input: {
  items: NewsContentItem[];
  events: UpcomingMarketEvent[];
}): MarketsTodayRegion[] {
  const byRegion: Record<MarketsTodayRegionId, NewsContentItem[]> = {
    us: [],
    europe: [],
    crypto: [],
  };

  for (const item of input.items) {
    const region = regionForItem(item);
    if (region) {
      byRegion[region].push(item);
    }
  }

  const labels: Record<MarketsTodayRegionId, string> = {
    us: "US",
    europe: "Europe",
    crypto: "Crypto",
  };

  return (["us", "europe", "crypto"] as MarketsTodayRegionId[])
    .map((id) => ({
      id,
      label: labels[id],
      sentiment: aggregateSentiment(byRegion[id]),
      largestMovers: largestMovers(byRegion[id]),
      majorEvents: eventsForRegion(id, input.events),
    }))
    .filter(
      (region) =>
        region.largestMovers.length > 0 || region.majorEvents.length > 0,
    );
}
