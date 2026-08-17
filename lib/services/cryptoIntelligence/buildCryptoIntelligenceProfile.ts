/**
 * Phase 4A/4B — Crypto Intelligence profile (deterministic, existing data only).
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  isBitcoinHolding,
  isCryptoIntelligenceHolding,
  isEthereumHolding,
} from "@/lib/services/classification/cryptoInstrumentIdentity";
import type { CryptoMarketContext } from "@/lib/services/cryptoIntelligence/buildCryptoMarketContext";
import { personalizeCryptoMarketIntelligence } from "@/lib/services/cryptoIntelligence/personalizeCryptoMarketIntelligence";
import { isCryptoHolding } from "@/lib/services/portfolio/cryptoHolding";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type CryptoPortfolioShape =
  | "none"
  | "bitcoin_only"
  | "bitcoin_dominant"
  | "btc_eth"
  | "diversified_crypto"
  | "alt_dominant"
  | "mixed_portfolio_with_crypto";

export type CryptoPulseBand = "up" | "down" | "flat" | "unavailable";

export type CryptoIntelligenceConclusion = {
  id: string;
  text: string;
};

export type CryptoPulsePeriodUnavailable = {
  available: false;
  reason: string;
};

export type CryptoPulsePeriodAvailable = {
  available: true;
  direction: CryptoPulseBand;
  returnPercent: number;
  coveredHoldingCount?: number;
  skippedHoldingCount?: number;
};

export type CryptoPulsePeriod =
  | CryptoPulsePeriodUnavailable
  | CryptoPulsePeriodAvailable;

export type CryptoPeriodHistoryOptions = {
  weekReturnPercent?: number | null;
  weekAvailable?: boolean;
  weekReason?: string;
  weekCoveredHoldingCount?: number;
  weekSkippedHoldingCount?: number;
  monthReturnPercent?: number | null;
  monthAvailable?: boolean;
  monthReason?: string;
  monthCoveredHoldingCount?: number;
  monthSkippedHoldingCount?: number;
};

export type CryptoIntelligenceProfile = {
  hasCrypto: boolean;
  /** True when crypto sleeve is at least ~5% of portfolio or is the whole book. */
  hasMaterialCrypto: boolean;
  cryptoInstrumentCount: number;
  nativeCryptoCount: number;
  etpOrNamedExposureCount: number;
  totalPortfolioValue: number;
  cryptoValue: number;
  cryptoPortfolioWeightPercent: number;
  bitcoinValue: number;
  ethereumValue: number;
  otherCryptoValue: number;
  bitcoinOfCryptoPercent: number | null;
  ethereumOfCryptoPercent: number | null;
  otherOfCryptoPercent: number | null;
  bitcoinPortfolioWeightPercent: number;
  ethereumPortfolioWeightPercent: number;
  otherCryptoPortfolioWeightPercent: number;
  largestCryptoSymbol: string | null;
  largestCryptoName: string | null;
  largestCryptoOfCryptoPercent: number | null;
  largestCryptoPortfolioWeightPercent: number | null;
  portfolioShape: CryptoPortfolioShape;
  /** Sum of crypto holding day moves when available. */
  cryptoDayMoveAmount: number | null;
  /** Portfolio contribution in percentage points when estimable. */
  cryptoContributionPp: number | null;
  cryptoDayDirection: CryptoPulseBand;
  cryptoAssetsWithMoveData: number;
  dataCoverage: {
    valuedCryptoCount: number;
    moveDataCount: number;
    complete: boolean;
  };
  conclusions: CryptoIntelligenceConclusion[];
  /**
   * Crypto Pulse — Daily from 24h holdings data.
   * Weekly/Monthly only when verified history is supplied (never substitute 24h).
   */
  pulse: {
    daily: {
      available: boolean;
      direction: CryptoPulseBand;
      contributionPp: number | null;
      breadthUp: number;
      breadthDown: number;
      assetsWithData: number;
    };
    weekly: CryptoPulsePeriod;
    monthly: CryptoPulsePeriod;
  };
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function resolveHoldingMove(holding: StoredPortfolioHolding): number | null {
  if (isCryptoHolding(holding)) {
    if (
      typeof holding.change24hAmount === "number" &&
      Number.isFinite(holding.change24hAmount)
    ) {
      return holding.change24hAmount;
    }
  }
  const value = getHoldingMarketValue(holding);
  const pct = isCryptoHolding(holding)
    ? holding.change24hPercent ?? holding.changePercent
    : holding.changePercent;
  if (
    value == null ||
    value <= 0 ||
    typeof pct !== "number" ||
    !Number.isFinite(pct)
  ) {
    return null;
  }
  // changePercent is vs previous close: move ≈ value * pct / (100 + pct) is unstable;
  // use value * pct/100 as display contribution estimate (same family as dailyPerformance).
  return (value * pct) / 100;
}

function classifyShape(input: {
  hasCrypto: boolean;
  cryptoWeight: number;
  bitcoinOfCrypto: number | null;
  ethereumOfCrypto: number | null;
  otherOfCrypto: number | null;
  cryptoOnly: boolean;
}): CryptoPortfolioShape {
  if (!input.hasCrypto) return "none";
  const btc = input.bitcoinOfCrypto ?? 0;
  const eth = input.ethereumOfCrypto ?? 0;
  const other = input.otherOfCrypto ?? 0;

  if (btc >= 99.5 && eth < 0.5 && other < 0.5) {
    return input.cryptoOnly ? "bitcoin_only" : "bitcoin_dominant";
  }
  if (btc >= 70) return "bitcoin_dominant";
  if (btc >= 20 && eth >= 15 && other < 55) return "btc_eth";
  if (other >= 55) return "alt_dominant";
  if (input.cryptoOnly || input.cryptoWeight >= 85) return "diversified_crypto";
  return "mixed_portfolio_with_crypto";
}

function buildConclusions(profile: {
  hasCrypto: boolean;
  bitcoinOfCryptoPercent: number | null;
  ethereumOfCryptoPercent: number | null;
  largestCryptoSymbol: string | null;
  largestCryptoOfCryptoPercent: number | null;
  cryptoContributionPp: number | null;
  cryptoPortfolioWeightPercent: number;
}): CryptoIntelligenceConclusion[] {
  if (!profile.hasCrypto) return [];
  const out: CryptoIntelligenceConclusion[] = [];

  if (
    profile.bitcoinOfCryptoPercent != null &&
    profile.bitcoinOfCryptoPercent >= 55
  ) {
    out.push({
      id: "btc-share",
      text: `Bitcoin drives ${Math.round(profile.bitcoinOfCryptoPercent)}% of your crypto exposure.`,
    });
  } else if (
    profile.largestCryptoSymbol &&
    profile.largestCryptoOfCryptoPercent != null &&
    profile.largestCryptoOfCryptoPercent >= 55
  ) {
    out.push({
      id: "largest-crypto",
      text: `${Math.round(profile.largestCryptoOfCryptoPercent)}% of your crypto exposure sits in ${profile.largestCryptoSymbol}.`,
    });
  }

  if (
    profile.cryptoContributionPp != null &&
    Math.abs(profile.cryptoContributionPp) >= 0.15
  ) {
    const signed =
      profile.cryptoContributionPp > 0
        ? `+${round1(profile.cryptoContributionPp)}`
        : `${round1(profile.cryptoContributionPp)}`;
    out.push({
      id: "crypto-contribution",
      text: `Crypto contributed ${signed} percentage points to your portfolio today.`,
    });
  } else if (
    profile.ethereumOfCryptoPercent != null &&
    profile.ethereumOfCryptoPercent >= 15 &&
    (profile.bitcoinOfCryptoPercent == null ||
      profile.ethereumOfCryptoPercent < (profile.bitcoinOfCryptoPercent ?? 0))
  ) {
    out.push({
      id: "eth-largest-non-btc",
      text: "Ethereum is your largest non-Bitcoin crypto exposure.",
    });
  } else if (
    profile.cryptoPortfolioWeightPercent >= 5 &&
    out.length === 0
  ) {
    out.push({
      id: "crypto-share",
      text: `Crypto is ${round1(profile.cryptoPortfolioWeightPercent)}% of your portfolio.`,
    });
  }

  return out.slice(0, 2);
}

function directionFromReturnPercent(pct: number): CryptoPulseBand {
  if (Math.abs(pct) < 0.05) return "flat";
  return pct > 0 ? "up" : "down";
}

function resolvePulsePeriod(input: {
  available?: boolean;
  returnPercent?: number | null;
  reason?: string;
  coveredHoldingCount?: number;
  skippedHoldingCount?: number;
  missingReason: string;
}): CryptoPulsePeriod {
  if (
    input.available === true &&
    typeof input.returnPercent === "number" &&
    Number.isFinite(input.returnPercent)
  ) {
    return {
      available: true,
      direction: directionFromReturnPercent(input.returnPercent),
      returnPercent: input.returnPercent,
      coveredHoldingCount: input.coveredHoldingCount,
      skippedHoldingCount: input.skippedHoldingCount,
    };
  }
  return {
    available: false,
    reason: input.reason ?? input.missingReason,
  };
}

export function buildCryptoIntelligenceProfile(
  holdings: StoredPortfolioHolding[],
  periodHistory?: CryptoPeriodHistoryOptions | null,
): CryptoIntelligenceProfile {
  let totalPortfolioValue = 0;
  const cryptoRows: Array<{
    holding: StoredPortfolioHolding;
    value: number;
    kind: "bitcoin" | "ethereum" | "other";
  }> = [];

  for (const holding of holdings) {
    const value = getHoldingMarketValue(holding) ?? 0;
    if (value > 0) totalPortfolioValue += value;
    if (!isCryptoIntelligenceHolding(holding)) continue;
    if (value <= 0) continue;

    let kind: "bitcoin" | "ethereum" | "other" = "other";
    if (isBitcoinHolding(holding)) kind = "bitcoin";
    else if (isEthereumHolding(holding)) kind = "ethereum";

    cryptoRows.push({ holding, value, kind });
  }

  const cryptoValue = cryptoRows.reduce((sum, row) => sum + row.value, 0);
  const bitcoinValue = cryptoRows
    .filter((row) => row.kind === "bitcoin")
    .reduce((sum, row) => sum + row.value, 0);
  const ethereumValue = cryptoRows
    .filter((row) => row.kind === "ethereum")
    .reduce((sum, row) => sum + row.value, 0);
  const otherCryptoValue = Math.max(0, cryptoValue - bitcoinValue - ethereumValue);

  const ofPortfolio = (v: number) =>
    totalPortfolioValue > 0 ? (v / totalPortfolioValue) * 100 : 0;
  const ofCrypto = (v: number) =>
    cryptoValue > 0 ? (v / cryptoValue) * 100 : null;

  const cryptoPortfolioWeightPercent = ofPortfolio(cryptoValue);
  const bitcoinOfCryptoPercent = ofCrypto(bitcoinValue);
  const ethereumOfCryptoPercent = ofCrypto(ethereumValue);
  const otherOfCryptoPercent = ofCrypto(otherCryptoValue);

  let largest: (typeof cryptoRows)[number] | null = null;
  for (const row of cryptoRows) {
    if (!largest || row.value > largest.value) largest = row;
  }

  const nativeCryptoCount = cryptoRows.filter((row) =>
    isCryptoHolding(row.holding),
  ).length;
  const etpOrNamedExposureCount = cryptoRows.length - nativeCryptoCount;

  const moves = cryptoRows.map((row) => ({
    row,
    move: resolveHoldingMove(row.holding),
  }));
  const movesAvailable = moves.filter((m) => m.move != null);
  const cryptoDayMoveAmount =
    movesAvailable.length > 0
      ? movesAvailable.reduce((sum, m) => sum + (m.move ?? 0), 0)
      : null;

  const previousPortfolioValue =
    totalPortfolioValue > 0 && cryptoDayMoveAmount != null
      ? totalPortfolioValue - cryptoDayMoveAmount
      : null;
  const cryptoContributionPp =
    previousPortfolioValue != null &&
    previousPortfolioValue > 0 &&
    cryptoDayMoveAmount != null
      ? (cryptoDayMoveAmount / previousPortfolioValue) * 100
      : null;

  let breadthUp = 0;
  let breadthDown = 0;
  for (const m of movesAvailable) {
    if ((m.move ?? 0) > 0) breadthUp += 1;
    else if ((m.move ?? 0) < 0) breadthDown += 1;
  }

  const cryptoDayDirection: CryptoPulseBand =
    cryptoDayMoveAmount == null
      ? "unavailable"
      : Math.abs(cryptoDayMoveAmount) < 1e-9
        ? "flat"
        : cryptoDayMoveAmount > 0
          ? "up"
          : "down";

  const cryptoOnly =
    totalPortfolioValue > 0 && cryptoValue / totalPortfolioValue >= 0.95;
  const hasCrypto = cryptoRows.length > 0;
  const portfolioShape = classifyShape({
    hasCrypto,
    cryptoWeight: cryptoPortfolioWeightPercent,
    bitcoinOfCrypto: bitcoinOfCryptoPercent,
    ethereumOfCrypto: ethereumOfCryptoPercent,
    otherOfCrypto: otherOfCryptoPercent,
    cryptoOnly,
  });

  const base = {
    hasCrypto,
    hasMaterialCrypto: hasCrypto && (cryptoOnly || cryptoPortfolioWeightPercent >= 5),
    cryptoInstrumentCount: cryptoRows.length,
    nativeCryptoCount,
    etpOrNamedExposureCount,
    totalPortfolioValue,
    cryptoValue,
    cryptoPortfolioWeightPercent,
    bitcoinValue,
    ethereumValue,
    otherCryptoValue,
    bitcoinOfCryptoPercent,
    ethereumOfCryptoPercent,
    otherOfCryptoPercent,
    bitcoinPortfolioWeightPercent: ofPortfolio(bitcoinValue),
    ethereumPortfolioWeightPercent: ofPortfolio(ethereumValue),
    otherCryptoPortfolioWeightPercent: ofPortfolio(otherCryptoValue),
    largestCryptoSymbol: largest?.holding.symbol ?? null,
    largestCryptoName: largest?.holding.name ?? null,
    largestCryptoOfCryptoPercent: largest
      ? ofCrypto(largest.value)
      : null,
    largestCryptoPortfolioWeightPercent: largest
      ? ofPortfolio(largest.value)
      : null,
    portfolioShape,
    cryptoDayMoveAmount,
    cryptoContributionPp,
    cryptoDayDirection,
    cryptoAssetsWithMoveData: movesAvailable.length,
    dataCoverage: {
      valuedCryptoCount: cryptoRows.length,
      moveDataCount: movesAvailable.length,
      complete:
        cryptoRows.length > 0 && movesAvailable.length === cryptoRows.length,
    },
  };

  const conclusions = buildConclusions(base);

  return {
    ...base,
    conclusions,
    pulse: {
      daily: {
        available: cryptoDayMoveAmount != null,
        direction: cryptoDayDirection,
        contributionPp: cryptoContributionPp,
        breadthUp,
        breadthDown,
        assetsWithData: movesAvailable.length,
      },
      weekly: resolvePulsePeriod({
        available: periodHistory?.weekAvailable,
        returnPercent: periodHistory?.weekReturnPercent,
        reason: periodHistory?.weekReason,
        coveredHoldingCount: periodHistory?.weekCoveredHoldingCount,
        skippedHoldingCount: periodHistory?.weekSkippedHoldingCount,
        missingReason:
          "Verified crypto weekly history is not available for this sleeve.",
      }),
      monthly: resolvePulsePeriod({
        available: periodHistory?.monthAvailable,
        returnPercent: periodHistory?.monthReturnPercent,
        reason: periodHistory?.monthReason,
        coveredHoldingCount: periodHistory?.monthCoveredHoldingCount,
        skippedHoldingCount: periodHistory?.monthSkippedHoldingCount,
        missingReason:
          "Verified crypto monthly history is not available for this sleeve.",
      }),
    },
  };
}

/** Pick one Dashboard-safe conclusion when crypto structure is material. */
export function selectDashboardCryptoConclusion(
  profile: CryptoIntelligenceProfile,
  marketContext?: CryptoMarketContext | null,
): string | null {
  if (!profile.hasMaterialCrypto) return null;
  if (marketContext) {
    const personalized = personalizeCryptoMarketIntelligence(
      profile,
      marketContext,
    );
    if (personalized.dashboardLine) return personalized.dashboardLine;
  }
  const structural = profile.conclusions.find(
    (row) => row.id === "btc-share" || row.id === "largest-crypto",
  );
  return structural?.text ?? profile.conclusions[0]?.text ?? null;
}
