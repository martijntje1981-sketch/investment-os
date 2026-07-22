/** Tiered source-quality weights for ranking and deduplication tie-breaks. */

export const PREMIUM_SOURCE_QUALITY: Record<string, number> = {
  Reuters: 40,
  Bloomberg: 38,
  "Bloomberg Television": 35,
  "Bloomberg Originals": 34,
  CNBC: 32,
  "CNBC Television": 32,
  "Financial Times": 34,
  "Wall Street Journal": 34,
  WSJ: 34,
  AP: 30,
  "Associated Press": 30,
  CoinDesk: 26,
  Cointelegraph: 24,
  "EODHD News": 28,
  "Coin Bureau": 18,
};

export const TRUSTED_VIDEO_CHANNELS = new Set([
  "Bloomberg Television",
  "CNBC Television",
  "Coin Bureau",
  "Bloomberg Originals",
]);

export const LOW_QUALITY_SOURCE_PATTERN =
  /\b(blog|mirror|copy|republish|spam|clickbait)\b/i;

export function getSourceQualityScore(sourceName: string): number {
  if (PREMIUM_SOURCE_QUALITY[sourceName]) {
    return PREMIUM_SOURCE_QUALITY[sourceName];
  }

  const normalized = sourceName.toLowerCase();
  for (const [name, score] of Object.entries(PREMIUM_SOURCE_QUALITY)) {
    if (normalized.includes(name.toLowerCase())) {
      return score;
    }
  }

  return 8;
}

export function isTrustedVideoSource(sourceName: string): boolean {
  return TRUSTED_VIDEO_CHANNELS.has(sourceName);
}
