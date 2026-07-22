import type { MissedItem } from "@/lib/services/discover/types";

const KIND_LABELS: Record<MissedItem["kind"], string> = {
  holding_risk: "Portfolio risk",
  upcoming_event: "Upcoming event",
  holding_development: "Holding update",
  macro_development: "Macro",
  must_watch: "Must watch",
  analyst_change: "Analyst update",
  dividend_event: "Dividend update",
  quiet_state: "Briefing status",
};

export function missedItemKindLabel(kind: MissedItem["kind"]): string {
  return KIND_LABELS[kind];
}

export function formatMissedItemMeta(item: MissedItem): string | null {
  const parts: string[] = [];
  if (item.affectedHolding) parts.push(item.affectedHolding);
  if (item.eventDate) {
    parts.push(item.eventTime ? `${item.eventDate} · ${item.eventTime}` : item.eventDate);
  }
  if (item.sourceName) parts.push(item.sourceName);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export const DISCOVER_RESEARCH_DISCLAIMER =
  "Shown for research and educational context only. This is not investment advice or a recommendation to buy or sell any investment.";
