/**
 * Personalize crypto market context for this user's sleeve.
 * Deep analysis underneath → short conclusions on top.
 * Owned-coin intelligence outranks generic Bitcoin commentary when material.
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
  /** Default market-structure line. */
  marketStructureLine: string | null;
  /** Default “What matters now” — max 2 (legacy / supporting). */
  whatMatters: Array<{ id: string; text: string }>;
  /** Single Dashboard / PI line when material and not redundant. */
  dashboardLine: string | null;
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

/**
 * Combine Phase 4A profile with Phase 4B market context (+ optional 4C coins).
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
    };
  }

  const whatMatters: Array<{ id: string; text: string }> = [];
  let personalConclusion: string | null = null;

  const topCoins = coins ? selectCoinsThatMatterToday(coins, 2) : [];
  const topCoin = topCoins[0] ?? null;

  if (topCoin?.conclusion && topCoin.importanceScore >= 8) {
    personalConclusion = topCoin.conclusion;
  }

  const btcShare = btcShareLabel(profile);
  const leadership = context.leadership.summary;
  const contribution = profile.cryptoContributionPp;

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

  const marketStructureLine = leadership;

  if (context.regime && context.moveMagnitude === "stressed") {
    whatMatters.push({
      id: "regime-stress",
      text: "Move size is elevated — treat today’s crypto reading as high-volatility context.",
    });
  }

  if (
    contribution != null &&
    Math.abs(contribution) >= 0.2 &&
    personalConclusion &&
    !personalConclusion.includes("percentage points") &&
    !personalConclusion.includes("pp")
  ) {
    whatMatters.push({
      id: "contribution",
      text: `Crypto contributed ${formatSignedPp(contribution)}pp to your portfolio today.`,
    });
  }

  for (const story of context.news.slice(0, 2)) {
    if (whatMatters.length >= 2) break;
    whatMatters.push({
      id: `news-${story.id}`,
      text: story.title,
    });
  }

  const coinDashboard = coins ? selectDashboardCoinConclusion(coins) : null;
  const dashboardLine = profile.hasMaterialCrypto
    ? (coinDashboard ??
      personalConclusion ??
      marketStructureLine ??
      profile.conclusions[0]?.text ??
      null)
    : null;

  return {
    personalConclusion,
    marketStructureLine,
    whatMatters: whatMatters.slice(0, 2),
    dashboardLine,
  };
}
