import type {
  NewsContentCategory,
  NewsContentItem,
  NewsMarketCategory,
} from "@/lib/types/newsContent";

const COMMODITIES_PATTERN =
  /\b(oil|gold|silver|copper|uranium|commodit(?:y|ies)|crude|wti|brent|natural gas|precious metals)\b/i;
const GEOPOLITICS_PATTERN =
  /\b(war|sanction|geopolit|conflict|tariff|trade war|election|nato|ukraine|middle east|taiwan)\b/i;
const EQUITIES_PATTERN =
  /\b(stock|equit(?:y|ies)|earnings|nasdaq|s&p|dow|ftse|share|ipo|company|corporate)\b/i;
const CRYPTO_PATTERN =
  /\b(bitcoin|btc|ethereum|eth|crypto|blockchain|digital asset|coin bureau)\b/i;
const MACRO_PATTERN =
  /\b(fed|fomc|ecb|cpi|inflation|interest rate|gdp|central bank|monetary|treasury|bond yield)\b/i;

export function classifyMarketCategory(
  item: Pick<NewsContentItem, "title" | "description" | "category" | "sourceType">,
): NewsMarketCategory {
  const text = `${item.title} ${item.description ?? ""}`.toLowerCase();

  if (item.category === "crypto" || CRYPTO_PATTERN.test(text)) {
    return "crypto";
  }

  if (COMMODITIES_PATTERN.test(text)) {
    return "commodities";
  }

  if (GEOPOLITICS_PATTERN.test(text)) {
    return "geopolitics";
  }

  if (
    MACRO_PATTERN.test(text) ||
    item.category === "macro" ||
    item.category === "markets"
  ) {
    if (EQUITIES_PATTERN.test(text) && !MACRO_PATTERN.test(text)) {
      return "equities";
    }
    return "macro";
  }

  if (EQUITIES_PATTERN.test(text) || item.category === "technology") {
    return "equities";
  }

  return "general";
}

export function assignMarketCategories(
  items: NewsContentItem[],
): NewsContentItem[] {
  return items.map((item) => ({
    ...item,
    marketCategory: classifyMarketCategory(item),
  }));
}

export function isMacroNewsCandidate(item: NewsContentItem): boolean {
  return (
    item.relevanceScore < 15 &&
    ["macro", "equities", "crypto", "commodities", "geopolitics", "general"].includes(
      item.marketCategory,
    )
  );
}

export function mapLegacyCategory(
  category: NewsContentCategory,
): NewsMarketCategory {
  switch (category) {
    case "crypto":
      return "crypto";
    case "macro":
    case "markets":
      return "macro";
    case "energy":
      return "commodities";
    case "technology":
      return "equities";
    default:
      return "general";
  }
}
