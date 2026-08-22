/**
 * Central keyword mapper for Perspectives topic tags.
 * Generates 2–4 restrained tags from video titles only.
 */

export const PERSPECTIVE_TOPIC_TAGS = [
  "Bitcoin",
  "Crypto",
  "Inflation",
  "Interest Rates",
  "Federal Reserve",
  "ECB",
  "Liquidity",
  "Gold",
  "AI",
  "NVIDIA",
  "Technology",
  "ETFs",
  "Equities",
  "Earnings",
  "Valuation",
  "Macro",
] as const;

export type PerspectiveTopicTag = (typeof PERSPECTIVE_TOPIC_TAGS)[number];

type TopicRule = {
  tag: PerspectiveTopicTag;
  patterns: RegExp[];
};

/** Ordered for priority — first matches win when capping tags. */
const TOPIC_RULES: TopicRule[] = [
  { tag: "Bitcoin", patterns: [/\bbitcoin\b/i, /\bbtc\b/i] },
  { tag: "NVIDIA", patterns: [/\bnvidia\b/i, /\bnvda\b/i] },
  {
    tag: "Federal Reserve",
    patterns: [/\bfederal reserve\b/i, /\bthe fed\b/i, /\bfomc\b/i, /\bfed\b/i],
  },
  { tag: "ECB", patterns: [/\becb\b/i, /\beuropean central bank\b/i] },
  {
    tag: "Interest Rates",
    patterns: [
      /\binterest rates?\b/i,
      /\brate cut\b/i,
      /\brate hike\b/i,
      /\brates\b/i,
    ],
  },
  { tag: "Inflation", patterns: [/\binflation\b/i, /\bcpi\b/i, /\bpce\b/i] },
  { tag: "Liquidity", patterns: [/\bliquidity\b/i] },
  { tag: "Gold", patterns: [/\bgold\b/i] },
  {
    tag: "AI",
    patterns: [/\bartificial intelligence\b/i, /\bai\b/i, /\bgenai\b/i],
  },
  {
    tag: "Crypto",
    patterns: [
      /\bcrypto\b/i,
      /\bdigital assets?\b/i,
      /\bethereum\b/i,
      /\beth\b/i,
      /\bsolana\b/i,
    ],
  },
  { tag: "ETFs", patterns: [/\betfs?\b/i] },
  { tag: "Earnings", patterns: [/\bearnings\b/i] },
  { tag: "Valuation", patterns: [/\bvaluation\b/i, /\bvaluations\b/i] },
  {
    tag: "Equities",
    patterns: [/\bequities\b/i, /\bstocks?\b/i, /\bequity market\b/i],
  },
  {
    tag: "Technology",
    patterns: [/\btechnology\b/i, /\btech sector\b/i, /\bsoftware\b/i],
  },
  { tag: "Macro", patterns: [/\bmacro\b/i, /\beconomy\b/i, /\beconomic\b/i] },
];

const MIN_TAGS = 2;
const MAX_TAGS = 4;

/**
 * Map a video title to 2–4 topic tags.
 * Avoids over-tagging; returns fewer than 2 only when the title has almost no signal.
 */
export function mapPerspectiveTopicTags(
  title: string,
  options?: { min?: number; max?: number },
): PerspectiveTopicTag[] {
  const min = options?.min ?? MIN_TAGS;
  const max = options?.max ?? MAX_TAGS;
  const text = title.trim();
  if (!text) return [];

  const matched: PerspectiveTopicTag[] = [];
  for (const rule of TOPIC_RULES) {
    if (matched.length >= max) break;
    if (rule.patterns.some((pattern) => pattern.test(text))) {
      if (!matched.includes(rule.tag)) {
        matched.push(rule.tag);
      }
    }
  }

  // Soft category-adjacent fill only when we have at least one strong match
  // and still sit under the preferred minimum — never invent unrelated themes.
  if (matched.length > 0 && matched.length < min) {
    if (
      matched.includes("Bitcoin") &&
      !matched.includes("Crypto") &&
      matched.length < min
    ) {
      matched.push("Crypto");
    }
    if (
      (matched.includes("AI") || matched.includes("NVIDIA")) &&
      !matched.includes("Technology") &&
      matched.length < min
    ) {
      matched.push("Technology");
    }
    if (
      (matched.includes("Federal Reserve") ||
        matched.includes("ECB") ||
        matched.includes("Interest Rates") ||
        matched.includes("Inflation")) &&
      !matched.includes("Macro") &&
      matched.length < min
    ) {
      matched.push("Macro");
    }
  }

  return matched.slice(0, max);
}
