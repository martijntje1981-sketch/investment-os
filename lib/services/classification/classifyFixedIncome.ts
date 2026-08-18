/**
 * Centralized fixed-income classification.
 * Conservative name / category / provider-type heuristics only.
 * No duration, coupon, yield, or rate-shock math.
 * No provider calls.
 */

export type FixedIncomeType =
  | "government"
  | "corporate"
  | "mixed_aggregate"
  | "inflation_linked"
  | "unknown";

export type FixedIncomeCreditQuality =
  | "investment_grade"
  | "high_yield"
  | "mixed_unknown";

export type FixedIncomeDurationBucket =
  | "short"
  | "intermediate"
  | "long"
  | "unknown";

export type FixedIncomeFieldConfidence = "known" | "inferred" | "unknown";

export type FixedIncomeClassificationSource =
  | "research_profile"
  | "provider_type"
  | "name_heuristic";

export type FixedIncomeHoldingInput = {
  assetType?: "investment" | "cash" | "crypto" | null;
  symbol?: string | null;
  name?: string | null;
  instrumentName?: string | null;
  fundCategory?: string | null;
  /** Provider search / id-mapping Type when already fetched (e.g. "ETF", "Bond"). */
  providerInstrumentType?: string | null;
};

export type FixedIncomeClassification = {
  isFixedIncome: boolean;
  type: FixedIncomeType;
  creditQuality: FixedIncomeCreditQuality;
  durationBucket: FixedIncomeDurationBucket;
  sovereignTreasury: boolean;
  emergingMarketDebt: boolean;
  floatingRate: boolean;
  classificationIncomplete: boolean;
  confidence: {
    assetClass: FixedIncomeFieldConfidence;
    type: FixedIncomeFieldConfidence;
    creditQuality: FixedIncomeFieldConfidence;
    duration: FixedIncomeFieldConfidence;
  };
  source: FixedIncomeClassificationSource | null;
  reason: string;
};

export const FIXED_INCOME_TYPE_LABELS: Record<FixedIncomeType, string> = {
  government: "Government",
  corporate: "Corporate",
  mixed_aggregate: "Mixed / Aggregate",
  inflation_linked: "Inflation-linked",
  unknown: "Classification incomplete",
};

export const FIXED_INCOME_CREDIT_LABELS: Record<FixedIncomeCreditQuality, string> =
  {
    investment_grade: "Investment Grade",
    high_yield: "High Yield",
    mixed_unknown: "Mixed / Unknown",
  };

export const FIXED_INCOME_DURATION_LABELS: Record<
  FixedIncomeDurationBucket,
  string
> = {
  short: "Short",
  intermediate: "Intermediate",
  long: "Long",
  unknown: "Unknown",
};

/** User-facing subtype label — inferred metadata is not presented as confirmed. */
export function formatFixedIncomeSubtypeLabel(input: {
  displayLabel: string;
  confidence: FixedIncomeFieldConfidence;
}): string {
  if (input.confidence === "inferred") {
    return `${input.displayLabel} · inferred`;
  }
  return input.displayLabel;
}

export const NOT_FIXED_INCOME: FixedIncomeClassification = {
  isFixedIncome: false,
  type: "unknown",
  creditQuality: "mixed_unknown",
  durationBucket: "unknown",
  sovereignTreasury: false,
  emergingMarketDebt: false,
  floatingRate: false,
  classificationIncomplete: true,
  confidence: {
    assetClass: "unknown",
    type: "unknown",
    creditQuality: "unknown",
    duration: "unknown",
  },
  source: null,
  reason: "Not classified as fixed income",
};

const MIXED_ALLOCATION =
  /\b(?:multi[-\s]?asset|balanced fund|60\s*\/\s*40|40\s*\/\s*60|equity and bond|stock and bond|stocks? and bonds?)\b/i;

const EQUITY_DOMINANT =
  /\b(?:equity|equities|stock|stocks|shares|common stock|preferred|reit|real estate|commodity|commodities|gold|silver|bitcoin|ethereum|crypto)\b/i;

const BOND_CORE =
  /\b(?:bond(?:s)?|fixed[\s-]?income|gilt(?:s)?|bund(?:s)?|treasur(?:y|ies)|sovereign(?:s)?|tips)\b/i;

const DEBT_FUND =
  /\b(?:debt|credit|obligation(?:s)?)\b/i;

const FUND_WRAPPER =
  /\b(?:etf|etp|ucits|fund|fonds|index)\b/i;

const INFLATION =
  /\b(?:tips|inflation[\s-]?link(?:ed)?|index[\s-]?link(?:ed)?|linker(?:s)?|inflation[\s-]?protected)\b/i;

const GOVERNMENT =
  /\b(?:government|govt|sovereign(?:s)?|treasur(?:y|ies)|gilt(?:s)?|bund(?:s)?|agency|agencies|bundesschatz|oa(?:t|ts)|bonos)\b/i;

const CORPORATE =
  /\b(?:corporate|corp(?:orates)?|credit|ig credit)\b/i;

const AGGREGATE =
  /\b(?:aggregate|agg(?:regate)?|total bond|global bond|broad bond|blended bond|diversified bond)\b/i;

const HIGH_YIELD =
  /\b(?:high[\s-]?yield|\bhy\b|junk)\b/i;

const INVESTMENT_GRADE =
  /\b(?:investment[\s-]?grade|\big\b)\b/i;

const FLOATING =
  /\b(?:floating[\s-]?rate|floater(?:s)?|\bfrn\b|variable[\s-]?rate)\b/i;

const EMERGING =
  /\b(?:emerging[\s-]?market(?:s)?|\bem\b debt|\bemd\b|em bond)\b/i;

const INCOME_ONLY =
  /\b(?:income|yield|dividend)\b/i;

function normalizeHaystack(input: FixedIncomeHoldingInput): string {
  return [
    input.name,
    input.instrumentName,
    input.fundCategory,
    input.symbol,
  ]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" ")
    .toLowerCase()
    .replace(/[_/]+/g, " ");
}

function providerType(input: FixedIncomeHoldingInput): string {
  return (input.providerInstrumentType ?? "").trim().toLowerCase();
}

function isDirectBondType(type: string): boolean {
  return type === "bond" || type === "bonds" || type === "fixed income";
}

function looksLikeDirectBondName(text: string): boolean {
  // Conservative: coupon + maturity year + sovereign/issuer cue.
  const hasCoupon = /\b\d+(?:[.,]\d+)?\s*%/.test(text);
  const hasYear = /\b(?:19|20)\d{2}\b/.test(text);
  const hasIssuerCue =
    GOVERNMENT.test(text) ||
    /\b(?:note|notes|debenture|obligation)\b/i.test(text);
  return hasCoupon && hasYear && hasIssuerCue;
}

function excludeAsNonBond(text: string): boolean {
  if (MIXED_ALLOCATION.test(text)) return true;
  if (EQUITY_DOMINANT.test(text) && !BOND_CORE.test(text) && !INFLATION.test(text)) {
    return true;
  }
  if (INCOME_ONLY.test(text) && !BOND_CORE.test(text) && !INFLATION.test(text) && !DEBT_FUND.test(text)) {
    return true;
  }
  return false;
}

function detectAssetClass(input: FixedIncomeHoldingInput, text: string): {
  isFixedIncome: boolean;
  source: FixedIncomeClassificationSource;
  confidence: FixedIncomeFieldConfidence;
  reason: string;
} | null {
  if (input.assetType === "cash" || input.assetType === "crypto") {
    return null;
  }
  if (excludeAsNonBond(text)) {
    return null;
  }

  const type = providerType(input);
  if (isDirectBondType(type)) {
    return {
      isFixedIncome: true,
      source: "provider_type",
      confidence: "known",
      reason: "Provider instrument type is Bond",
    };
  }

  if (INFLATION.test(text) && (BOND_CORE.test(text) || FUND_WRAPPER.test(text) || /\btips\b/i.test(text))) {
    return {
      isFixedIncome: true,
      source: "name_heuristic",
      confidence: "inferred",
      reason: "Inflation-linked / TIPS name heuristic",
    };
  }

  if (BOND_CORE.test(text)) {
    return {
      isFixedIncome: true,
      source: "name_heuristic",
      confidence: "inferred",
      reason: "Bond / fixed-income name heuristic",
    };
  }

  if (DEBT_FUND.test(text) && FUND_WRAPPER.test(text)) {
    return {
      isFixedIncome: true,
      source: "name_heuristic",
      confidence: "inferred",
      reason: "Debt / credit fund name heuristic",
    };
  }

  if (looksLikeDirectBondName(text)) {
    return {
      isFixedIncome: true,
      source: "name_heuristic",
      confidence: "inferred",
      reason: "Direct-bond coupon/maturity name heuristic",
    };
  }

  return null;
}

function detectType(text: string): {
  type: FixedIncomeType;
  confidence: FixedIncomeFieldConfidence;
  sovereignTreasury: boolean;
} {
  const inflation = INFLATION.test(text);
  const government = GOVERNMENT.test(text);
  const corporate = CORPORATE.test(text);
  const aggregate = AGGREGATE.test(text);
  const sovereignTreasury =
    /\b(?:treasur(?:y|ies)|gilt(?:s)?|bund(?:s)?|sovereign(?:s)?)\b/i.test(text);

  if (inflation && !corporate) {
    return { type: "inflation_linked", confidence: "inferred", sovereignTreasury };
  }
  if (aggregate && !inflation) {
    return { type: "mixed_aggregate", confidence: "inferred", sovereignTreasury };
  }
  if (government && !corporate) {
    return { type: "government", confidence: "inferred", sovereignTreasury };
  }
  if (corporate && !government) {
    return { type: "corporate", confidence: "inferred", sovereignTreasury: false };
  }
  if (government && corporate) {
    return { type: "mixed_aggregate", confidence: "inferred", sovereignTreasury };
  }
  if (inflation) {
    return { type: "inflation_linked", confidence: "inferred", sovereignTreasury };
  }
  return { type: "unknown", confidence: "unknown", sovereignTreasury };
}

function detectCredit(text: string, type: FixedIncomeType): {
  creditQuality: FixedIncomeCreditQuality;
  confidence: FixedIncomeFieldConfidence;
} {
  if (HIGH_YIELD.test(text)) {
    return { creditQuality: "high_yield", confidence: "inferred" };
  }
  if (INVESTMENT_GRADE.test(text)) {
    return { creditQuality: "investment_grade", confidence: "inferred" };
  }
  if (type === "mixed_aggregate") {
    return { creditQuality: "mixed_unknown", confidence: "unknown" };
  }
  // Government is usually IG, but do not present that as confirmed.
  return { creditQuality: "mixed_unknown", confidence: "unknown" };
}

function yearRangeDuration(text: string): FixedIncomeDurationBucket | null {
  const match = text.match(
    /\b(0|1|3|5|7|10|15|20|25|30)\s*[–\-]\s*(1|3|5|7|10|15|20|25|30)(?:\s*(?:yr|year|y|jahre?))?\b/i,
  );
  if (!match) return null;
  const start = Number(match[1]);
  const end = Number(match[2]);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  if (end <= 5) return "short";
  if (end <= 10) return "intermediate";
  return "long";
}

function detectDuration(text: string): {
  durationBucket: FixedIncomeDurationBucket;
  confidence: FixedIncomeFieldConfidence;
} {
  if (
    /\b(?:ultra[-\s]?short|short[-\s](?:term|duration)|0[\s–-]?1(?:\s*(?:yr|year))?)\b/i.test(
      text,
    )
  ) {
    return { durationBucket: "short", confidence: "inferred" };
  }
  if (/\b(?:long[-\s](?:term|duration)|20\+|30\+)\b/i.test(text)) {
    return { durationBucket: "long", confidence: "inferred" };
  }
  if (/\b(?:intermediate|medium[-\s](?:term|duration))\b/i.test(text)) {
    return { durationBucket: "intermediate", confidence: "inferred" };
  }
  const fromRange = yearRangeDuration(text);
  if (fromRange) {
    return { durationBucket: fromRange, confidence: "inferred" };
  }
  return { durationBucket: "unknown", confidence: "unknown" };
}

/**
 * Classify a holding as fixed income using already-available metadata.
 * Returns NOT_FIXED_INCOME rather than guessing.
 */
export function classifyFixedIncomeHolding(
  input: FixedIncomeHoldingInput,
): FixedIncomeClassification {
  const text = normalizeHaystack(input);
  const detected = detectAssetClass(input, text);
  if (!detected) {
    return NOT_FIXED_INCOME;
  }

  const typeInfo = detectType(text);
  const credit = detectCredit(text, typeInfo.type);
  const duration = detectDuration(text);
  const classificationIncomplete =
    typeInfo.type === "unknown" ||
    credit.confidence === "unknown" ||
    duration.confidence === "unknown";

  return {
    isFixedIncome: true,
    type: typeInfo.type,
    creditQuality: credit.creditQuality,
    durationBucket: duration.durationBucket,
    sovereignTreasury: typeInfo.sovereignTreasury,
    emergingMarketDebt: EMERGING.test(text),
    floatingRate: FLOATING.test(text),
    classificationIncomplete,
    confidence: {
      assetClass: detected.confidence,
      type: typeInfo.confidence,
      creditQuality: credit.confidence,
      duration: duration.confidence,
    },
    source: detected.source,
    reason: detected.reason,
  };
}

export function isFixedIncomeHolding(input: FixedIncomeHoldingInput): boolean {
  return classifyFixedIncomeHolding(input).isFixedIncome;
}
