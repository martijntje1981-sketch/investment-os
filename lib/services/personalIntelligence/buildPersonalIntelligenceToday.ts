/**
 * Phase 1A — compose existing daily performance, news intelligence, weights,
 * exposure and goals into one PersonalIntelligenceToday result.
 *
 * Does not fetch, does not call AI, does not duplicate pricing or news ranking.
 */

import type { DailyPerformanceSnapshot } from "@/lib/client/dailyPerformance";
import { ATTRIBUTION_MATERIAL_MIN_PP } from "@/lib/services/personalIntelligence/attribution";
import {
  buildDayContributions,
  previousPortfolioValueFromPerformers,
  rankContributionsByMateriality,
} from "@/lib/services/personalIntelligence/contribution";
import {
  buildCryptoIntelligenceProfile,
  buildCryptoMarketContext,
  selectDashboardCryptoConclusion,
} from "@/lib/services/cryptoIntelligence";
import type {
  BuildPersonalIntelligenceTodayInput,
  PersonalAttentionState,
  PersonalIntelligenceItem,
  PersonalIntelligenceToday,
} from "@/lib/services/personalIntelligence/types";

const TOP_N = 3;
const MATERIAL_PP = ATTRIBUTION_MATERIAL_MIN_PP;

function resolveAttention(input: {
  quietMarket: boolean | null;
  portfolioStatus: string | null;
  hasMaterialContributor: boolean;
  hasMustWatch: boolean;
}): PersonalAttentionState {
  if (input.portfolioStatus === "High Attention") {
    return "elevated";
  }
  if (input.portfolioStatus === "Elevated" || input.hasMustWatch) {
    return "elevated";
  }
  if (
    input.portfolioStatus === "Watching" ||
    input.hasMaterialContributor
  ) {
    return "watch";
  }
  if (input.quietMarket === true && !input.hasMaterialContributor) {
    return "nothing_requires_attention";
  }
  if (input.quietMarket === null && !input.hasMaterialContributor && !input.hasMustWatch) {
    return "nothing_requires_attention";
  }
  return input.hasMaterialContributor ? "watch" : "nothing_requires_attention";
}

function formatSignedPp(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  const sign = rounded > 0 ? "+" : "";
  return `${sign}${rounded.toFixed(1)}pp`;
}

function formatSignedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function buildHeadline(input: {
  attention: PersonalAttentionState;
  daily: DailyPerformanceSnapshot | null;
  quietMarket: boolean | null;
}): string {
  if (input.attention === "nothing_requires_attention") {
    return "Nothing requires your attention today.";
  }
  if (input.daily?.hasDailyData) {
    return `Portfolio ${formatSignedPercent(input.daily.todayPercent)} today.`;
  }
  if (input.quietMarket) {
    return "Nothing requires your attention today.";
  }
  return "Review available portfolio and market context.";
}

function buildAttentionItems(input: {
  topContributors: PersonalIntelligenceToday["topContributors"];
  topDetractors: PersonalIntelligenceToday["topDetractors"];
  intelligence: BuildPersonalIntelligenceTodayInput["intelligence"];
  goals: BuildPersonalIntelligenceTodayInput["goals"];
  daily: DailyPerformanceSnapshot | null;
  holdings?: BuildPersonalIntelligenceTodayInput["holdings"];
}): PersonalIntelligenceItem[] {
  const items: PersonalIntelligenceItem[] = [];

  for (const row of input.topContributors.slice(0, 2)) {
    if (row.contributionPp == null || Math.abs(row.contributionPp) < MATERIAL_PP) {
      continue;
    }
    items.push({
      id: `contributor-${row.symbol}`,
      kind: "contributor",
      label: `${row.name} contributed ${formatSignedPp(row.contributionPp)}`,
      detail:
        row.weightPercent != null
          ? `About ${Math.round(row.weightPercent)}% of the portfolio`
          : null,
      whyItMatters: "Largest positive contribution to today’s portfolio move.",
      portfolioWeightPercent: row.weightPercent,
      materiality: Math.abs(row.contributionPp) >= 0.5 ? "high" : "medium",
      source: "derived",
    });
  }

  for (const row of input.topDetractors.slice(0, 2)) {
    if (row.contributionPp == null || Math.abs(row.contributionPp) < MATERIAL_PP) {
      continue;
    }
    if (items.some((item) => item.id === `contributor-${row.symbol}`)) {
      continue;
    }
    items.push({
      id: `detractor-${row.symbol}`,
      kind: "contributor",
      label: `${row.name} weighed ${formatSignedPp(row.contributionPp)}`,
      detail:
        row.weightPercent != null
          ? `About ${Math.round(row.weightPercent)}% of the portfolio`
          : null,
      whyItMatters: "Largest drag on today’s portfolio move.",
      portfolioWeightPercent: row.weightPercent,
      materiality: Math.abs(row.contributionPp) >= 0.5 ? "high" : "medium",
      source: "derived",
    });
  }

  const mustWatch = input.intelligence?.mustWatch;
  if (mustWatch && !input.intelligence?.quietMarket) {
    const linked = [
      ...(input.intelligence?.holdingInsights.negative ?? []),
      ...(input.intelligence?.holdingInsights.positive ?? []),
    ].slice(0, 3);
    items.push({
      id: "must-watch",
      kind: "news",
      label: mustWatch.title,
      detail: mustWatch.reason,
      whyItMatters:
        linked.length > 0
          ? `Linked to holdings such as ${linked.join(", ")}.`
          : "Flagged as relevant to your holdings.",
      materiality:
        input.intelligence?.portfolioStatus === "High Attention"
          ? "high"
          : "medium",
      source: "news",
    });
  }

  if (
    input.goals?.hasGoal &&
    (input.goals.status === "Behind schedule" ||
      input.goals.status === "Slightly behind")
  ) {
    items.push({
      id: "goal-status",
      kind: "goal",
      label: `Goal status: ${input.goals.status}`,
      detail:
        input.goals.currentProgressPercent != null
          ? `${Math.round(input.goals.currentProgressPercent)}% of target`
          : null,
      whyItMatters:
        "Estimate from your inputs and available history — not a guarantee.",
      materiality:
        input.goals.status === "Behind schedule" ? "high" : "medium",
      source: "goals",
    });
  }

  if (
    input.daily &&
    input.daily.hasDailyData &&
    !input.daily.performanceCoverageComplete
  ) {
    items.push({
      id: "coverage",
      kind: "coverage",
      label: "Daily move uses partial holding coverage",
      detail: `${input.daily.validPerformanceCount} of ${input.daily.eligibleMarketHoldingCount} market holdings`,
      materiality: "low",
      source: "portfolio",
    });
  }

  const cryptoHoldings =
    input.holdings && input.holdings.length > 0
      ? input.holdings
      : (input.daily?.performers.map((row) => row.holding) ?? []);
  if (cryptoHoldings.length > 0 && items.length < 4) {
    const cryptoProfile = buildCryptoIntelligenceProfile(cryptoHoldings);
    const cryptoContext = buildCryptoMarketContext({
      profile: cryptoProfile,
      holdings: cryptoHoldings,
    });
    const cryptoLine = selectDashboardCryptoConclusion(
      cryptoProfile,
      cryptoContext,
    );
    if (
      cryptoLine &&
      !items.some((item) =>
        /bitcoin|crypto exposure|crypto sleeve|crypto move|crypto is responsible/i.test(
          item.label,
        ),
      )
    ) {
      items.push({
        id: "crypto-structure",
        kind: "exposure",
        label: cryptoLine,
        detail:
          cryptoProfile.cryptoPortfolioWeightPercent >= 5
            ? `Crypto ≈ ${Math.round(cryptoProfile.cryptoPortfolioWeightPercent)}% of portfolio`
            : null,
        whyItMatters: "Describes your crypto sleeve — not a recommendation.",
        portfolioWeightPercent: cryptoProfile.cryptoPortfolioWeightPercent,
        materiality:
          cryptoProfile.cryptoPortfolioWeightPercent >= 25 ? "medium" : "low",
        source: "derived",
      });
    }
  }

  return items;
}

/**
 * Build today's personal intelligence from already-computed portfolio/news inputs.
 */
export function buildPersonalIntelligenceToday(
  input: BuildPersonalIntelligenceTodayInput,
): PersonalIntelligenceToday {
  const generatedAt = (input.now ?? new Date()).toISOString();
  const daily = input.daily;
  const weightMap = new Map<string, number>();
  for (const row of input.holdingsWeights ?? []) {
    weightMap.set(row.symbol.trim().toUpperCase(), row.weightPercent);
  }

  const contributions =
    daily && daily.performers.length > 0
      ? rankContributionsByMateriality(
          buildDayContributions(daily.performers, weightMap),
        )
      : [];

  const topContributors = contributions
    .filter((row) => row.move > 0 || (row.contributionPp ?? 0) > 0)
    .slice(0, TOP_N);
  const topDetractors = contributions
    .filter((row) => row.move < 0 || (row.contributionPp ?? 0) < 0)
    .slice(0, TOP_N);

  const hasMaterialContributor = contributions.some(
    (row) =>
      row.contributionPp != null && Math.abs(row.contributionPp) >= MATERIAL_PP,
  );

  const quietMarket = input.intelligence?.quietMarket ?? null;
  const portfolioStatus = input.intelligence?.portfolioStatus ?? null;

  const attention = resolveAttention({
    quietMarket,
    portfolioStatus,
    hasMaterialContributor,
    hasMustWatch: Boolean(
      input.intelligence?.mustWatch && !input.intelligence.quietMarket,
    ),
  });

  const attentionItems =
    attention === "nothing_requires_attention"
      ? []
      : buildAttentionItems({
          topContributors,
          topDetractors,
          intelligence: input.intelligence,
          goals: input.goals,
          daily,
          holdings: input.holdings,
        });

  const dataNotes: string[] = [];
  if (daily && daily.hasDailyData && !daily.performanceCoverageComplete) {
    dataNotes.push(
      "Portfolio day move is based on holdings with usable prices only.",
    );
  }
  if (!daily?.hasDailyData) {
    dataNotes.push("Daily portfolio performance data is not available.");
  }
  if (!input.intelligence) {
    dataNotes.push("Portfolio news intelligence was not provided.");
  }

  const previousPortfolioValue = daily
    ? previousPortfolioValueFromPerformers(daily.performers)
    : null;

  return {
    generatedAt,
    version: "pi-today-v1",
    attention,
    headline: buildHeadline({ attention, daily, quietMarket }),
    portfolioMove: daily
      ? {
          todayChange: daily.todayChange,
          todayPercent: daily.todayPercent,
          hasDailyData: daily.hasDailyData,
          coverageComplete: daily.performanceCoverageComplete,
          validPerformanceCount: daily.validPerformanceCount,
          eligibleMarketHoldingCount: daily.eligibleMarketHoldingCount,
          previousPortfolioValue,
        }
      : null,
    topContributors,
    topDetractors,
    holdingsWeights: input.holdingsWeights ?? [],
    exposure: input.exposure ?? null,
    news: input.intelligence
      ? {
          quietMarket: input.intelligence.quietMarket,
          portfolioStatus: input.intelligence.portfolioStatus,
          mustWatch: input.intelligence.mustWatch,
          holdingInsights: input.intelligence.holdingInsights,
          portfolioSummary: input.intelligence.portfolioSummary,
        }
      : null,
    goals: input.goals ?? null,
    attentionItems,
    dataNotes,
  };
}
