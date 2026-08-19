import type { OfficialMacroFeed } from "@/lib/services/news/officialMacro/types";
import type { OfficialMacroTopic } from "@/lib/types/newsContent";

const TOPIC_PATTERNS: Array<{ topic: OfficialMacroTopic; pattern: RegExp }> = [
  {
    topic: "inflation",
    pattern:
      /\b(inflation|hicp|consumer price|pce price|price stability|deflation|cpi\b|ppi\b)\b/i,
  },
  {
    topic: "labor",
    pattern:
      /\b(unemployment|employment|labor market|labour market|payrolls?|jobs report|jobless)\b/i,
  },
  {
    topic: "interest_rates",
    pattern:
      /\b(interest rates?|policy rate|federal funds|fed funds|deposit facility|rate (?:decision|hike|cut|hold)|key rates?)\b/i,
  },
  {
    topic: "financial_stability",
    pattern:
      /\b(financial stability|systemic risk|stress test|credit conditions|banking system)\b/i,
  },
  {
    topic: "fx_usd",
    pattern:
      /\b(us dollar|u\.s\. dollar|exchange rate|foreign exchange|\bfx\b|dollar index)\b/i,
  },
  {
    topic: "liquidity",
    pattern:
      /\b(liquidity|reserve balances|money supply|quantitative (?:easing|tightening)|balance sheet)\b/i,
  },
  {
    topic: "growth",
    pattern:
      /\b(gdpnow|gdp|recession|economic growth|economic outlook|beige book|output)\b/i,
  },
  {
    topic: "monetary_policy",
    pattern:
      /\b(monetary policy|fomc|rate-setting|asset purchase|quantitative (?:easing|tightening)|policy decision)\b/i,
  },
];

const NOISE_TITLE_PATTERN =
  /\b(procurement|vacanc(?:y|ies)|job opening|enforcement action|inspector general|reporting form|honorary|commencement|consultative)\b/i;

export function isOfficialMacroNoiseTitle(title: string): boolean {
  return NOISE_TITLE_PATTERN.test(title);
}

export function classifyOfficialMacroTopic(
  title: string,
  description: string | null,
  feed: Pick<OfficialMacroFeed, "defaultTopic" | "feedKind">,
): OfficialMacroTopic | null {
  const text = `${title} ${description ?? ""}`;

  for (const row of TOPIC_PATTERNS) {
    if (row.pattern.test(text)) {
      return row.topic;
    }
  }

  if (feed.defaultTopic) {
    return feed.defaultTopic;
  }

  return null;
}
