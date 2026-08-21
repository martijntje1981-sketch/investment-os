/**
 * Upcoming events only when they can be tied to this portfolio honestly.
 * Generic macro/Fed filler is omitted.
 */

import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";
import type { UpcomingMarketEvent } from "@/lib/types/newsContent";

const FIXED_INCOME_RELEVANCE_PERCENT = 8;

function groupWeight(
  allocation: PortfolioExposureAllocation | null | undefined,
  groupId: string,
): number {
  return (
    allocation?.groups.find((row) => row.groupId === groupId)?.rawPercent ?? 0
  );
}

function isUpcoming(event: UpcomingMarketEvent, today: string): boolean {
  return event.date >= today;
}

function matchesHolding(
  event: UpcomingMarketEvent,
  holdings: StoredPortfolioHolding[],
): boolean {
  const title = event.title.toLowerCase();
  return holdings.some((holding) => {
    const symbol = holding.symbol.trim().toLowerCase();
    const name = holding.name.trim().toLowerCase();
    if (symbol.length >= 2 && title.includes(symbol)) return true;
    if (name.length >= 4 && title.includes(name)) return true;
    return false;
  });
}

export function isUpcomingEventPortfolioRelevant(
  event: UpcomingMarketEvent,
  allocation: PortfolioExposureAllocation | null | undefined,
  holdings: StoredPortfolioHolding[],
  today: string,
): boolean {
  if (!isUpcoming(event, today)) return false;
  if (event.category === "earnings") {
    return matchesHolding(event, holdings);
  }
  if (
    event.category === "fed" ||
    event.category === "ecb" ||
    event.category === "cpi"
  ) {
    return groupWeight(allocation, "fixed_income") >= FIXED_INCOME_RELEVANCE_PERCENT;
  }
  return false;
}

export function selectRelevantUpcomingEvent(
  events: UpcomingMarketEvent[] | null | undefined,
  allocation: PortfolioExposureAllocation | null | undefined,
  holdings: StoredPortfolioHolding[],
  today: string,
): UpcomingMarketEvent | null {
  const upcoming = (events ?? []).filter((event) =>
    isUpcomingEventPortfolioRelevant(event, allocation, holdings, today),
  );
  if (upcoming.length === 0) return null;
  const high = upcoming.find((event) => event.impact === "High");
  return high ?? upcoming[0] ?? null;
}

export function formatEventWhen(date: string): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(parsed);
}
