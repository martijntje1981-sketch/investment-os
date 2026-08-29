import type { PortfolioTimelineEvent } from "@/lib/services/portfolio/timeline/types";

/** Canonical contribution and withdrawal events only. Does not invent trades. */
export function canonicalPortfolioActivityEvents(
  events: readonly PortfolioTimelineEvent[],
): PortfolioTimelineEvent[] {
  return events.filter(
    (event) => event.kind === "contribution" || event.kind === "withdrawal",
  );
}
