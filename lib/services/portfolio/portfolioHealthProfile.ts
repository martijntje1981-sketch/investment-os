/**
 * Portfolio Health Phase 2 — one coherent portfolio story.
 * Descriptive only: no generic good/bad score, no fake precision.
 * DNA and Exposure share the same asset-class classification.
 */

import {
  buildPortfolioAnalysis,
  type PortfolioAnalysisSnapshot,
} from "@/lib/client/portfolioAnalysis";
import {
  buildPortfolioExposureAllocation,
  EQUITY_EXPOSURE_GROUP_ID_SET,
  isBitcoinHolding,
  type PortfolioExposureAllocation,
} from "@/lib/services/classification";
import type { ExposureGroupId } from "@/lib/services/classification/types";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";
import type {
  GoalSettings,
  StoredPortfolioHolding,
} from "@/lib/types/portfolioStorage";

/** Memorable investor identity — answers “What type of investor am I?” */
export type PortfolioDnaIdentity =
  | "Bitcoin-Focused Digital Asset Portfolio"
  | "Diversified Crypto Growth Portfolio"
  | "Altcoin-Led Speculative Portfolio"
  | "Stablecoin-Heavy Defensive Crypto Portfolio"
  | "Global Wealth Builder"
  | "High Conviction Growth"
  | "Income Builder"
  | "Diversified Long-Term Investor"
  | "Multi-Asset Growth Portfolio"
  | "Technology Growth Portfolio"
  | "Thematic Growth Portfolio";

export type WithinCryptoBreadth = "Limited" | "Moderate" | "Broad";
export type AssetClassBreadth = "Single class" | "Narrow" | "Multi-asset";

export type GoalAlignmentLabel =
  | "Strong alignment"
  | "Partial alignment"
  | "Limited alignment"
  | "Goal data unavailable";

export type ExpectedVolatilityLevel =
  | "Very Low"
  | "Low"
  | "Moderate"
  | "High"
  | "Very High";

export type ExpectedReturnBand = "Low" | "Moderate" | "High";

export type PortfolioHealthCharacteristic = {
  id: string;
  label: string;
  value: string;
  /** 0–1 for ring / meter visuals — not a quality score. */
  level: number;
};

export type CompositionMode =
  | "crypto_breakdown"
  | "asset_classes"
  | "equity_themes"
  | "unavailable";

export type CompositionSlice = {
  id: string;
  label: string;
  percent: number;
  value: number;
  colorClass: string;
  /** Nested equity themes when parent is Equity. */
  children?: CompositionSlice[];
};

export type PortfolioHealthSignal = {
  title: string;
  detail: string;
  emphasize?: boolean;
};

export type HeroTrait = string;

export type PortfolioHealthHero = {
  identity: PortfolioDnaIdentity;
  /** Short supporting line — roughly ≤30 words. */
  tagline: string;
  /** Up to three concise traits for the hero strip. */
  traits: HeroTrait[];
};

export type HiddenDriverInfluence =
  | "Primary driver"
  | "Meaningful driver"
  | "Supporting driver"
  | "Limited influence";

export type HiddenPortfolioDriver = {
  id: string;
  label: string;
  /** Relative bar length 0–1 vs the strongest driver — not a portfolio %. */
  relativeStrength: number;
  influence: HiddenDriverInfluence;
  colorClass: string;
};

export type PortfolioHealthProfile = {
  hasValuedPortfolio: boolean;
  partialData: boolean;
  dataNotes: string[];
  hero: PortfolioHealthHero;
  dna: {
    characteristics: PortfolioHealthCharacteristic[];
  };
  /** Shared classification used by DNA traits, Exposure, and Hidden Drivers. */
  classification: {
    cryptoWeight: number;
    equityWeight: number;
    cashWeight: number;
    otherWeight: number;
    fixedIncomeWeight: number;
    bitcoinWeight: number;
    altcoinWeight: number;
    stablecoinWeight: number;
  };
  goalAlignment: {
    label: GoalAlignmentLabel;
    reason: string;
    bandPosition: number;
  };
  exposure: {
    mode: CompositionMode;
    title: string;
    slices: CompositionSlice[];
    coverageNote: string | null;
  };
  hiddenDrivers: {
    drivers: HiddenPortfolioDriver[];
    insight: string;
  };
  strength: PortfolioHealthSignal | null;
  vulnerability: PortfolioHealthSignal | null;
  expectedVolatility: {
    level: ExpectedVolatilityLevel;
    /** 0–1 descriptive index for visuals. */
    index: number;
    summary: string;
  };
  riskReturn: {
    volatilityIndex: number;
    returnIndex: number;
    returnBand: ExpectedReturnBand;
    label: string;
  };
};

export type PortfolioHealthProfileInput = {
  holdings: StoredPortfolioHolding[];
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  dividends?: PortfolioDividendSnapshot | null;
  analysis?: PortfolioAnalysisSnapshot;
  exposure?: PortfolioExposureAllocation;
};

const STABLECOIN_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "DAI",
  "BUSD",
  "TUSD",
  "USDP",
  "FRAX",
  "EURC",
  "PYUSD",
]);

/** Large-cap alts used for within-crypto driver buckets (not investment advice). */
const LARGE_CAP_ALT_SYMBOLS = new Set([
  "ETH",
  "SOL",
  "BNB",
  "XRP",
  "ADA",
  "AVAX",
  "DOT",
  "LINK",
  "MATIC",
  "POL",
  "TON",
  "TRX",
  "ATOM",
  "LTC",
  "BCH",
  "NEAR",
  "APT",
  "SUI",
]);

const THEMATIC_GROUPS = new Set<ExposureGroupId>([
  "technology_communication",
  "healthcare",
  "consumer",
  "financials_real_estate",
  "industrials_resources",
]);

const EQUITY_GROUP_IDS = EQUITY_EXPOSURE_GROUP_ID_SET;

  const ASSET_COLORS = {
  crypto: "bg-q2-strong",
  equity: "bg-brand-strong",
  cash: "bg-slate-400",
  other: "bg-slate-300",
  fixed_income: "bg-teal-700",
  bitcoin: "bg-amber-500",
  altcoins: "bg-q2-strong",
  stablecoins: "bg-emerald-600",
} as const;

const THEME_COLORS: Record<string, string> = {
  technology_communication: "bg-brand-strong",
  healthcare: "bg-rose-500",
  consumer: "bg-orange-500",
  financials_real_estate: "bg-indigo-600",
  industrials_resources: "bg-amber-600",
  diversified_equity: "bg-slate-700",
  precious_metals: "bg-yellow-700",
};

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatPct(value: number): string {
  return `${round1(value)}%`;
}

function isEthereumHolding(holding: StoredPortfolioHolding): boolean {
  const symbol = holding.symbol.trim().toUpperCase().replace(/[-_/].*$/, "");
  const provider = (holding.providerSymbol ?? "").toUpperCase();
  const name = holding.name.trim().toUpperCase();
  return (
    symbol === "ETH" ||
    provider.startsWith("ETH-") ||
    provider.startsWith("ETH.") ||
    name === "ETHEREUM" ||
    name.includes("ETHEREUM")
  );
}

function isStablecoinHolding(holding: StoredPortfolioHolding): boolean {
  const symbol = holding.symbol.trim().toUpperCase().replace(/[-_/].*$/, "");
  const providerBase = (holding.providerSymbol ?? "")
    .toUpperCase()
    .split(/[-.]/)[0];
  return STABLECOIN_SYMBOLS.has(symbol) || STABLECOIN_SYMBOLS.has(providerBase);
}

function isLargeCapAltHolding(holding: StoredPortfolioHolding): boolean {
  if (isBitcoinHolding(holding) || isEthereumHolding(holding) || isStablecoinHolding(holding)) {
    return false;
  }
  const symbol = holding.symbol.trim().toUpperCase().replace(/[-_/].*$/, "");
  const providerBase = (holding.providerSymbol ?? "")
    .toUpperCase()
    .split(/[-.]/)[0];
  return LARGE_CAP_ALT_SYMBOLS.has(symbol) || LARGE_CAP_ALT_SYMBOLS.has(providerBase);
}

type CryptoStructure = {
  isCryptoOnly: boolean;
  isCryptoDominant: boolean;
  bitcoinOfCrypto: number;
  ethereumOfCrypto: number;
  largeCapAltOfCrypto: number;
  speculativeAltOfCrypto: number;
  stablecoinOfCrypto: number;
  bitcoinPortfolioWeight: number;
  ethereumPortfolioWeight: number;
  largeCapAltPortfolioWeight: number;
  speculativeAltPortfolioWeight: number;
  stablecoinPortfolioWeight: number;
  withinCryptoBreadth: WithinCryptoBreadth;
  assetClassBreadth: AssetClassBreadth;
  distinctCryptoCategories: number;
  largestCryptoAssetShare: number;
};

function analyzeCryptoStructure(input: {
  exposure: PortfolioExposureAllocation;
  classification: ReturnType<typeof buildSharedClassification>;
}): CryptoStructure {
  const { exposure, classification } = input;
  const cryptoValue = classification.cryptoValue;
  const total = classification.totalValue;

  let bitcoin = 0;
  let ethereum = 0;
  let largeCap = 0;
  let speculative = 0;
  let stablecoins = 0;
  let largestAsset = 0;

  const cryptoGroup = exposure.groups.find((group) => group.groupId === "crypto");
  for (const item of cryptoGroup?.holdings ?? []) {
    largestAsset = Math.max(largestAsset, item.value);
    const synthetic = {
      symbol: item.symbol,
      name: item.name,
      providerSymbol: null,
    } as StoredPortfolioHolding;

    if (isStablecoinHolding(synthetic)) stablecoins += item.value;
    else if (isBitcoinHolding(synthetic)) bitcoin += item.value;
    else if (isEthereumHolding(synthetic)) ethereum += item.value;
    else if (isLargeCapAltHolding(synthetic)) largeCap += item.value;
    else speculative += item.value;
  }

  const ofCrypto = (value: number) =>
    cryptoValue > 0 ? (value / cryptoValue) * 100 : 0;
  const ofPortfolio = (value: number) => (total > 0 ? (value / total) * 100 : 0);

  const categoryShares = [
    ofCrypto(bitcoin),
    ofCrypto(ethereum),
    ofCrypto(largeCap),
    ofCrypto(speculative),
    ofCrypto(stablecoins),
  ].filter((share) => share >= 8);
  const distinctCryptoCategories = categoryShares.length;
  const largestCategory = Math.max(0, ...categoryShares, ofCrypto(bitcoin));

  let withinCryptoBreadth: WithinCryptoBreadth = "Limited";
  if (cryptoValue <= 0) {
    withinCryptoBreadth = "Limited";
  } else if (
    distinctCryptoCategories >= 3 &&
    largestCategory < 60 &&
    ofCrypto(largestAsset) < 55
  ) {
    withinCryptoBreadth = "Broad";
  } else if (distinctCryptoCategories >= 2 && largestCategory < 75) {
    withinCryptoBreadth = "Moderate";
  }

  const nonCrypto =
    classification.equityWeight +
    classification.otherWeight +
    classification.fixedIncomeWeight;
  const isCryptoOnly =
    classification.cryptoWeight >= 85 ||
    (classification.cryptoWeight >= 70 && nonCrypto < 8);
  const isCryptoDominant = classification.cryptoWeight >= 55;

  let assetClassBreadth: AssetClassBreadth = "Single class";
  const sleeves = [
    classification.cryptoWeight,
    classification.equityWeight,
    classification.fixedIncomeWeight,
    classification.cashWeight,
  ].filter((weight) => weight >= 12).length;
  if (sleeves >= 2) assetClassBreadth = "Multi-asset";
  else if (!isCryptoOnly && nonCrypto >= 12 && classification.cryptoWeight >= 12) {
    assetClassBreadth = "Narrow";
  } else if (isCryptoOnly || isCryptoDominant) {
    assetClassBreadth = "Single class";
  } else if (sleeves <= 1) {
    assetClassBreadth = "Narrow";
  } else {
    assetClassBreadth = "Multi-asset";
  }

  return {
    isCryptoOnly,
    isCryptoDominant,
    bitcoinOfCrypto: ofCrypto(bitcoin),
    ethereumOfCrypto: ofCrypto(ethereum),
    largeCapAltOfCrypto: ofCrypto(largeCap),
    speculativeAltOfCrypto: ofCrypto(speculative),
    stablecoinOfCrypto: ofCrypto(stablecoins),
    bitcoinPortfolioWeight: ofPortfolio(bitcoin),
    ethereumPortfolioWeight: ofPortfolio(ethereum),
    largeCapAltPortfolioWeight: ofPortfolio(largeCap),
    speculativeAltPortfolioWeight: ofPortfolio(speculative),
    stablecoinPortfolioWeight: ofPortfolio(stablecoins),
    withinCryptoBreadth,
    assetClassBreadth,
    distinctCryptoCategories,
    largestCryptoAssetShare: ofCrypto(largestAsset),
  };
}

/**
 * Shared asset-class weights from exposure allocation — single source of truth
 * for DNA crypto share and Exposure composition.
 */
export function buildSharedClassification(
  exposure: PortfolioExposureAllocation,
): {
  cryptoWeight: number;
  equityWeight: number;
  cashWeight: number;
  otherWeight: number;
  fixedIncomeWeight: number;
  cryptoValue: number;
  equityValue: number;
  cashValue: number;
  otherValue: number;
  fixedIncomeValue: number;
  totalValue: number;
} {
  let cryptoValue = 0;
  let equityValue = 0;
  let cashValue = 0;
  let otherValue = 0;
  let fixedIncomeValue = 0;

  for (const group of exposure.groups) {
    if (group.groupId === "crypto") cryptoValue += group.value;
    else if (group.groupId === "cash") cashValue += group.value;
    else if (group.groupId === "fixed_income") fixedIncomeValue += group.value;
    else if (EQUITY_GROUP_IDS.has(group.groupId)) equityValue += group.value;
    else otherValue += group.value;
  }

  const totalValue = exposure.totalValue;
  const pct = (value: number) => (totalValue > 0 ? (value / totalValue) * 100 : 0);

  return {
    cryptoValue,
    equityValue,
    cashValue,
    otherValue,
    fixedIncomeValue,
    totalValue,
    cryptoWeight: pct(cryptoValue),
    equityWeight: pct(equityValue),
    cashWeight: pct(cashValue),
    otherWeight: pct(otherValue),
    fixedIncomeWeight: pct(fixedIncomeValue),
  };
}

function cryptoBucketWeights(
  exposure: PortfolioExposureAllocation,
  cryptoValue: number,
): { bitcoin: number; altcoins: number; stablecoins: number } {
  if (cryptoValue <= 0) {
    return { bitcoin: 0, altcoins: 0, stablecoins: 0 };
  }

  const cryptoGroup = exposure.groups.find((group) => group.groupId === "crypto");
  let bitcoin = 0;
  let stablecoins = 0;

  for (const item of cryptoGroup?.holdings ?? []) {
    // Holdings in exposure contributions are slim — resolve via symbol/name fields.
    const synthetic = {
      symbol: item.symbol,
      name: item.name,
      providerSymbol: null,
    } as StoredPortfolioHolding;

    if (isStablecoinHolding(synthetic)) {
      stablecoins += item.value;
    } else if (isBitcoinHolding(synthetic)) {
      bitcoin += item.value;
    }
  }

  const altcoins = Math.max(0, cryptoValue - bitcoin - stablecoins);
  const pct = (value: number) => (value / cryptoValue) * 100;

  return {
    bitcoin: pct(bitcoin),
    altcoins: pct(altcoins),
    stablecoins: pct(stablecoins),
  };
}

function hasMeaningfulIncome(
  dividends: PortfolioDividendSnapshot | null | undefined,
  totalValue: number,
): boolean {
  if (!dividends) return false;

  const passiveAnnual =
    dividends.passiveIncome?.eligibleEstimatedAnnualCashDistributionEur ?? 0;
  const annual =
    passiveAnnual > 0 ? passiveAnnual : dividends.estimatedAnnualIncomeEur;

  if (dividends.passiveIncome?.hasUsableEstimate && passiveAnnual > 0) {
    if (totalValue > 0 && (passiveAnnual / totalValue) * 100 >= 1) {
      return true;
    }
  }

  if (dividends.payingHoldingsCount >= 2 && dividends.portfolioYieldPercent >= 1) {
    return true;
  }
  if (dividends.portfolioYieldPercent >= 2) return true;
  if (totalValue > 0 && annual > 0 && (annual / totalValue) * 100 >= 1.5) {
    return true;
  }
  if (dividends.hasDividendData && dividends.payingHoldingsCount >= 1) {
    if (totalValue > 0 && annual > 0 && (annual / totalValue) * 100 >= 1) {
      return true;
    }
  }
  return false;
}

function dominantEquityTheme(
  exposure: PortfolioExposureAllocation,
): PortfolioExposureAllocation["groups"][number] | null {
  const themes = exposure.groups
    .filter((group) => EQUITY_GROUP_IDS.has(group.groupId) && group.value > 0)
    .sort((a, b) => b.value - a.value);
  return themes[0] ?? null;
}

function classifyIdentity(input: {
  cryptoWeight: number;
  equityWeight: number;
  otherWeight: number;
  cashWeight: number;
  fixedIncomeWeight: number;
  crypto: CryptoStructure;
  analysis: PortfolioAnalysisSnapshot;
  exposure: PortfolioExposureAllocation;
  incomeFocused: boolean;
}): PortfolioDnaIdentity {
  const {
    cryptoWeight,
    equityWeight,
    otherWeight,
    cashWeight,
    fixedIncomeWeight,
    crypto,
    analysis,
    exposure,
    incomeFocused,
  } = input;

  const investedNonCrypto = equityWeight + otherWeight + fixedIncomeWeight;

  if (incomeFocused && investedNonCrypto >= 40 && cryptoWeight < 40) {
    return "Income Builder";
  }

  // Crypto-only / crypto-dominant — evaluate within digital assets, not vs stocks and bonds.
  if (
    (crypto.isCryptoOnly || cryptoWeight >= 70) &&
    fixedIncomeWeight < 12 &&
    equityWeight + otherWeight < 12
  ) {
    const altcoinLike =
      crypto.ethereumOfCrypto +
      crypto.largeCapAltOfCrypto +
      crypto.speculativeAltOfCrypto;

    if (crypto.stablecoinPortfolioWeight >= 45 || crypto.stablecoinOfCrypto >= 50) {
      return "Stablecoin-Heavy Defensive Crypto Portfolio";
    }
    if (
      crypto.bitcoinPortfolioWeight >= 55 ||
      (crypto.bitcoinOfCrypto >= 70 && altcoinLike < 25)
    ) {
      return "Bitcoin-Focused Digital Asset Portfolio";
    }
    if (crypto.bitcoinOfCrypto < 35 && altcoinLike >= 50) {
      return "Altcoin-Led Speculative Portfolio";
    }
    if (
      crypto.withinCryptoBreadth === "Broad" ||
      crypto.withinCryptoBreadth === "Moderate"
    ) {
      return "Diversified Crypto Growth Portfolio";
    }
    if (crypto.bitcoinOfCrypto >= 45) {
      return "Bitcoin-Focused Digital Asset Portfolio";
    }
    return "Altcoin-Led Speculative Portfolio";
  }

  if (crypto.isCryptoDominant && crypto.bitcoinPortfolioWeight >= 30) {
    return "Bitcoin-Focused Digital Asset Portfolio";
  }

  if (crypto.isCryptoDominant) {
    return "Diversified Crypto Growth Portfolio";
  }

  const multiAsset =
    [cryptoWeight, equityWeight, fixedIncomeWeight, cashWeight].filter(
      (w) => w >= 15,
    ).length >= 2;

  if (multiAsset && cryptoWeight >= 15 && investedNonCrypto >= 15) {
    return "Multi-Asset Growth Portfolio";
  }

  if (
    analysis.concentrationLevel === "highly_concentrated" ||
    (analysis.largestPosition?.weightPercent ?? 0) >= 45
  ) {
    const theme = dominantEquityTheme(exposure);
    if (theme?.groupId === "technology_communication") {
      return "Technology Growth Portfolio";
    }
    if (theme && THEMATIC_GROUPS.has(theme.groupId)) {
      return "Thematic Growth Portfolio";
    }
    return "High Conviction Growth";
  }

  if (
    analysis.concentrationLevel === "broadly_spread" &&
    investedNonCrypto >= 55
  ) {
    const theme = dominantEquityTheme(exposure);
    if (theme?.groupId === "diversified_equity" || !theme) {
      return "Global Wealth Builder";
    }
    return "Diversified Long-Term Investor";
  }

  if (investedNonCrypto >= 50) {
    return "Diversified Long-Term Investor";
  }

  if (cryptoWeight >= 30) {
    return "Multi-Asset Growth Portfolio";
  }

  return "Global Wealth Builder";
}

function orientationLevels(input: {
  incomeFocused: boolean;
  cryptoWeight: number;
  equityWeight: number;
  analysis: PortfolioAnalysisSnapshot;
  volatilityIndex: number;
  crypto: CryptoStructure;
}): {
  growth: number;
  income: number;
  concentration: number;
  diversification: number;
  volatility: number;
  style: string;
  styleLevel: number;
  assetClassBreadth: AssetClassBreadth;
  withinCryptoBreadth: WithinCryptoBreadth | null;
  showCryptoBreadth: boolean;
} {
  const growth = input.incomeFocused
    ? 0.35
    : Math.min(1, 0.45 + input.cryptoWeight / 200 + input.equityWeight / 250);

  const income = input.incomeFocused
    ? 0.85
    : input.crypto.isCryptoOnly || input.cryptoWeight >= 70
      ? 0.05
      : input.cryptoWeight >= 50
        ? 0.1
        : 0.2;

  const concentration =
    input.analysis.concentrationLevel === "highly_concentrated"
      ? 0.9
      : input.analysis.concentrationLevel === "moderately_concentrated"
        ? 0.55
        : 0.25;

  const withinLevel =
    input.crypto.withinCryptoBreadth === "Broad"
      ? 0.8
      : input.crypto.withinCryptoBreadth === "Moderate"
        ? 0.5
        : 0.2;

  // For crypto-only, "diversification" in DNA is within-crypto — not vs traditional assets.
  const diversification =
    input.crypto.isCryptoOnly || input.crypto.isCryptoDominant
      ? withinLevel
      : 1 - concentration;

  let style = "Total-return growth";
  let styleLevel = 0.7;
  if (input.incomeFocused) {
    style = "Cash-income oriented";
    styleLevel = 0.8;
  } else if (input.crypto.isCryptoOnly || input.cryptoWeight >= 70) {
    style = "Digital-asset growth";
    styleLevel = 0.85;
  } else if (input.analysis.concentrationLevel === "highly_concentrated") {
    style = "High-conviction";
    styleLevel = 0.8;
  } else if (input.analysis.concentrationLevel === "broadly_spread") {
    style = "Broad wealth building";
    styleLevel = 0.65;
  }

  return {
    growth,
    income,
    concentration,
    diversification,
    volatility: input.volatilityIndex,
    style,
    styleLevel,
    assetClassBreadth: input.crypto.assetClassBreadth,
    withinCryptoBreadth:
      input.crypto.isCryptoOnly || input.crypto.isCryptoDominant
        ? input.crypto.withinCryptoBreadth
        : null,
    showCryptoBreadth: input.crypto.isCryptoOnly || input.crypto.isCryptoDominant,
  };
}

function buildCharacteristics(
  levels: ReturnType<typeof orientationLevels>,
  volatilityLevel: ExpectedVolatilityLevel,
): PortfolioHealthCharacteristic[] {
  const growthLabel =
    levels.growth >= 0.7 ? "Primary" : levels.growth >= 0.4 ? "Balanced" : "Secondary";
  const incomeLabel = levels.showCryptoBreadth
    ? "Not applicable"
    : levels.income >= 0.7
      ? "Primary"
      : levels.income >= 0.4
        ? "Supporting"
        : "Secondary";
  const concentrationLabel =
    levels.concentration >= 0.75
      ? "High"
      : levels.concentration >= 0.45
        ? "Moderate"
        : "Low";

  const chars: PortfolioHealthCharacteristic[] = [
    {
      id: "growth",
      label: "Growth orientation",
      value: growthLabel,
      level: levels.growth,
    },
    {
      id: "income",
      label: levels.showCryptoBreadth
        ? "Traditional dividends"
        : "Income orientation",
      value: incomeLabel,
      level: levels.income,
    },
    {
      id: "concentration",
      label: "Concentration",
      value: concentrationLabel,
      level: levels.concentration,
    },
  ];

  if (levels.showCryptoBreadth) {
    const assetClassLevel =
      levels.assetClassBreadth === "Multi-asset"
        ? 0.75
        : levels.assetClassBreadth === "Narrow"
          ? 0.4
          : 0.15;
    const withinLevel =
      levels.withinCryptoBreadth === "Broad"
        ? 0.8
        : levels.withinCryptoBreadth === "Moderate"
          ? 0.5
          : 0.2;
    chars.push(
      {
        id: "asset_class_breadth",
        label: "Asset-class breadth",
        value:
          levels.assetClassBreadth === "Single class"
            ? "Single class (crypto)"
            : levels.assetClassBreadth,
        level: assetClassLevel,
      },
      {
        id: "within_crypto_breadth",
        label: "Within-crypto breadth",
        value: levels.withinCryptoBreadth ?? "Limited",
        level: withinLevel,
      },
    );
  } else {
    const diversificationLabel =
      levels.diversification >= 0.65
        ? "Broad"
        : levels.diversification >= 0.4
          ? "Moderate"
          : "Narrow";
    chars.push({
      id: "diversification",
      label: "Diversification",
      value: diversificationLabel,
      level: levels.diversification,
    });
  }

  chars.push(
    {
      id: "volatility",
      label: "Expected volatility",
      value: volatilityLevel,
      level: levels.volatility,
    },
    {
      id: "style",
      label: "Dominant style",
      value: levels.style,
      level: levels.styleLevel,
    },
  );

  return chars;
}

/**
 * Expected portfolio volatility — structural estimate, not historical.
 * Foundation for a future volatility engine.
 */
export function estimateExpectedVolatility(input: {
  cryptoWeight: number;
  cashWeight: number;
  concentrationLevel: PortfolioAnalysisSnapshot["concentrationLevel"];
  largestWeightPercent: number;
  thematicEquityShare: number;
  equityWeight: number;
}): { level: ExpectedVolatilityLevel; index: number; summary: string } {
  let score = 0.28;

  score += (input.cryptoWeight / 100) * 0.55;
  score -= (input.cashWeight / 100) * 0.35;

  if (input.concentrationLevel === "highly_concentrated") score += 0.18;
  else if (input.concentrationLevel === "moderately_concentrated") score += 0.08;
  else score -= 0.06;

  if (input.largestWeightPercent >= 50) score += 0.12;
  else if (input.largestWeightPercent >= 35) score += 0.06;

  if (input.thematicEquityShare >= 50 && input.equityWeight >= 30) {
    score += 0.08;
  }

  const index = Math.max(0.05, Math.min(0.98, score));

  let level: ExpectedVolatilityLevel;
  if (index < 0.22) level = "Very Low";
  else if (index < 0.38) level = "Low";
  else if (index < 0.55) level = "Moderate";
  else if (index < 0.72) level = "High";
  else level = "Very High";

  const drivers: string[] = [];
  if (input.cryptoWeight >= 25) {
    drivers.push(`${formatPct(input.cryptoWeight)} crypto allocation`);
  }
  if (input.concentrationLevel === "highly_concentrated") {
    drivers.push("elevated concentration");
  } else if (input.concentrationLevel === "broadly_spread") {
    drivers.push("broader position spread");
  }
  if (input.cashWeight >= 20) {
    drivers.push(`${formatPct(input.cashWeight)} cash cushion`);
  }

  const summary =
    drivers.length > 0
      ? `Expected characteristic based on ${drivers.join(", ")} — not measured historical volatility.`
      : "Expected characteristic from current structure — not measured historical volatility.";

  return { level, index, summary };
}

function estimateExpectedReturn(input: {
  cryptoWeight: number;
  incomeFocused: boolean;
  cashWeight: number;
  equityWeight: number;
  concentrationLevel: PortfolioAnalysisSnapshot["concentrationLevel"];
}): { band: ExpectedReturnBand; index: number } {
  let score = 0.4;
  score += (input.cryptoWeight / 100) * 0.35;
  score += (input.equityWeight / 100) * 0.2;
  score -= (input.cashWeight / 100) * 0.25;
  if (input.incomeFocused) score -= 0.08;
  if (input.concentrationLevel === "highly_concentrated") score += 0.1;

  const index = Math.max(0.12, Math.min(0.92, score));
  const band: ExpectedReturnBand =
    index >= 0.62 ? "High" : index >= 0.4 ? "Moderate" : "Low";
  return { band, index };
}

function buildHero(input: {
  identity: PortfolioDnaIdentity;
  classification: ReturnType<typeof buildSharedClassification>;
  incomeFocused: boolean;
  volatility: ExpectedVolatilityLevel;
  analysis: PortfolioAnalysisSnapshot;
  theme: PortfolioExposureAllocation["groups"][number] | null;
  crypto: CryptoStructure;
}): PortfolioHealthHero {
  const { identity, incomeFocused, volatility, analysis, theme, crypto } =
    input;
  void input.classification;

  let tagline: string;
  switch (identity) {
    case "Bitcoin-Focused Digital Asset Portfolio":
      tagline =
        crypto.withinCryptoBreadth === "Limited"
          ? "Bitcoin-focused digital assets with one dominant return driver and limited within-crypto breadth."
          : "Built for long-term growth with a strong Bitcoin conviction inside digital assets.";
      break;
    case "Diversified Crypto Growth Portfolio":
      tagline =
        "Digital-asset growth with meaningful within-crypto breadth across several categories.";
      break;
    case "Altcoin-Led Speculative Portfolio":
      tagline =
        "Built around altcoin exposure, with behaviour driven mainly by non-Bitcoin crypto markets.";
      break;
    case "Stablecoin-Heavy Defensive Crypto Portfolio":
      tagline =
        "Crypto sleeve tilted toward stablecoins, emphasising lower crypto-market beta.";
      break;
    case "Income Builder":
      tagline =
        "Built around distributing cash income as a primary objective.";
      break;
    case "Multi-Asset Growth Portfolio":
      tagline =
        "Built for long-term capital growth through digital assets and thematic investments.";
      break;
    case "Technology Growth Portfolio":
      tagline =
        "Built for growth with a clear technology and innovation tilt.";
      break;
    case "Thematic Growth Portfolio":
      tagline = theme
        ? `Built for growth with focused exposure to ${theme.displayLabel.toLowerCase()}.`
        : "Built for growth with focused thematic exposure.";
      break;
    case "High Conviction Growth":
      tagline =
        "Built for growth through a concentrated set of high-conviction positions.";
      break;
    case "Diversified Long-Term Investor":
      tagline =
        "Built for long-term wealth across a diversified investment base.";
      break;
    case "Global Wealth Builder":
    default:
      tagline =
        "Built for long-term wealth building across global markets.";
      break;
  }

  const traits: string[] = [];

  if (crypto.isCryptoOnly || crypto.isCryptoDominant) {
    if (crypto.largestCryptoAssetShare >= 60 || crypto.bitcoinOfCrypto >= 70) {
      traits.push("One dominant return driver");
    } else if (analysis.concentrationLevel === "highly_concentrated") {
      traits.push("High conviction");
    } else {
      traits.push(`${crypto.withinCryptoBreadth} within-crypto breadth`);
    }
    traits.push(`${volatility} expected volatility`);
    if (crypto.assetClassBreadth === "Single class") {
      traits.push("Single asset class");
    } else {
      traits.push("Income secondary");
    }
  } else {
    traits.push(
      analysis.concentrationLevel === "highly_concentrated" ||
        (analysis.largestPosition?.weightPercent ?? 0) >= 40
        ? "High conviction"
        : analysis.concentrationLevel === "broadly_spread"
          ? "Broadly diversified"
          : "Moderate conviction",
    );
    traits.push(
      volatility === "Very High" || volatility === "High"
        ? `${volatility} expected volatility`
        : volatility === "Very Low" || volatility === "Low"
          ? `${volatility} expected volatility`
          : "Moderate expected volatility",
    );
    traits.push(incomeFocused ? "Income primary" : "Income secondary");
  }

  return {
    identity,
    tagline,
    traits: traits.slice(0, 3),
  };
}

/**
 * Structural behaviour drivers — influence-weighted, not a plain allocation copy.
 * Relative bars compare drivers to each other; labels stay qualitative.
 */
export function buildHiddenDrivers(input: {
  exposure: PortfolioExposureAllocation;
  classification: ReturnType<typeof buildSharedClassification>;
  cryptoBuckets: { bitcoin: number; altcoins: number; stablecoins: number };
  crypto: CryptoStructure;
  incomeFocused: boolean;
}): PortfolioHealthProfile["hiddenDrivers"] {
  const { exposure, classification, crypto, incomeFocused } = input;
  if (!classification.totalValue) {
    return {
      drivers: [],
      insight: "Hidden drivers need valued holdings to appear.",
    };
  }

  type Candidate = {
    id: string;
    label: string;
    weight: number;
    multiplier: number;
    colorClass: string;
  };

  const candidates: Candidate[] = [];

  // Crypto-only / crypto-dominant: drive behaviour from crypto categories, not equity sectors.
  if (
    (crypto.isCryptoOnly || classification.cryptoWeight >= 70) &&
    classification.fixedIncomeWeight < 12
  ) {
    if (crypto.bitcoinPortfolioWeight >= 2) {
      candidates.push({
        id: "bitcoin",
        label: "Bitcoin",
        weight: crypto.bitcoinPortfolioWeight,
        multiplier: 1.5,
        colorClass: "bg-amber-500",
      });
    }
    if (crypto.ethereumPortfolioWeight >= 2) {
      candidates.push({
        id: "ethereum",
        label: "Ethereum",
        weight: crypto.ethereumPortfolioWeight,
        multiplier: 1.35,
        colorClass: "bg-indigo-500",
      });
    }
    if (crypto.largeCapAltPortfolioWeight >= 2) {
      candidates.push({
        id: "large_cap_alts",
        label: "Large-cap altcoins",
        weight: crypto.largeCapAltPortfolioWeight,
        multiplier: 1.25,
        colorClass: "bg-q2-strong",
      });
    }
    if (crypto.speculativeAltPortfolioWeight >= 2) {
      candidates.push({
        id: "speculative_alts",
        label: "Speculative altcoins",
        weight: crypto.speculativeAltPortfolioWeight,
        multiplier: 1.4,
        colorClass: "bg-rose-500",
      });
    }
    if (crypto.stablecoinPortfolioWeight >= 2) {
      candidates.push({
        id: "stablecoins",
        label: "Stablecoins",
        weight: crypto.stablecoinPortfolioWeight,
        multiplier: 0.45,
        colorClass: "bg-emerald-600",
      });
    }
    if (classification.cashWeight >= 4) {
      candidates.push({
        id: "cash",
        label: "Cash",
        weight: classification.cashWeight,
        multiplier: 0.3,
        colorClass: "bg-slate-400",
      });
    }
  } else {
    if (classification.cryptoWeight >= 3) {
      if (crypto.bitcoinPortfolioWeight >= 8) {
        candidates.push({
          id: "bitcoin",
          label: "Bitcoin",
          weight: crypto.bitcoinPortfolioWeight,
          multiplier: 1.45,
          colorClass: "bg-amber-500",
        });
        const otherCrypto = Math.max(
          0,
          classification.cryptoWeight - crypto.bitcoinPortfolioWeight,
        );
        if (otherCrypto >= 3) {
          candidates.push({
            id: "other_crypto",
            label: "Other crypto",
            weight: otherCrypto,
            multiplier: 1.3,
            colorClass: "bg-q2-strong",
          });
        }
      } else {
        candidates.push({
          id: "crypto",
          label: "Crypto",
          weight: classification.cryptoWeight,
          multiplier: 1.4,
          colorClass: "bg-q2-strong",
        });
      }
    }

    for (const group of exposure.groups) {
      if (!EQUITY_GROUP_IDS.has(group.groupId) || group.value <= 0) continue;
      const weight =
        classification.totalValue > 0
          ? (group.value / classification.totalValue) * 100
          : 0;
      if (weight < 2.5) continue;

      if (group.groupId === "diversified_equity") {
        candidates.push({
          id: group.groupId,
          label: "Global equity",
          weight,
          multiplier: 0.85,
          colorClass: THEME_COLORS.diversified_equity,
        });
      } else if (group.groupId === "technology_communication") {
        candidates.push({
          id: group.groupId,
          label: "Technology & AI",
          weight,
          multiplier: 1.2,
          colorClass: THEME_COLORS.technology_communication,
        });
      } else if (group.groupId === "industrials_resources") {
        candidates.push({
          id: group.groupId,
          label: "Resources & commodities",
          weight,
          multiplier: 1.15,
          colorClass: THEME_COLORS.industrials_resources,
        });
      } else {
        candidates.push({
          id: group.groupId,
          label: group.displayLabel,
          weight,
          multiplier: 1.1,
          colorClass: THEME_COLORS[group.groupId] ?? "bg-slate-600",
        });
      }
    }

    if (classification.cashWeight >= 4) {
      candidates.push({
        id: "cash",
        label: "Cash",
        weight: classification.cashWeight,
        multiplier: 0.35,
        colorClass: "bg-slate-400",
      });
    }

    if (classification.fixedIncomeWeight >= 5) {
      candidates.push({
        id: "fixed_income",
        label: "Fixed income",
        weight: classification.fixedIncomeWeight,
        multiplier: 0.75,
        colorClass: ASSET_COLORS.fixed_income,
      });
    }

    if (classification.otherWeight >= 5) {
      candidates.push({
        id: "other",
        label: incomeFocused ? "Income & other holdings" : "Other holdings",
        weight: classification.otherWeight,
        multiplier: incomeFocused ? 1.05 : 0.9,
        colorClass: "bg-slate-500",
      });
    }
  }

  const scored = candidates
    .map((item) => ({
      ...item,
      score: item.weight * item.multiplier,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const maxScore = scored[0]?.score ?? 1;

  const drivers: HiddenPortfolioDriver[] = scored.map((item, index) => {
    const relativeStrength = Math.max(0.12, item.score / maxScore);
    let influence: HiddenDriverInfluence;
    if (index === 0 && relativeStrength >= 0.85) influence = "Primary driver";
    else if (relativeStrength >= 0.55) influence = "Meaningful driver";
    else if (relativeStrength >= 0.3) influence = "Supporting driver";
    else influence = "Limited influence";

    return {
      id: item.id,
      label: item.label,
      relativeStrength,
      influence,
      colorClass: item.colorClass,
    };
  });

  const top = drivers[0];
  const second = drivers[1];
  let insight: string;
  if (!top) {
    insight = "Not enough valued structure to identify behaviour drivers.";
  } else if (crypto.isCryptoOnly) {
    if (second && second.relativeStrength >= 0.35) {
      insight = `Within this crypto portfolio, expected movement is driven mainly by ${top.label.toLowerCase()} and ${second.label.toLowerCase()} — not by traditional equity sectors.`;
    } else {
      insight = `Within this crypto portfolio, ${top.label.toLowerCase()} is the dominant structural return driver.`;
    }
  } else if (second && second.relativeStrength >= 0.4) {
    insight = `Although this portfolio contains several holdings, most of its expected movement is driven by ${top.label.toLowerCase()} and ${second.label.toLowerCase()}.`;
  } else {
    insight = `Most of this portfolio’s expected movement is structurally tied to ${top.label.toLowerCase()}.`;
  }

  return { drivers, insight };
}

function buildExposure(input: {
  classification: ReturnType<typeof buildSharedClassification>;
  exposure: PortfolioExposureAllocation;
  cryptoBuckets: { bitcoin: number; altcoins: number; stablecoins: number };
}): PortfolioHealthProfile["exposure"] {
  const { classification, exposure, cryptoBuckets } = input;

  if (!classification.totalValue) {
    return {
      mode: "unavailable",
      title: "Exposure",
      slices: [],
      coverageNote: "Exposure needs valued holdings.",
    };
  }

  // Crypto-heavy / crypto-only: Bitcoin / Altcoins / Stablecoins — never empty equity sectors
  if (
    (classification.cryptoWeight >= 70 ||
      (classification.cryptoWeight >= 55 && classification.equityWeight < 8)) &&
    classification.fixedIncomeWeight < 12
  ) {
    const slices: CompositionSlice[] = [];
    const cryptoValue = classification.cryptoValue;
    if (cryptoBuckets.bitcoin > 0.5) {
      slices.push({
        id: "bitcoin",
        label: "Bitcoin",
        percent: round1(cryptoBuckets.bitcoin),
        value: (cryptoBuckets.bitcoin / 100) * cryptoValue,
        colorClass: ASSET_COLORS.bitcoin,
      });
    }
    if (cryptoBuckets.altcoins > 0.5) {
      slices.push({
        id: "altcoins",
        label: "Altcoins",
        percent: round1(cryptoBuckets.altcoins),
        value: (cryptoBuckets.altcoins / 100) * cryptoValue,
        colorClass: ASSET_COLORS.altcoins,
      });
    }
    if (cryptoBuckets.stablecoins > 0.5) {
      slices.push({
        id: "stablecoins",
        label: "Stablecoins",
        percent: round1(cryptoBuckets.stablecoins),
        value: (cryptoBuckets.stablecoins / 100) * cryptoValue,
        colorClass: ASSET_COLORS.stablecoins,
      });
    }

    // Include residual non-crypto only if material
    if (classification.cashWeight >= 5) {
      slices.push({
        id: "cash",
        label: "Cash",
        percent: round1(classification.cashWeight),
        value: classification.cashValue,
        colorClass: ASSET_COLORS.cash,
      });
    }
    if (classification.equityWeight >= 5) {
      slices.push({
        id: "equity",
        label: "Equity",
        percent: round1(classification.equityWeight),
        value: classification.equityValue,
        colorClass: ASSET_COLORS.equity,
      });
    }
    if (classification.fixedIncomeWeight >= 5) {
      slices.push({
        id: "fixed_income",
        label: "Fixed income",
        percent: round1(classification.fixedIncomeWeight),
        value: classification.fixedIncomeValue,
        colorClass: ASSET_COLORS.fixed_income,
      });
    }

    return {
      mode: "crypto_breakdown",
      title: "Exposure",
      slices: slices.sort((a, b) => b.percent - a.percent),
      coverageNote: exposure.coverageLabel,
    };
  }

  // Mixed / equity: Crypto, Equity, Cash, Other — Equity may nest themes
  const equityThemes = exposure.groups
    .filter((group) => EQUITY_GROUP_IDS.has(group.groupId) && group.value > 0)
    .map((group) => ({
      id: group.groupId,
      label: group.displayLabel,
      percent:
        classification.equityValue > 0
          ? round1((group.value / classification.equityValue) * 100)
          : 0,
      value: group.value,
      colorClass: THEME_COLORS[group.groupId] ?? "bg-slate-600",
    }))
    .sort((a, b) => b.value - a.value);

  const slices: CompositionSlice[] = [];

  if (classification.cryptoWeight > 0.5) {
    slices.push({
      id: "crypto",
      label: "Crypto",
      percent: round1(classification.cryptoWeight),
      value: classification.cryptoValue,
      colorClass: ASSET_COLORS.crypto,
    });
  }
  if (classification.equityWeight > 0.5) {
    slices.push({
      id: "equity",
      label: "Equity",
      percent: round1(classification.equityWeight),
      value: classification.equityValue,
      colorClass: ASSET_COLORS.equity,
      children: equityThemes.length > 1 ? equityThemes : equityThemes,
    });
  }
  // Cash only if meaningful — never the visual focus unless dominant
  const cashDominant =
    classification.cashWeight >= classification.cryptoWeight &&
    classification.cashWeight >= classification.equityWeight;
  if (classification.cashWeight >= 5 || cashDominant) {
    slices.push({
      id: "cash",
      label: "Cash",
      percent: round1(classification.cashWeight),
      value: classification.cashValue,
      colorClass: ASSET_COLORS.cash,
    });
  }
  if (classification.fixedIncomeWeight >= 3) {
    slices.push({
      id: "fixed_income",
      label: "Fixed income",
      percent: round1(classification.fixedIncomeWeight),
      value: classification.fixedIncomeValue,
      colorClass: ASSET_COLORS.fixed_income,
      children:
        exposure.fixedIncome &&
        exposure.fixedIncome.subgroups.some((row) => row.type !== "unknown")
          ? exposure.fixedIncome.subgroups.map((row) => ({
              id: row.subgroupId,
              label: row.displayLabel,
              percent: round1(row.rawPercent),
              value: row.value,
              colorClass: ASSET_COLORS.fixed_income,
            }))
          : undefined,
    });
  }
  if (classification.otherWeight >= 3) {
    slices.push({
      id: "other",
      label: "Other assets",
      percent: round1(classification.otherWeight),
      value: classification.otherValue,
      colorClass: ASSET_COLORS.other,
    });
  }

  const mode: CompositionMode =
    classification.equityWeight >= 40 && equityThemes.length > 0
      ? "equity_themes"
      : "asset_classes";

  return {
    mode,
    title: "Exposure",
    slices: slices.sort((a, b) => b.percent - a.percent),
    coverageNote: exposure.coverageLabel,
  };
}

function buildStrength(input: {
  identity: PortfolioDnaIdentity;
  incomeFocused: boolean;
  analysis: PortfolioAnalysisSnapshot;
  classification: ReturnType<typeof buildSharedClassification>;
  theme: PortfolioExposureAllocation["groups"][number] | null;
  crypto: CryptoStructure;
}): PortfolioHealthSignal | null {
  if (input.incomeFocused) {
    return {
      title: "Reliable income profile",
      detail:
        "The structure is organised around distributing cash yield rather than relying only on price appreciation.",
    };
  }

  if (input.crypto.isCryptoOnly || input.classification.cryptoWeight >= 70) {
    if (input.identity === "Stablecoin-Heavy Defensive Crypto Portfolio") {
      return {
        title: "Lower crypto-market beta tilt",
        detail:
          "Stablecoin weight dampens crypto-market swings relative to a fully risk-on digital-asset book.",
      };
    }
    if (input.crypto.withinCryptoBreadth === "Broad" || input.crypto.withinCryptoBreadth === "Moderate") {
      return {
        title: "Within-crypto breadth",
        detail:
          "Return drivers are spread across several crypto categories, not a single coin alone.",
      };
    }
    return {
      title: "Clear digital-asset growth orientation",
      detail:
        "The book is intentionally organised as a crypto portfolio, with behaviour evaluated inside digital assets rather than against stocks and bonds.",
    };
  }

  if (input.analysis.concentrationLevel === "broadly_spread") {
    return {
      title: "Broad global diversification",
      detail:
        "Risk and return are spread across many positions, reducing dependence on any single outcome.",
    };
  }

  if (input.classification.cryptoWeight >= 40) {
    return {
      title: "Clear long-term growth orientation",
      detail:
        "The book is intentionally tilted toward assets with higher expected long-run return potential.",
    };
  }

  if (
    input.theme &&
    THEMATIC_GROUPS.has(input.theme.groupId) &&
    input.theme.displayPercent >= 40
  ) {
    return {
      title: "Excellent thematic focus",
      detail: `Exposure is deliberately concentrated in ${input.theme.displayLabel.toLowerCase()}, giving the portfolio a clear investment identity.`,
    };
  }

  if (input.identity === "High Conviction Growth") {
    return {
      title: "High-conviction structure",
      detail:
        "Capital is focused where the thesis is strongest, rather than diluted across many low-conviction sleeves.",
    };
  }

  if (input.classification.cryptoWeight >= 20 && input.classification.equityWeight >= 20) {
    return {
      title: "Multi-asset growth flexibility",
      detail:
        "Crypto and equity sleeves can respond differently across market regimes while sharing a growth objective.",
    };
  }

  return {
    title: "Clear long-term growth orientation",
    detail:
      "The portfolio is designed primarily for capital appreciation over a multi-year horizon.",
  };
}

function buildVulnerability(input: {
  identity: PortfolioDnaIdentity;
  analysis: PortfolioAnalysisSnapshot;
  classification: ReturnType<typeof buildSharedClassification>;
  bitcoinPortfolioWeight: number;
  theme: PortfolioExposureAllocation["groups"][number] | null;
  quoteCurrencyConcentration: { currency: string; weightPercent: number } | null;
  crypto: CryptoStructure;
}): PortfolioHealthSignal | null {
  if (input.crypto.isCryptoOnly || input.classification.cryptoWeight >= 70) {
    if (input.bitcoinPortfolioWeight >= 55 || input.crypto.bitcoinOfCrypto >= 70) {
      return {
        title: "Bitcoin dependency",
        detail:
          "A large share of expected outcomes is tied to Bitcoin’s path — a structural concentration within crypto, not a missing equity-sector problem.",
        emphasize: true,
      };
    }
    if (input.crypto.withinCryptoBreadth === "Limited") {
      return {
        title: "Limited within-crypto breadth",
        detail:
          "Few crypto categories or coins drive most of the book, so digital-asset moves concentrate in a narrow set of return drivers.",
        emphasize: true,
      };
    }
    if (input.crypto.speculativeAltPortfolioWeight >= 40) {
      return {
        title: "Speculative altcoin dependency",
        detail:
          "A sizeable share of behaviour is tied to smaller or more speculative altcoins rather than Bitcoin or large-cap crypto.",
        emphasize: true,
      };
    }
    if (
      input.quoteCurrencyConcentration &&
      input.quoteCurrencyConcentration.weightPercent >= 85
    ) {
      return {
        title: "Quote-currency concentration",
        detail: `Crypto value is heavily quoted in ${input.quoteCurrencyConcentration.currency}, adding FX path dependence alongside asset risk.`,
      };
    }
    return {
      title: "Crypto-market dependency",
      detail:
        "Expected behaviour tracks crypto market regimes. This describes a single asset class — not a lack of traditional diversification.",
    };
  }

  if (input.bitcoinPortfolioWeight >= 45) {
    return {
      title: "Bitcoin dependency",
      detail:
        "A large share of portfolio outcomes is tied to Bitcoin’s path, amplifying both upside and drawdowns.",
      emphasize: true,
    };
  }

  if (
    input.analysis.concentrationLevel === "highly_concentrated" ||
    (input.analysis.largestPosition?.weightPercent ?? 0) >= 45
  ) {
    return {
      title: "Concentration risk",
      detail:
        "Returns and drawdowns are driven by a small set of positions, so individual moves matter more than for a broad book.",
      emphasize: true,
    };
  }

  if (
    input.theme &&
    THEMATIC_GROUPS.has(input.theme.groupId) &&
    input.theme.displayPercent >= 55 &&
    input.classification.equityWeight >= 40
  ) {
    return {
      title: "Thematic concentration",
      detail: `${input.theme.displayLabel} dominates equity exposure, so holdings may respond to the same sector shocks.`,
      emphasize: true,
    };
  }

  if (
    input.quoteCurrencyConcentration &&
    input.quoteCurrencyConcentration.weightPercent >= 85 &&
    input.classification.cryptoWeight >= 40
  ) {
    return {
      title: "Currency concentration",
      detail: `Crypto value is heavily quoted in ${input.quoteCurrencyConcentration.currency}, adding FX path dependence alongside asset risk.`,
    };
  }

  if (input.analysis.concentrationLevel === "moderately_concentrated") {
    return {
      title: "Limited diversification",
      detail:
        "The portfolio is only partly diversified, so a handful of positions still shape most of the result.",
    };
  }

  if (input.classification.cryptoWeight >= 55) {
    return {
      title: "Crypto-market dependency",
      detail:
        "Expected behaviour tracks crypto market regimes more than broad equity or bond cycles.",
    };
  }

  if (
    input.theme?.groupId === "financials_real_estate" &&
    input.theme.displayPercent >= 40
  ) {
    return {
      title: "Interest-rate sensitivity",
      detail:
        "A sizeable financials and real-estate tilt can respond strongly when discount rates move.",
    };
  }

  return {
    title: "Path depends on lead exposures",
    detail:
      "Portfolio behaviour will still follow its dominant asset sleeves when markets shift.",
  };
}

function assessGoalAlignment(input: {
  identity: PortfolioDnaIdentity;
  goal: GoalSettings | null;
  hasSavedGoal: boolean;
  incomeFocused: boolean;
  cryptoWeight: number;
  volatility: ExpectedVolatilityLevel;
  crypto: CryptoStructure;
}): PortfolioHealthProfile["goalAlignment"] {
  if (!input.hasSavedGoal || !input.goal) {
    return {
      label: "Goal data unavailable",
      reason:
        "Save a target value, timeline, and return assumption on Goals to test whether this structure fits your objective.",
      bandPosition: 0,
    };
  }

  const wantsIncome = (input.goal.passiveIncomeTarget ?? 0) > 0;
  const highReturn = input.goal.expectedAnnualReturn >= 10;
  const lowReturn = input.goal.expectedAnnualReturn <= 4;
  const yearsLeft = input.goal.targetYear - new Date().getFullYear();
  const longHorizon = yearsLeft >= 8;
  const nearTerm = yearsLeft > 0 && yearsLeft < 5;
  const isCryptoBook =
    input.crypto.isCryptoOnly ||
    input.cryptoWeight >= 70 ||
    input.identity.includes("Crypto") ||
    input.identity.includes("Digital Asset") ||
    input.identity.includes("Altcoin") ||
    input.identity.includes("Bitcoin-Focused") ||
    input.identity.includes("Stablecoin-Heavy");

  if (wantsIncome) {
    if (input.incomeFocused || input.identity === "Income Builder") {
      return {
        label: "Strong alignment",
        reason: `Your goal includes a passive-income target of about ${Math.round(input.goal.passiveIncomeTarget ?? 0).toLocaleString("en-GB")}, and this portfolio is structured to produce distributing cash yield.`,
        bandPosition: 0.85,
      };
    }
    if (isCryptoBook) {
      return {
        label: "Limited alignment",
        reason:
          "Your goal asks for cash income, while this crypto portfolio is priced on asset appreciation — staking or protocol yield is not treated as traditional dividends here.",
        bandPosition: 0.2,
      };
    }
    return {
      label: "Limited alignment",
      reason:
        "Your saved objective emphasises passive income, but the portfolio’s design prioritises price appreciation over distributing yield.",
      bandPosition: 0.25,
    };
  }

  if (isCryptoBook) {
    if (nearTerm || lowReturn) {
      return {
        label: "Limited alignment",
        reason: `A ${nearTerm ? `horizon to ${input.goal.targetYear}` : "lower expected-return assumption"} fits poorly with a ${input.volatility.toLowerCase()}-volatility crypto structure oriented to long-horizon digital-asset risk.`,
        bandPosition: 0.22,
      };
    }
    if (longHorizon && (highReturn || input.goal.expectedAnnualReturn >= 7)) {
      return {
        label: "Strong alignment",
        reason: `A longer path to ${input.goal.targetYear} with a ${input.goal.expectedAnnualReturn}% return assumption is structurally compatible with a high-volatility crypto growth portfolio — descriptive fit, not a recommendation.`,
        bandPosition: 0.84,
      };
    }
    if (input.identity === "Stablecoin-Heavy Defensive Crypto Portfolio") {
      return {
        label: "Partial alignment",
        reason: `A stablecoin-heavy crypto book can support a wealth target with lower crypto beta, though outcomes still depend on digital-asset rails through ${input.goal.targetYear}.`,
        bandPosition: 0.52,
      };
    }
    return {
      label: "Partial alignment",
      reason: `This crypto structure can support your ${input.goal.targetYear} wealth target; progress will track digital-asset markets rather than a traditional stock-and-bond mix.`,
      bandPosition: 0.5,
    };
  }

  if (highReturn && (input.cryptoWeight >= 40 || input.identity.includes("Growth"))) {
    return {
      label: "Strong alignment",
      reason: `Your ${input.goal.expectedAnnualReturn}% expected-return assumption fits a growth-oriented book with ${input.volatility.toLowerCase()} expected volatility — consistent with an assertive wealth path to ${input.goal.targetYear}.`,
      bandPosition: 0.85,
    };
  }

  if (
    input.identity === "Global Wealth Builder" ||
    input.identity === "Diversified Long-Term Investor" ||
    input.identity === "Multi-Asset Growth Portfolio"
  ) {
    return {
      label: "Strong alignment",
      reason: `A wealth target of ${Math.round(input.goal.targetValue).toLocaleString("en-GB")} by ${input.goal.targetYear} fits this total-return structure without requiring cash distributions.`,
      bandPosition: 0.82,
    };
  }

  if (input.identity === "Income Builder" && !wantsIncome) {
    return {
      label: "Partial alignment",
      reason:
        "An income-led portfolio can still fund a wealth target, though the path leans more on distributions and contributions than pure price growth.",
      bandPosition: 0.5,
    };
  }

  if (
    input.identity === "High Conviction Growth" ||
    input.identity === "Technology Growth Portfolio"
  ) {
    if (nearTerm && (input.volatility === "High" || input.volatility === "Very High")) {
      return {
        label: "Partial alignment",
        reason: `Your horizon to ${input.goal.targetYear} is relatively short for a high-conviction, ${input.volatility.toLowerCase()}-volatility structure — the objective can still fit, but path risk is elevated.`,
        bandPosition: 0.45,
      };
    }
    return {
      label: "Partial alignment",
      reason: `This high-conviction growth design can support your wealth target, but progress will track a narrower set of exposures through ${input.goal.targetYear}.`,
      bandPosition: 0.5,
    };
  }

  return {
    label: "Partial alignment",
    reason: `The current structure can support your ${input.goal.targetYear} wealth target; path behaviour will follow its dominant growth sleeves.`,
    bandPosition: 0.5,
  };
}

function quoteCurrencyConcentration(
  analysis: PortfolioAnalysisSnapshot,
): { currency: string; weightPercent: number } | null {
  const cryptoPositions = analysis.valuedPositions.filter(
    (position) =>
      position.holding.assetType === "crypto" ||
      isBitcoinHolding(position.holding),
  );
  if (cryptoPositions.length === 0) return null;

  const totals = new Map<string, number>();
  let total = 0;
  for (const position of cryptoPositions) {
    const currency = (
      position.holding.quoteCurrency ||
      position.holding.currency ||
      "EUR"
    ).toUpperCase();
    totals.set(currency, (totals.get(currency) ?? 0) + position.value);
    total += position.value;
  }
  if (total <= 0) return null;
  const [currency, value] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0];
  return { currency, weightPercent: (value / total) * 100 };
}

export function buildPortfolioHealthProfile(
  input: PortfolioHealthProfileInput,
): PortfolioHealthProfile {
  const analysis = input.analysis ?? buildPortfolioAnalysis(input.holdings);
  const exposure =
    input.exposure ?? buildPortfolioExposureAllocation(input.holdings);
  const dividends = input.dividends ?? null;
  const dataNotes: string[] = [];

  if (analysis.unvaluedHoldings.length > 0) {
    dataNotes.push(
      `${analysis.unvaluedHoldings.length} holding${analysis.unvaluedHoldings.length === 1 ? "" : "s"} lack a usable price.`,
    );
  }
  if (exposure.unclassifiedHoldingCount > 0) {
    dataNotes.push("Some holdings are unclassified — exposure may be partial.");
  }

  const emptyClassification = {
    cryptoWeight: 0,
    equityWeight: 0,
    cashWeight: 0,
    otherWeight: 0,
    fixedIncomeWeight: 0,
    bitcoinWeight: 0,
    altcoinWeight: 0,
    stablecoinWeight: 0,
  };

  const emptyCrypto: CryptoStructure = {
    isCryptoOnly: false,
    isCryptoDominant: false,
    bitcoinOfCrypto: 0,
    ethereumOfCrypto: 0,
    largeCapAltOfCrypto: 0,
    speculativeAltOfCrypto: 0,
    stablecoinOfCrypto: 0,
    bitcoinPortfolioWeight: 0,
    ethereumPortfolioWeight: 0,
    largeCapAltPortfolioWeight: 0,
    speculativeAltPortfolioWeight: 0,
    stablecoinPortfolioWeight: 0,
    withinCryptoBreadth: "Limited",
    assetClassBreadth: "Single class",
    distinctCryptoCategories: 0,
    largestCryptoAssetShare: 0,
  };

  if (!analysis.totalValue || !exposure.hasAnyValue) {
    return {
      hasValuedPortfolio: false,
      partialData: dataNotes.length > 0,
      dataNotes:
        dataNotes.length > 0
          ? dataNotes
          : ["Add valued holdings to build Portfolio Health."],
      hero: {
        identity: "Global Wealth Builder",
        tagline: "Add valued holdings to reveal your portfolio story.",
        traits: [],
      },
      dna: { characteristics: [] },
      classification: emptyClassification,
      goalAlignment: assessGoalAlignment({
        identity: "Global Wealth Builder",
        goal: input.goal,
        hasSavedGoal: input.hasSavedGoal,
        incomeFocused: false,
        cryptoWeight: 0,
        volatility: "Moderate",
        crypto: emptyCrypto,
      }),
      exposure: {
        mode: "unavailable",
        title: "Exposure",
        slices: [],
        coverageNote: "Exposure unavailable until holdings have usable values.",
      },
      hiddenDrivers: {
        drivers: [],
        insight: "Hidden drivers need valued holdings to appear.",
      },
      strength: null,
      vulnerability: null,
      expectedVolatility: {
        level: "Moderate",
        index: 0.4,
        summary: "Unavailable without valued holdings.",
      },
      riskReturn: {
        volatilityIndex: 0.4,
        returnIndex: 0.4,
        returnBand: "Moderate",
        label: "Insufficient data",
      },
    };
  }

  const classification = buildSharedClassification(exposure);
  const cryptoBuckets = cryptoBucketWeights(exposure, classification.cryptoValue);
  const crypto = analyzeCryptoStructure({ exposure, classification });
  const bitcoinPortfolioWeight = crypto.bitcoinPortfolioWeight;

  const incomeFocused = hasMeaningfulIncome(dividends, analysis.totalValue);
  const theme = dominantEquityTheme(exposure);
  const thematicEquityShare =
    theme && THEMATIC_GROUPS.has(theme.groupId) ? theme.displayPercent : 0;

  const expectedVolatility = estimateExpectedVolatility({
    cryptoWeight: classification.cryptoWeight,
    cashWeight: classification.cashWeight,
    concentrationLevel: analysis.concentrationLevel,
    largestWeightPercent: analysis.largestPosition?.weightPercent ?? 0,
    thematicEquityShare: crypto.isCryptoOnly ? 0 : thematicEquityShare,
    equityWeight: classification.equityWeight,
  });

  const expectedReturn = estimateExpectedReturn({
    cryptoWeight: classification.cryptoWeight,
    incomeFocused,
    cashWeight: classification.cashWeight,
    equityWeight: classification.equityWeight,
    concentrationLevel: analysis.concentrationLevel,
  });

  const identity = classifyIdentity({
    cryptoWeight: classification.cryptoWeight,
    equityWeight: classification.equityWeight,
    otherWeight: classification.otherWeight,
    cashWeight: classification.cashWeight,
    fixedIncomeWeight: classification.fixedIncomeWeight,
    crypto,
    analysis,
    exposure,
    incomeFocused,
  });

  const levels = orientationLevels({
    incomeFocused,
    cryptoWeight: classification.cryptoWeight,
    equityWeight: classification.equityWeight,
    analysis,
    volatilityIndex: expectedVolatility.index,
    crypto,
  });

  const quoteFx = quoteCurrencyConcentration(analysis);

  return {
    hasValuedPortfolio: true,
    partialData: dataNotes.length > 0,
    dataNotes,
    hero: buildHero({
      identity,
      classification,
      incomeFocused,
      volatility: expectedVolatility.level,
      analysis,
      theme,
      crypto,
    }),
    dna: {
      characteristics: buildCharacteristics(levels, expectedVolatility.level),
    },
    classification: {
      cryptoWeight: round1(classification.cryptoWeight),
      equityWeight: round1(classification.equityWeight),
      cashWeight: round1(classification.cashWeight),
      otherWeight: round1(classification.otherWeight),
      fixedIncomeWeight: round1(classification.fixedIncomeWeight),
      bitcoinWeight: round1(bitcoinPortfolioWeight),
      altcoinWeight: round1(
        crypto.ethereumPortfolioWeight +
          crypto.largeCapAltPortfolioWeight +
          crypto.speculativeAltPortfolioWeight,
      ),
      stablecoinWeight: round1(crypto.stablecoinPortfolioWeight),
    },
    goalAlignment: assessGoalAlignment({
      identity,
      goal: input.goal,
      hasSavedGoal: input.hasSavedGoal,
      incomeFocused,
      cryptoWeight: classification.cryptoWeight,
      volatility: expectedVolatility.level,
      crypto,
    }),
    exposure: buildExposure({
      classification,
      exposure,
      cryptoBuckets,
    }),
    hiddenDrivers: buildHiddenDrivers({
      exposure,
      classification,
      cryptoBuckets,
      crypto,
      incomeFocused,
    }),
    strength: buildStrength({
      identity,
      incomeFocused,
      analysis,
      classification,
      theme,
      crypto,
    }),
    vulnerability: buildVulnerability({
      identity,
      analysis,
      classification,
      bitcoinPortfolioWeight,
      theme,
      quoteCurrencyConcentration: quoteFx,
      crypto,
    }),
    expectedVolatility,
    riskReturn: {
      volatilityIndex: expectedVolatility.index,
      returnIndex: expectedReturn.index,
      returnBand: expectedReturn.band,
      label: `${expectedReturn.band} expected return · ${expectedVolatility.level} expected volatility`,
    },
  };
}
