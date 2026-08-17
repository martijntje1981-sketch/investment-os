/**
 * Phase 4C — Holdings-first coin intelligence (deterministic, existing data only).
 * Generic for any reliably identified crypto holding — no per-coin bespoke branches.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import { isCryptoIntelligenceHolding } from "@/lib/services/classification/cryptoInstrumentIdentity";
import {
  scoreCoinNewsAboutness,
  watchLabelForConfidence,
  type CoinNewsMatchBasis,
  type CoinNewsMatchConfidence,
} from "@/lib/services/cryptoIntelligence/scoreCoinNewsAboutness";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import type { NewsContentItem } from "@/lib/types/newsContent";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type { CoinNewsMatchBasis, CoinNewsMatchConfidence };

export type CoinPeriodReturn = {
  available: boolean;
  returnPercent: number | null;
  reason?: string;
};

export type CoinRelativeVerdict =
  | "outperforming"
  | "underperforming"
  | "in_line"
  | "unavailable";

export type CoinHoldingNews = {
  id: string;
  title: string;
  sourceName: string;
  canonicalUrl: string;
  publishedAt: string;
  matchBasis: CoinNewsMatchBasis;
  confidence: CoinNewsMatchConfidence;
  /** Trust-safe label — never implies causality. */
  watchLabel: string;
};

export type CryptoBenchmarkMoves = {
  change24hPercent: number | null;
  change1wPercent: number | null;
  change1mPercent: number | null;
};

export type CoinPeriodHistoryByHoldingId = Record<
  string,
  { weekPercent?: number | null; monthPercent?: number | null }
>;

export type BuildCoinIntelligenceInput = {
  holding: StoredPortfolioHolding;
  totalPortfolioValue: number;
  /** Optional verified period returns for this holding (never 24h substitutes). */
  periodReturns?: {
    weekPercent?: number | null;
    monthPercent?: number | null;
  };
  benchmarks?: {
    btc?: CryptoBenchmarkMoves | null;
    eth?: CryptoBenchmarkMoves | null;
  };
  newsItems?: NewsContentItem[] | null;
};

export type CoinIntelligence = {
  holdingId: string;
  symbol: string;
  name: string;
  providerSymbol: string | null;
  value: number;
  portfolioWeightPercent: number;
  change24hPercent: number | null;
  contributionPp: number | null;
  week: CoinPeriodReturn;
  month: CoinPeriodReturn;
  vsBtc: {
    day: CoinRelativeVerdict;
    week: CoinRelativeVerdict;
    month: CoinRelativeVerdict;
    summary: string | null;
  };
  vsEth: {
    day: CoinRelativeVerdict;
    week: CoinRelativeVerdict;
    month: CoinRelativeVerdict;
    summary: string | null;
  };
  news: CoinHoldingNews[];
  /** Expanded detail may include weaker mentions (labelled). */
  detailNews: CoinHoldingNews[];
  /** Compact default-row headline. */
  headline: string | null;
  /** Longer personalized conclusion when this coin is material. */
  conclusion: string | null;
  /** Ranking score — higher = more important to this user today. */
  importanceScore: number;
  dataCoverage: {
    has24h: boolean;
    hasWeek: boolean;
    hasMonth: boolean;
    hasBtcBenchmark: boolean;
    hasEthBenchmark: boolean;
    newsMatchCount: number;
  };
};

const DAY_REL_THRESHOLD = 0.8;
const WEEK_REL_THRESHOLD = 1.5;
const MONTH_REL_THRESHOLD = 3;

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatSignedPct(value: number): string {
  return `${value > 0 ? "+" : ""}${round1(value)}%`;
}

function formatSignedPp(value: number): string {
  return value > 0 ? `+${round1(value)}` : `${round1(value)}`;
}

function resolveChange24hPercent(
  holding: StoredPortfolioHolding,
): number | null {
  if (isCryptoHolding(holding)) {
    if (
      typeof holding.change24hPercent === "number" &&
      Number.isFinite(holding.change24hPercent)
    ) {
      return holding.change24hPercent;
    }
  }
  if (
    typeof holding.changePercent === "number" &&
    Number.isFinite(holding.changePercent)
  ) {
    return holding.changePercent;
  }
  return null;
}

function resolveDayMoveAmount(holding: StoredPortfolioHolding): number | null {
  if (isCryptoHolding(holding)) {
    if (
      typeof holding.change24hAmount === "number" &&
      Number.isFinite(holding.change24hAmount)
    ) {
      return holding.change24hAmount;
    }
  }
  const value = getHoldingMarketValue(holding);
  const pct = resolveChange24hPercent(holding);
  if (
    value == null ||
    value <= 0 ||
    pct == null ||
    !Number.isFinite(pct)
  ) {
    return null;
  }
  return (value * pct) / 100;
}

function relativeVerdict(
  coinPct: number | null,
  benchmarkPct: number | null,
  threshold: number,
): CoinRelativeVerdict {
  if (
    coinPct == null ||
    benchmarkPct == null ||
    !Number.isFinite(coinPct) ||
    !Number.isFinite(benchmarkPct)
  ) {
    return "unavailable";
  }
  const delta = coinPct - benchmarkPct;
  if (Math.abs(delta) < threshold) return "in_line";
  return delta > 0 ? "outperforming" : "underperforming";
}

function relativeSummary(
  symbol: string,
  vsBtc: CoinRelativeVerdict,
  vsEth: CoinRelativeVerdict,
  periodLabel: "today" | "this week" | "this month",
): string | null {
  if (vsBtc === "unavailable" && vsEth === "unavailable") return null;

  if (
    vsBtc === "underperforming" &&
    (vsEth === "underperforming" || vsEth === "unavailable")
  ) {
    return vsEth === "underperforming"
      ? `${symbol} is weaker than both BTC and ETH ${periodLabel}.`
      : `${symbol} is weaker than Bitcoin ${periodLabel}.`;
  }
  if (
    vsBtc === "outperforming" &&
    (vsEth === "outperforming" || vsEth === "unavailable")
  ) {
    return vsEth === "outperforming"
      ? `${symbol} is outperforming both BTC and ETH ${periodLabel}.`
      : `${symbol} is outperforming Bitcoin ${periodLabel}.`;
  }
  if (vsEth === "outperforming" && vsBtc === "unavailable") {
    return `${symbol} is outperforming Ethereum ${periodLabel}.`;
  }
  if (vsEth === "underperforming" && vsBtc === "unavailable") {
    return `${symbol} is weaker than Ethereum ${periodLabel}.`;
  }
  if (vsBtc === "in_line" && (vsEth === "in_line" || vsEth === "unavailable")) {
    return vsEth === "in_line"
      ? `${symbol} is moving broadly in line with BTC and ETH ${periodLabel}.`
      : `${symbol} is moving broadly in line with Bitcoin ${periodLabel}.`;
  }
  if (vsEth === "in_line" && vsBtc === "unavailable") {
    return `${symbol} is moving broadly in line with Ethereum ${periodLabel}.`;
  }
  if (vsBtc === "outperforming") {
    return `${symbol} is outperforming Bitcoin ${periodLabel}.`;
  }
  if (vsBtc === "underperforming") {
    return `${symbol} is weaker than Bitcoin ${periodLabel}.`;
  }
  return null;
}

function periodReturn(
  value: number | null | undefined,
  missingReason: string,
): CoinPeriodReturn {
  if (typeof value === "number" && Number.isFinite(value)) {
    return { available: true, returnPercent: value };
  }
  return { available: false, returnPercent: null, reason: missingReason };
}

function selectCoinNews(
  holding: StoredPortfolioHolding,
  items: NewsContentItem[],
  options?: { limit?: number; includeWeak?: boolean },
): CoinHoldingNews[] {
  const limit = options?.limit ?? 2;
  const includeWeak = options?.includeWeak ?? false;
  const ranked: Array<CoinHoldingNews & { score: number }> = [];

  for (const item of items) {
    const aboutness = scoreCoinNewsAboutness(item, holding);
    if (!aboutness) continue;
    if (!includeWeak && !aboutness.defaultEligible) continue;

    ranked.push({
      id: item.id,
      title: item.title.trim(),
      sourceName: item.sourceName,
      canonicalUrl: item.canonicalUrl,
      publishedAt: item.publishedAt,
      matchBasis: aboutness.basis,
      confidence: aboutness.confidence,
      watchLabel: watchLabelForConfidence(
        aboutness.confidence,
        holding.symbol.trim().toUpperCase(),
      ),
      score: aboutness.score,
    });
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, limit).map((row) => ({
    id: row.id,
    title: row.title,
    sourceName: row.sourceName,
    canonicalUrl: row.canonicalUrl,
    publishedAt: row.publishedAt,
    matchBasis: row.matchBasis,
    confidence: row.confidence,
    watchLabel: row.watchLabel,
  }));
}

function buildHeadline(coin: {
  symbol: string;
  change24hPercent: number | null;
  contributionPp: number | null;
  vsSummary: string | null;
}): string | null {
  if (
    coin.contributionPp != null &&
    Math.abs(coin.contributionPp) >= 0.15 &&
    coin.change24hPercent != null
  ) {
    if (coin.contributionPp > 0) {
      return "Driving today’s crypto gain";
    }
    return "Weighing on today’s crypto move";
  }
  if (coin.vsSummary) {
    if (/weaker/i.test(coin.vsSummary)) return "Lagging BTC and ETH";
    if (/outperforming/i.test(coin.vsSummary)) return "Outperforming majors";
    if (/in line/i.test(coin.vsSummary)) return "In line with majors";
  }
  if (coin.change24hPercent != null && Math.abs(coin.change24hPercent) >= 2) {
    return coin.change24hPercent > 0 ? "Notable move today" : "Notable decline today";
  }
  return null;
}

function buildConclusion(coin: {
  symbol: string;
  change24hPercent: number | null;
  contributionPp: number | null;
  vsSummary: string | null;
  newsTitle: string | null;
}): string | null {
  const parts: string[] = [];
  if (
    coin.change24hPercent != null &&
    coin.contributionPp != null &&
    Math.abs(coin.contributionPp) >= 0.1
  ) {
    parts.push(
      `${coin.symbol} is ${formatSignedPct(coin.change24hPercent)} today and contributed ${formatSignedPp(coin.contributionPp)} percentage points to your portfolio.`,
    );
  } else if (coin.change24hPercent != null) {
    parts.push(`${coin.symbol} is ${formatSignedPct(coin.change24hPercent)} today.`);
  } else if (coin.contributionPp != null && Math.abs(coin.contributionPp) >= 0.1) {
    parts.push(
      `${coin.symbol} contributed ${formatSignedPp(coin.contributionPp)} percentage points to your portfolio today.`,
    );
  }

  if (coin.vsSummary && parts.length > 0) {
    // Prefer day relative already woven; avoid duplicate if vsSummary is day-scoped
  } else if (coin.vsSummary) {
    parts.push(coin.vsSummary);
  }

  if (coin.newsTitle && parts.length > 0) {
    parts.push(
      `A high-confidence story worth watching is “${coin.newsTitle}”.`,
    );
  }

  return parts[0] ?? null;
}

function importanceScore(input: {
  contributionPp: number | null;
  change24hPercent: number | null;
  portfolioWeightPercent: number;
  vsDayBtc: CoinRelativeVerdict;
  vsDayEth: CoinRelativeVerdict;
  strongNewsCount: number;
  likelyNewsCount: number;
}): number {
  let score = 0;
  if (input.contributionPp != null) {
    score += Math.abs(input.contributionPp) * 100;
  }
  const unusual =
    input.change24hPercent != null &&
    Math.abs(input.change24hPercent) >= 3 &&
    input.portfolioWeightPercent >= 1;
  if (unusual) score += Math.abs(input.change24hPercent!) * 2;
  if (
    input.vsDayBtc === "outperforming" ||
    input.vsDayBtc === "underperforming" ||
    input.vsDayEth === "outperforming" ||
    input.vsDayEth === "underperforming"
  ) {
    score += 8;
  }
  score += input.strongNewsCount * 14;
  score += input.likelyNewsCount * 6;
  // Tiny holdings with huge % moves stay low unless contribution is material
  if (
    input.portfolioWeightPercent < 0.5 &&
    (input.contributionPp == null || Math.abs(input.contributionPp) < 0.05)
  ) {
    score *= 0.25;
  }
  return score;
}

/**
 * Build intelligence for one owned crypto holding from verified inputs only.
 */
export function buildCoinIntelligence(
  input: BuildCoinIntelligenceInput,
): CoinIntelligence | null {
  const { holding } = input;
  if (!isCryptoIntelligenceHolding(holding)) return null;

  const value = getHoldingMarketValue(holding) ?? 0;
  if (value <= 0) return null;

  const total = input.totalPortfolioValue;
  const portfolioWeightPercent = total > 0 ? (value / total) * 100 : 0;
  const change24hPercent = resolveChange24hPercent(holding);
  const dayMove = resolveDayMoveAmount(holding);
  const previousPortfolioValue =
    total > 0 && dayMove != null ? total - dayMove : null;
  const contributionPp =
    previousPortfolioValue != null &&
    previousPortfolioValue > 0 &&
    dayMove != null
      ? (dayMove / previousPortfolioValue) * 100
      : null;

  const week = periodReturn(
    input.periodReturns?.weekPercent,
    "Verified 1W history is not available for this coin.",
  );
  const month = periodReturn(
    input.periodReturns?.monthPercent,
    "Verified 1M history is not available for this coin.",
  );

  const btc = input.benchmarks?.btc ?? null;
  const eth = input.benchmarks?.eth ?? null;

  const vsBtcDay = relativeVerdict(
    change24hPercent,
    btc?.change24hPercent ?? null,
    DAY_REL_THRESHOLD,
  );
  const vsEthDay = relativeVerdict(
    change24hPercent,
    eth?.change24hPercent ?? null,
    DAY_REL_THRESHOLD,
  );
  const vsBtcWeek = relativeVerdict(
    week.returnPercent,
    btc?.change1wPercent ?? null,
    WEEK_REL_THRESHOLD,
  );
  const vsEthWeek = relativeVerdict(
    week.returnPercent,
    eth?.change1wPercent ?? null,
    WEEK_REL_THRESHOLD,
  );
  const vsBtcMonth = relativeVerdict(
    month.returnPercent,
    btc?.change1mPercent ?? null,
    MONTH_REL_THRESHOLD,
  );
  const vsEthMonth = relativeVerdict(
    month.returnPercent,
    eth?.change1mPercent ?? null,
    MONTH_REL_THRESHOLD,
  );

  const daySummary = relativeSummary(
    holding.symbol,
    vsBtcDay,
    vsEthDay,
    "today",
  );
  const weekSummary = relativeSummary(
    holding.symbol,
    vsBtcWeek,
    vsEthWeek,
    "this week",
  );
  const monthSummary = relativeSummary(
    holding.symbol,
    vsBtcMonth,
    vsEthMonth,
    "this month",
  );
  const vsSummary = daySummary ?? weekSummary ?? monthSummary;

  const news = selectCoinNews(holding, input.newsItems ?? [], {
    limit: 2,
    includeWeak: false,
  });
  const expandedNews = selectCoinNews(holding, input.newsItems ?? [], {
    limit: 4,
    includeWeak: true,
  });
  const score = importanceScore({
    contributionPp,
    change24hPercent,
    portfolioWeightPercent,
    vsDayBtc: vsBtcDay,
    vsDayEth: vsEthDay,
    strongNewsCount: news.filter((row) => row.confidence === "strong").length,
    likelyNewsCount: news.filter((row) => row.confidence === "likely").length,
  });

  const base = {
    holdingId: holding.id,
    symbol: holding.symbol,
    name: holding.name,
    providerSymbol: holding.providerSymbol ?? null,
    value,
    portfolioWeightPercent,
    change24hPercent,
    contributionPp,
    week,
    month,
    vsBtc: {
      day: vsBtcDay,
      week: vsBtcWeek,
      month: vsBtcMonth,
      summary: relativeSummary(holding.symbol, vsBtcDay, "unavailable", "today") ??
        relativeSummary(holding.symbol, vsBtcWeek, "unavailable", "this week") ??
        relativeSummary(holding.symbol, vsBtcMonth, "unavailable", "this month"),
    },
    vsEth: {
      day: vsEthDay,
      week: vsEthWeek,
      month: vsEthMonth,
      summary:
        relativeSummary(holding.symbol, "unavailable", vsEthDay, "today") ??
        relativeSummary(holding.symbol, "unavailable", vsEthWeek, "this week") ??
        relativeSummary(holding.symbol, "unavailable", vsEthMonth, "this month"),
    },
    news,
    detailNews: expandedNews,
    dataCoverage: {
      has24h: change24hPercent != null,
      hasWeek: week.available,
      hasMonth: month.available,
      hasBtcBenchmark: Boolean(
        btc &&
          (btc.change24hPercent != null ||
            btc.change1wPercent != null ||
            btc.change1mPercent != null),
      ),
      hasEthBenchmark: Boolean(
        eth &&
          (eth.change24hPercent != null ||
            eth.change1wPercent != null ||
            eth.change1mPercent != null),
      ),
      newsMatchCount: news.length,
    },
  };

  const strongNewsTitle =
    news.find((row) => row.confidence === "strong")?.title ?? null;

  return {
    ...base,
    headline: buildHeadline({
      symbol: holding.symbol,
      change24hPercent,
      contributionPp,
      vsSummary,
    }),
    conclusion: buildConclusion({
      symbol: holding.symbol,
      change24hPercent,
      contributionPp,
      vsSummary,
      newsTitle: strongNewsTitle,
    }),
    importanceScore: score,
  };
}

export type BuildOwnedCoinIntelligenceInput = {
  holdings: StoredPortfolioHolding[];
  periodHistoryByHoldingId?: CoinPeriodHistoryByHoldingId | null;
  benchmarks?: {
    btc?: CryptoBenchmarkMoves | null;
    eth?: CryptoBenchmarkMoves | null;
  };
  newsItems?: NewsContentItem[] | null;
};

/**
 * Build ranked coin intelligence for all owned crypto holdings.
 */
export function buildOwnedCoinIntelligence(
  input: BuildOwnedCoinIntelligenceInput,
): CoinIntelligence[] {
  let totalPortfolioValue = 0;
  for (const holding of input.holdings) {
    const value = getHoldingMarketValue(holding) ?? 0;
    if (value > 0) totalPortfolioValue += value;
  }

  const coins: CoinIntelligence[] = [];
  for (const holding of input.holdings) {
    if (!isCryptoIntelligenceHolding(holding)) continue;
    const periods = input.periodHistoryByHoldingId?.[holding.id];
    const coin = buildCoinIntelligence({
      holding,
      totalPortfolioValue,
      periodReturns: {
        weekPercent: periods?.weekPercent ?? null,
        monthPercent: periods?.monthPercent ?? null,
      },
      benchmarks: input.benchmarks,
      newsItems: input.newsItems,
    });
    if (coin) coins.push(coin);
  }

  coins.sort((a, b) => b.importanceScore - a.importanceScore);
  return coins;
}

/**
 * Default UI: up to 2 coins that materially matter today.
 */
export function selectCoinsThatMatterToday(
  coins: CoinIntelligence[],
  limit = 2,
): CoinIntelligence[] {
  return coins
    .filter((coin) => {
      if (coin.importanceScore < 3) return false;
      if (coin.contributionPp != null && Math.abs(coin.contributionPp) >= 0.05) {
        return true;
      }
      if (
        coin.portfolioWeightPercent >= 2 &&
        coin.change24hPercent != null &&
        Math.abs(coin.change24hPercent) >= 1.5
      ) {
        return true;
      }
      if (
        coin.vsBtc.day === "outperforming" ||
        coin.vsBtc.day === "underperforming" ||
        coin.vsEth.day === "outperforming" ||
        coin.vsEth.day === "underperforming"
      ) {
        return coin.portfolioWeightPercent >= 1;
      }
      return false;
    })
    .slice(0, limit);
}

/** One Dashboard/PI coin line when it outranks generic crypto context. */
export function selectDashboardCoinConclusion(
  coins: CoinIntelligence[],
): string | null {
  const top = selectCoinsThatMatterToday(coins, 1)[0];
  if (!top) return null;
  if (top.contributionPp != null && Math.abs(top.contributionPp) >= 0.15) {
    return `${top.symbol} drove ${formatSignedPp(top.contributionPp)}pp of today’s portfolio move.`;
  }
  if (top.conclusion && top.importanceScore >= 12) {
    return top.conclusion;
  }
  return null;
}

export function cryptoBenchmarksFromMajors(
  majors: Array<{
    id: string;
    symbol: string;
    name: string;
    changePercent: number | null;
    change7dPercent?: number | null;
    chartPeriodChangePercent?: number | null;
    chartPeriod?: string | null;
  }>,
): { btc: CryptoBenchmarkMoves | null; eth: CryptoBenchmarkMoves | null } {
  const btcRow = majors.find(
    (row) =>
      row.id === "bitcoin" ||
      row.symbol.toUpperCase() === "BTC" ||
      /bitcoin/i.test(row.name),
  );
  const ethRow = majors.find(
    (row) =>
      row.id === "ethereum" ||
      row.symbol.toUpperCase() === "ETH" ||
      /ethereum/i.test(row.name),
  );

  const toMoves = (
    row:
      | {
          changePercent: number | null;
          change7dPercent?: number | null;
          chartPeriodChangePercent?: number | null;
          chartPeriod?: string | null;
        }
      | undefined,
  ): CryptoBenchmarkMoves | null => {
    if (!row) return null;
    return {
      change24hPercent: row.changePercent,
      change1wPercent: row.change7dPercent ?? null,
      change1mPercent:
        row.chartPeriod === "1M" ? (row.chartPeriodChangePercent ?? null) : null,
    };
  };

  return { btc: toMoves(btcRow), eth: toMoves(ethRow) };
}
