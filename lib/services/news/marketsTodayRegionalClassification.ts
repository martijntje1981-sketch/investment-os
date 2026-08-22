import type { NewsContentItem } from "@/lib/types/newsContent";

export type MarketsTodayRegionId =
  | "global"
  | "europe"
  | "us"
  | "asia"
  | "crypto";

export const MARKETS_TODAY_REGION_ORDER: readonly MarketsTodayRegionId[] = [
  "global",
  "europe",
  "us",
  "asia",
  "crypto",
] as const;

export const MARKETS_TODAY_REGION_LABELS: Record<MarketsTodayRegionId, string> =
  {
    global: "Global",
    europe: "Europe",
    us: "United States",
    asia: "Asia",
    crypto: "Crypto",
  };

export const MARKETS_TODAY_REGION_EMOJI: Record<MarketsTodayRegionId, string> = {
  global: "🌍",
  europe: "🇪🇺",
  us: "🇺🇸",
  asia: "🌏",
  crypto: "₿",
};

export type MarketsTodayClassificationResult = {
  region: MarketsTodayRegionId;
  reason: string;
  scores: Record<MarketsTodayRegionId, number>;
};

type KeywordRule = {
  pattern: RegExp;
  weight: number;
  label: string;
};

function buildClassificationText(item: NewsContentItem): string {
  return `${item.title} ${item.description ?? ""} ${item.summary ?? ""}`.trim();
}

function scoreRules(text: string, rules: KeywordRule[]): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  for (const rule of rules) {
    if (rule.pattern.test(text)) {
      score += rule.weight;
      reasons.push(rule.label);
    }
  }

  return { score, reasons };
}

const GLOBAL_RULES: KeywordRule[] = [
  { pattern: /\bworldwide\b/i, weight: 3, label: "worldwide" },
  { pattern: /\bglobal(?:\s+(?:economy|growth|trade|markets?|recession|inflation|outlook))?\b/i, weight: 3, label: "global" },
  { pattern: /\bworld economy\b/i, weight: 3, label: "world economy" },
  { pattern: /\bcross-market\b/i, weight: 3, label: "cross-market" },
  { pattern: /\binternational markets?\b/i, weight: 3, label: "international markets" },
  { pattern: /\bacross (?:major )?markets\b/i, weight: 3, label: "across markets" },
  { pattern: /\bmultiple regions?\b/i, weight: 3, label: "multiple regions" },
  { pattern: /\bseveral (?:major )?regions?\b/i, weight: 3, label: "several regions" },
  { pattern: /\bglobal commodities\b/i, weight: 2, label: "global commodities" },
  { pattern: /\bgeopolitic(?:al|s)\b/i, weight: 2, label: "geopolitical" },
];

const EUROPE_RULES: KeywordRule[] = [
  { pattern: /\beuropean union\b/i, weight: 4, label: "European Union" },
  { pattern: /\beurozone\b/i, weight: 4, label: "Eurozone" },
  { pattern: /\beuropean central bank\b/i, weight: 5, label: "European Central Bank" },
  { pattern: /\becb\b/i, weight: 5, label: "ECB" },
  { pattern: /\bftse\b/i, weight: 3, label: "FTSE" },
  { pattern: /\bdax\b/i, weight: 3, label: "DAX" },
  { pattern: /\bcac 40\b/i, weight: 3, label: "CAC 40" },
  { pattern: /\beuro stoxx\b/i, weight: 3, label: "Euro Stoxx" },
  { pattern: /\bstoxx 600\b/i, weight: 3, label: "STOXX 600" },
  { pattern: /\b(?:germany|german|france|french|italy|italian|spain|spanish|netherlands|dutch)\b/i, weight: 3, label: "European country" },
  { pattern: /\b(?:london stock exchange|lse|euronext|deutsche b[oö]rse)\b/i, weight: 3, label: "European exchange" },
  { pattern: /\beuro(?:\s+area|\-area)?\b/i, weight: 3, label: "euro area" },
  { pattern: /\beuropean (?:markets?|economy|inflation|rates?|regulation)\b/i, weight: 3, label: "European markets" },
];

const US_RULES: KeywordRule[] = [
  { pattern: /\bunited states\b/i, weight: 4, label: "United States" },
  { pattern: /\bu\.s\.(?:\s+government|\s+economy|\s+markets?|\s+inflation|\s+rates?)?\b/i, weight: 4, label: "U.S." },
  { pattern: /\busa\b/i, weight: 4, label: "USA" },
  { pattern: /\bfederal reserve\b/i, weight: 5, label: "Federal Reserve" },
  { pattern: /\bfed(?:\s+minutes|\s+decision|\s+policy|\s+rate)?\b/i, weight: 4, label: "Fed" },
  { pattern: /\bfomc\b/i, weight: 5, label: "FOMC" },
  { pattern: /\bnasdaq\b/i, weight: 4, label: "Nasdaq" },
  { pattern: /\bnyse\b/i, weight: 4, label: "NYSE" },
  { pattern: /\bs&p 500\b/i, weight: 4, label: "S&P 500" },
  { pattern: /\bdow jones\b/i, weight: 4, label: "Dow Jones" },
  { pattern: /\bwall street\b/i, weight: 3, label: "Wall Street" },
  { pattern: /\bu\.s\. treasury\b/i, weight: 3, label: "U.S. Treasury" },
  { pattern: /\b(?:us|american) (?:inflation|employment|jobs report|rates?|regulation|markets?)\b/i, weight: 3, label: "U.S. economy" },
];

const ASIA_RULES: KeywordRule[] = [
  { pattern: /\bchina\b/i, weight: 4, label: "China" },
  { pattern: /\bchinese\b/i, weight: 4, label: "Chinese" },
  { pattern: /\bjapan\b/i, weight: 4, label: "Japan" },
  { pattern: /\bjapanese\b/i, weight: 4, label: "Japanese" },
  { pattern: /\bbank of japan\b/i, weight: 5, label: "Bank of Japan" },
  { pattern: /\bboj\b/i, weight: 4, label: "BOJ" },
  { pattern: /\bindia\b/i, weight: 4, label: "India" },
  { pattern: /\bindian\b/i, weight: 4, label: "Indian" },
  { pattern: /\bsouth korea\b/i, weight: 4, label: "South Korea" },
  { pattern: /\bkorean\b/i, weight: 3, label: "Korean" },
  { pattern: /\btaiwan\b/i, weight: 4, label: "Taiwan" },
  { pattern: /\btaiwanese\b/i, weight: 4, label: "Taiwanese" },
  { pattern: /\bhong kong\b/i, weight: 4, label: "Hong Kong" },
  { pattern: /\bsingapore\b/i, weight: 4, label: "Singapore" },
  { pattern: /\basia(?:n|(?:\s+pacific))?\s+(?:markets?|economy|stocks?)\b/i, weight: 3, label: "Asian markets" },
  { pattern: /\bshanghai composite\b/i, weight: 4, label: "Shanghai Composite" },
  { pattern: /\bnikkei\b/i, weight: 4, label: "Nikkei" },
  { pattern: /\bhang seng\b/i, weight: 4, label: "Hang Seng" },
];

const CRYPTO_RULES: KeywordRule[] = [
  { pattern: /\bbitcoin\b/i, weight: 5, label: "Bitcoin" },
  { pattern: /\bbtc\b/i, weight: 4, label: "BTC" },
  { pattern: /\bethereum\b/i, weight: 5, label: "Ethereum" },
  { pattern: /\beth\b/i, weight: 4, label: "ETH" },
  { pattern: /\bcryptocurrenc(?:y|ies)\b/i, weight: 5, label: "cryptocurrency" },
  { pattern: /\bcrypto(?:\s+market|\s+exchange|\s+regulation|\s+assets?)?\b/i, weight: 4, label: "crypto" },
  { pattern: /\bblockchain\b/i, weight: 3, label: "blockchain" },
  { pattern: /\bstablecoin(?:s)?\b/i, weight: 4, label: "stablecoin" },
  { pattern: /\bdigital assets?\b/i, weight: 4, label: "digital asset" },
  { pattern: /\b(?:coinbase|binance|kraken)\b/i, weight: 4, label: "crypto exchange" },
  { pattern: /\b(?:solana|xrp|ripple)\b/i, weight: 3, label: "digital asset" },
];

function scoreAllRegions(
  text: string,
  item: NewsContentItem,
): Record<MarketsTodayRegionId, { score: number; reasons: string[] }> {
  const cryptoScore = scoreRules(text, CRYPTO_RULES);
  const europeScore = scoreRules(text, EUROPE_RULES);
  const usScore = scoreRules(text, US_RULES);
  const asiaScore = scoreRules(text, ASIA_RULES);
  const globalScore = scoreRules(text, GLOBAL_RULES);

  if (item.marketCategory === "crypto") {
    cryptoScore.score += 2;
    cryptoScore.reasons.push("marketCategory:crypto");
  }

  return {
    global: globalScore,
    europe: europeScore,
    us: usScore,
    asia: asiaScore,
    crypto: cryptoScore,
  };
}

function countRegionalMatches(
  scores: Record<MarketsTodayRegionId, { score: number; reasons: string[] }>,
): number {
  return (["europe", "us", "asia"] as const).filter(
    (region) => scores[region].score > 0,
  ).length;
}

function resolveClassificationPriority(
  scores: Record<MarketsTodayRegionId, { score: number; reasons: string[] }>,
): MarketsTodayClassificationResult | null {
  const flatScores = Object.fromEntries(
    MARKETS_TODAY_REGION_ORDER.map((region) => [
      region,
      scores[region].score,
    ]),
  ) as Record<MarketsTodayRegionId, number>;

  const maxScore = Math.max(...Object.values(flatScores));
  if (maxScore <= 0) {
    return null;
  }

  const regionalMatches = countRegionalMatches(scores);
  const globalScore = flatScores.global;
  const cryptoScore = flatScores.crypto;
  const europeScore = flatScores.europe;
  const usScore = flatScores.us;
  const asiaScore = flatScores.asia;
  const strongestRegionalOnly = Math.max(europeScore, usScore, asiaScore);

  if (cryptoScore > 0) {
    const strongestNonCrypto = Math.max(
      globalScore,
      europeScore,
      usScore,
      asiaScore,
    );
    if (cryptoScore >= strongestNonCrypto) {
      return {
        region: "crypto",
        reason: `Crypto signals: ${scores.crypto.reasons.join(", ")}`,
        scores: flatScores,
      };
    }
  }

  if (strongestRegionalOnly >= 5 && strongestRegionalOnly >= globalScore) {
    const regionalCandidates: MarketsTodayRegionId[] = ["europe", "us", "asia"];
    const bestRegional = regionalCandidates.reduce<MarketsTodayRegionId | null>(
      (best, region) => {
        if (flatScores[region] <= 0) {
          return best;
        }
        if (!best || flatScores[region] > flatScores[best]) {
          return region;
        }
        return best;
      },
      null,
    );

    if (bestRegional) {
      return {
        region: bestRegional,
        reason: `${MARKETS_TODAY_REGION_LABELS[bestRegional]} signals: ${scores[bestRegional].reasons.join(", ")}`,
        scores: flatScores,
      };
    }
  }

  const explicitGlobalSignal = scores.global.reasons.some((reason) =>
    [
      "worldwide",
      "world economy",
      "cross-market",
      "international markets",
      "several regions",
      "multiple regions",
      "across markets",
      "global commodities",
    ].includes(reason),
  );

  if (
    globalScore > 0 &&
    (regionalMatches >= 2 || explicitGlobalSignal) &&
    globalScore >= strongestRegionalOnly &&
    globalScore >= cryptoScore
  ) {
    return {
      region: "global",
      reason: `Global signals: ${scores.global.reasons.join(", ")}`,
      scores: flatScores,
    };
  }

  const regionalCandidates: MarketsTodayRegionId[] = ["europe", "us", "asia"];
  const bestRegional = regionalCandidates.reduce<MarketsTodayRegionId | null>(
    (best, region) => {
      if (flatScores[region] <= 0) {
        return best;
      }
      if (!best || flatScores[region] > flatScores[best]) {
        return region;
      }
      return best;
    },
    null,
  );

  if (bestRegional && flatScores[bestRegional] >= globalScore) {
    return {
      region: bestRegional,
      reason: `${MARKETS_TODAY_REGION_LABELS[bestRegional]} signals: ${scores[bestRegional].reasons.join(", ")}`,
      scores: flatScores,
    };
  }

  if (globalScore > 0 && regionalMatches === 0 && cryptoScore === 0) {
    return {
      region: "global",
      reason: `Global signals: ${scores.global.reasons.join(", ")}`,
      scores: flatScores,
    };
  }

  return null;
}

/** Deterministic, explainable regional classification for Markets Today. */
export function classifyMarketsTodayRegion(
  item: NewsContentItem,
): MarketsTodayClassificationResult | null {
  const text = buildClassificationText(item);
  const scores = scoreAllRegions(text, item);
  return resolveClassificationPriority(scores);
}

export function classifyMarketsTodayRegionId(
  item: NewsContentItem,
): MarketsTodayRegionId | null {
  return classifyMarketsTodayRegion(item)?.region ?? null;
}
