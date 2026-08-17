/**
 * Personalize crypto market context for this user's sleeve.
 * Owned-coin materiality and high-confidence news outrank generic BTC commentary.
 */

import type { CryptoIntelligenceProfile } from "@/lib/services/cryptoIntelligence/buildCryptoIntelligenceProfile";
import type { CryptoMarketContext } from "@/lib/services/cryptoIntelligence/buildCryptoMarketContext";
import {
  selectCoinsThatMatterToday,
  selectDashboardCoinConclusion,
  type CoinIntelligence,
} from "@/lib/services/cryptoIntelligence/buildCoinIntelligence";

export type PersonalizedCryptoIntelligence = {
  /** Default “Your crypto today” line. */
  personalConclusion: string | null;
  /** Default market-structure line (expanded). */
  marketStructureLine: string | null;
  /** Default “What matters now” — max 2 high-confidence stories. */
  whatMatters: Array<{ id: string; text: string; href?: string | null }>;
  /** Single Dashboard / PI line when material and not redundant. */
  dashboardLine: string | null;
  quiet: boolean;
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatSignedPp(value: number): string {
  return value > 0 ? `+${round1(value)}` : `${round1(value)}`;
}

function btcShareLabel(profile: CryptoIntelligenceProfile): string | null {
  if (profile.bitcoinOfCryptoPercent == null) return null;
  if (profile.bitcoinOfCryptoPercent < 20) return null;
  return `${Math.round(profile.bitcoinOfCryptoPercent)}%`;
}

function collectHighConfidenceStories(
  coins: CoinIntelligence[],
): Array<{ id: string; text: string; href: string | null; score: number }> {
  const out: Array<{
    id: string;
    text: string;
    href: string | null;
    score: number;
  }> = [];
  const seen = new Set<string>();

  for (const coin of coins) {
    for (const story of coin.news) {
      if (story.confidence !== "strong" && story.confidence !== "likely") {
        continue;
      }
      if (seen.has(story.id)) continue;
      seen.add(story.id);
      out.push({
        id: `coin-news-${story.id}`,
        text: story.title,
        href: story.canonicalUrl,
        score:
          (story.confidence === "strong" ? 100 : 50) +
          coin.importanceScore,
      });
    }
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}

/**
 * Combine Phase 4A–4C into short copy with holdings-first priority.
 */
export function personalizeCryptoMarketIntelligence(
  profile: CryptoIntelligenceProfile,
  context: CryptoMarketContext,
  coins: CoinIntelligence[] | null = null,
): PersonalizedCryptoIntelligence {
  if (!profile.hasCrypto) {
    return {
      personalConclusion: null,
      marketStructureLine: null,
      whatMatters: [],
      dashboardLine: null,
      quiet: true,
    };
  }

  const whatMatters: Array<{ id: string; text: string; href?: string | null }> =
    [];
  let personalConclusion: string | null = null;

  const topCoins = coins ? selectCoinsThatMatterToday(coins, 2) : [];
  const topCoin = topCoins[0] ?? null;

  // 1) Material owned-coin development
  if (topCoin?.conclusion && topCoin.importanceScore >= 8) {
    personalConclusion = topCoin.conclusion;
  }

  const btcShare = btcShareLabel(profile);
  const leadership = context.leadership.summary;
  const contribution = profile.cryptoContributionPp;

  // 4–5) Broader market / BTC context only when no stronger owned-coin line
  if (!personalConclusion) {
    if (
      context.leadership.kind === "bitcoin_leading" &&
      btcShare &&
      profile.bitcoinOfCryptoPercent != null &&
      profile.bitcoinOfCryptoPercent >= 55
    ) {
      personalConclusion =
        context.leadership.scope === "market"
          ? `Bitcoin is leading today’s crypto move. That matters more to you because ${btcShare} of your crypto exposure is Bitcoin.`
          : `Bitcoin is holding up better in your sleeve, and that matters because ${btcShare} of your crypto exposure is Bitcoin.`;
    } else if (
      profile.portfolioShape === "alt_dominant" &&
      context.btc.direction !== "unavailable" &&
      context.other.direction === "down" &&
      (context.btc.direction === "up" || context.btc.direction === "flat")
    ) {
      personalConclusion =
        "Bitcoin is relatively stable, while your non-Bitcoin crypto exposure is weaker today.";
    } else if (
      (profile.portfolioShape === "btc_eth" ||
        (profile.bitcoinOfCryptoPercent != null &&
          profile.bitcoinOfCryptoPercent >= 20 &&
          profile.ethereumOfCryptoPercent != null &&
          profile.ethereumOfCryptoPercent >= 15)) &&
      context.leadership.summary?.includes("moving together")
    ) {
      personalConclusion =
        "Bitcoin and Ethereum are moving together today, supporting most of your crypto exposure.";
    } else if (
      contribution != null &&
      Math.abs(contribution) >= 0.15 &&
      profile.cryptoPortfolioWeightPercent < 95
    ) {
      personalConclusion = `Crypto is responsible for ${formatSignedPp(contribution)} percentage points of today’s total portfolio move.`;
    } else if (
      profile.cryptoDayDirection === "up" ||
      profile.cryptoDayDirection === "down" ||
      profile.cryptoDayDirection === "flat"
    ) {
      const dir =
        profile.cryptoDayDirection === "up"
          ? "higher"
          : profile.cryptoDayDirection === "down"
            ? "lower"
            : "little changed";
      personalConclusion =
        contribution != null && Math.abs(contribution) >= 0.05
          ? `Your crypto sleeve is ${dir} today (${formatSignedPp(contribution)}pp portfolio contribution).`
          : `Your crypto sleeve is ${dir} today.`;
    } else if (profile.conclusions[0]?.text) {
      personalConclusion = profile.conclusions[0].text;
    }
  }

  // 2) High-confidence owned-coin stories only — never pad with weak generics
  if (coins) {
    for (const story of collectHighConfidenceStories(coins).slice(0, 2)) {
      whatMatters.push({
        id: story.id,
        text: story.text,
        href: story.href,
      });
    }
  }

  const quiet =
    !personalConclusion &&
    topCoins.length === 0 &&
    whatMatters.length === 0 &&
    context.regime == null;

  if (quiet) {
    personalConclusion =
      "No material crypto developments stand out for your holdings right now.";
  }

  const coinDashboard = coins ? selectDashboardCoinConclusion(coins) : null;
  const dashboardLine = profile.hasMaterialCrypto
    ? (coinDashboard ??
      (topCoin && topCoin.importanceScore >= 12
        ? personalConclusion
        : null) ??
      null)
    : null;

  return {
    personalConclusion,
    marketStructureLine: leadership,
    whatMatters: whatMatters.slice(0, 2),
    dashboardLine,
    quiet,
  };
}
