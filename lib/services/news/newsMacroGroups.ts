import type { NewsContentItem } from "@/lib/types/newsContent";

export type MacroTopicId =
  | "interest_rates"
  | "inflation"
  | "central_banks"
  | "geopolitics"
  | "currencies"
  | "commodities";

export type MacroTopicGroup = {
  id: MacroTopicId;
  label: string;
  items: NewsContentItem[];
};

const TOPIC_LABELS: Record<MacroTopicId, string> = {
  interest_rates: "Interest Rates",
  inflation: "Inflation",
  central_banks: "Central Banks",
  geopolitics: "Geopolitics",
  currencies: "Currencies",
  commodities: "Commodities",
};

const INTEREST_RATE_PATTERN =
  /\b(interest rate|rate cut|rate hike|yields?|bond yield|treasury yield)\b/i;
const INFLATION_PATTERN = /\b(inflation|cpi|ppi|deflation|price pressure)\b/i;
const CENTRAL_BANK_PATTERN = /\b(fed|fomc|ecb|boe|central bank|monetary policy)\b/i;
const CURRENCY_PATTERN =
  /\b(currency|currencies|forex|fx|dollar|euro|yen|sterling|exchange rate)\b/i;

export function classifyMacroTopic(item: NewsContentItem): MacroTopicId | null {
  const text = `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`;

  if (item.marketCategory === "geopolitics" || /\b(war|sanction|tariff|geopolit)\b/i.test(text)) {
    return "geopolitics";
  }
  if (item.marketCategory === "commodities" || /\b(oil|gold|commodit)\b/i.test(text)) {
    return "commodities";
  }
  if (INFLATION_PATTERN.test(text)) {
    return "inflation";
  }
  if (INTEREST_RATE_PATTERN.test(text)) {
    return "interest_rates";
  }
  if (CENTRAL_BANK_PATTERN.test(text)) {
    return "central_banks";
  }
  if (CURRENCY_PATTERN.test(text)) {
    return "currencies";
  }

  if (item.marketCategory === "macro" || item.category === "macro") {
    return "central_banks";
  }

  return null;
}

export function buildMacroTopicGroups(
  items: NewsContentItem[],
): MacroTopicGroup[] {
  const buckets = new Map<MacroTopicId, NewsContentItem[]>();

  for (const item of items) {
    const topic = classifyMacroTopic(item);
    if (!topic) continue;
    const list = buckets.get(topic) ?? [];
    list.push(item);
    buckets.set(topic, list);
  }

  const order: MacroTopicId[] = [
    "interest_rates",
    "inflation",
    "central_banks",
    "geopolitics",
    "currencies",
    "commodities",
  ];

  return order
    .map((id) => ({
      id,
      label: TOPIC_LABELS[id],
      items: buckets.get(id) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}
