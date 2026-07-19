import type { NewsContentItem } from "@/lib/types/newsContent";

const SPORTS_PATTERNS = [
  /\bfifa\b/i,
  /\bworld cup\b/i,
  /\bfootball\b/i,
  /\bsoccer\b/i,
  /\bsports betting\b/i,
  /\bbetmgm\b/i,
  /\bpremier league\b/i,
  /\bnfl\b/i,
  /\bnba\b/i,
  /\bmlb\b/i,
  /\bolympic(?:s)?\b/i,
  /\btournament\b/i,
];

const FINANCIAL_SIGNAL_PATTERNS = [
  /\bmarket(?:s)?\b/i,
  /\bstock(?:s)?\b/i,
  /\bequity\b/i,
  /\bequities\b/i,
  /\bbond(?:s)?\b/i,
  /\bfed\b/i,
  /\binflation\b/i,
  /\bearnings\b/i,
  /\beconom(?:y|ic)\b/i,
  /\bbitcoin\b/i,
  /\bbtc\b/i,
  /\bcrypto\b/i,
  /\bportfolio\b/i,
  /\binvest(?:ment|ing|or)\b/i,
  /\btrading\b/i,
  /\binterest rate(?:s)?\b/i,
  /\bcentral bank\b/i,
  /\bipo\b/i,
  /\bdividend(?:s)?\b/i,
  /\bmacro\b/i,
  /\bforecast\b/i,
  /\bforecasting\b/i,
  /\bwall street\b/i,
  /\bsemiconductor(?:s)?\b/i,
  /\benergy\b/i,
  /\boil\b/i,
  /\bgold\b/i,
  /\b uranium\b/i,
  /\bnuclear\b/i,
  /\betf\b/i,
  /\bindex fund\b/i,
];

function buildHaystack(item: NewsContentItem): string {
  return `${item.title} ${item.description ?? ""}`.trim();
}

export function isSportsContent(
  title: string,
  description?: string | null,
): boolean {
  const haystack = `${title} ${description ?? ""}`;
  return SPORTS_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function isFinancialMarketContent(item: NewsContentItem): boolean {
  const haystack = buildHaystack(item);

  if (isSportsContent(item.title, item.description)) {
    return false;
  }

  if (["markets", "macro", "crypto"].includes(item.category)) {
    return FINANCIAL_SIGNAL_PATTERNS.some((pattern) => pattern.test(haystack));
  }

  return FINANCIAL_SIGNAL_PATTERNS.some((pattern) => pattern.test(haystack));
}

export function filterFinancialNewsItems(
  items: NewsContentItem[],
): NewsContentItem[] {
  return items.filter(isFinancialMarketContent);
}
