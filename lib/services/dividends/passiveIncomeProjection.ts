/**
 * Conservative passive-income projection — single canonical model for Goals and Dashboard.
 * Hierarchy: reliable provider annual EUR amount, otherwise one valid user estimate.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  classifyDistributionPolicy,
} from "@/lib/services/dividends/classifyDistributionPolicy";
import { findDividendQuoteForHolding } from "@/lib/services/dividends/dividendQuoteLookup";
import {
  isEligibleForPassiveIncomeEstimation,
  passiveIncomeIneligibilityReason,
} from "@/lib/services/dividends/passiveIncomeEligibility";
import type { DistributionPolicyClassification } from "@/lib/types/distributionPolicy";
import type {
  DividendApiQuote,
  PassiveIncomeEstimateSource,
  PassiveIncomeEstimateStatus,
  PassiveIncomeHoldingRecord,
  PassiveIncomeProjectionSnapshot,
} from "@/lib/types/dividends";
import {
  normalizePassiveIncomeUserEstimate,
  type PassiveIncomeUserEstimate,
} from "@/lib/types/passiveIncomeUserEstimate";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type PassiveIncomeGoalProgressState = {
  status:
    | "no-target"
    | "invalid-target"
    | "estimate-unavailable"
    | "no-eligible-holdings"
    | "ready";
  annualTargetEur: number | null;
  eligibleEstimatedAnnualEur: number;
  remainingAnnualEur: number | null;
  rawProgressPercent: number | null;
  fillProgressPercent: number;
  displayProgressPercent: number | null;
  estimatedMonthlyEquivalentEur: number | null;
};

function isValidAnnualEstimate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isSafeEurConversion(quote: DividendApiQuote): boolean {
  const currency = quote.currency?.trim().toUpperCase();
  return !currency || currency === "EUR";
}

function sourceFieldsUsedForQuote(quote: DividendApiQuote): string[] {
  const fields: string[] = [];
  if (quote.forwardAnnualDividendRate != null && quote.forwardAnnualDividendRate > 0) {
    fields.push("forwardAnnualDividendRate");
  }
  if (quote.dividendYield != null && quote.dividendYield > 0) {
    fields.push("dividendYield");
  }
  if (quote.estimatedAnnualDividendEur != null && quote.estimatedAnnualDividendEur > 0) {
    fields.push("estimatedAnnualDividendEur");
  }
  return fields;
}

function confidenceLabelFor(classification: DistributionPolicyClassification): string {
  if (classification.isUserConfirmed) {
    return "User confirmed";
  }
  if (classification.isReviewedOverride) {
    return "Reviewed registry";
  }
  switch (classification.classificationConfidence) {
    case "verified":
      return "Verified evidence";
    case "reviewed":
      return "Reviewed evidence";
    default:
      return "Unverified";
  }
}

function readStoredUserEstimate(
  holding: StoredPortfolioHolding,
): PassiveIncomeUserEstimate | null {
  return normalizePassiveIncomeUserEstimate(holding.passiveIncomeUserEstimate);
}

/**
 * Resolves a stored user estimate to an annual EUR amount.
 * Yield mode uses current market value only — never purchase/invested capital.
 */
export function resolveUserPassiveIncomeAnnualEur(
  holding: StoredPortfolioHolding,
  estimate: PassiveIncomeUserEstimate | null,
): {
  amountEur: number | null;
  status: PassiveIncomeEstimateStatus;
  source: PassiveIncomeEstimateSource;
} {
  if (!estimate) {
    return { amountEur: null, status: "insufficient_data", source: null };
  }

  if (estimate.mode === "annual_cash_amount") {
    return {
      amountEur: estimate.annualCashAmountEur,
      status: "user_estimated",
      source: "user_annual_cash_amount",
    };
  }

  const marketValue = getCurrentMarketValueForYield(holding);
  if (marketValue == null || !(marketValue > 0)) {
    return {
      amountEur: null,
      status: "market_value_unavailable",
      source: "user_annual_yield",
    };
  }

  return {
    amountEur: (marketValue * estimate.annualYieldPercent) / 100,
    status: "user_estimated",
    source: "user_annual_yield",
  };
}

/**
 * Current market value for yield estimates.
 * Reuses the centralized market-value helper, but rejects purchase-price
 * fallbacks so invested capital is never treated as current valuation.
 */
function getCurrentMarketValueForYield(
  holding: StoredPortfolioHolding,
): number | null {
  if (!Number.isFinite(holding.quantity) || holding.quantity < 0) {
    return null;
  }

  const hasCurrentPrice =
    Number.isFinite(holding.currentPrice) && holding.currentPrice > 0;
  const hasCryptoPairPrice =
    holding.assetType === "crypto" &&
    Number.isFinite(holding.currentPairPrice) &&
    (holding.currentPairPrice as number) > 0;

  if (!hasCurrentPrice && !hasCryptoPairPrice) {
    return null;
  }

  return getHoldingMarketValue(holding);
}

function explanationForRecord(input: {
  estimateStatus: PassiveIncomeEstimateStatus;
  classification: DistributionPolicyClassification;
  holding?: StoredPortfolioHolding;
  estimateSource?: PassiveIncomeEstimateSource;
}): string {
  const { estimateStatus, classification, holding, estimateSource } = input;

  switch (estimateStatus) {
    case "estimated":
      if (classification.isUserConfirmed) {
        return "Included — user-confirmed distributing share class.";
      }
      if (classification.classificationConfidence === "verified") {
        return "Included — verified distributing share class.";
      }
      return "Included — reviewed distributing share class.";
    case "user_estimated":
      return estimateSource === "user_annual_yield"
        ? "Included — user estimate (annual yield on current market value)."
        : "Included — user estimate (annual cash amount).";
    case "insufficient_data":
      return "Income estimate unavailable — verified policy, but no reliable annual distribution data.";
    case "market_value_unavailable":
      return "Yield estimate unavailable — current market value is required.";
    case "ineligible_accumulating":
      return "Excluded — income is reinvested internally.";
    case "ineligible_non_distributing":
      return "Excluded — no current cash distributions.";
    case "ineligible_unknown_policy":
      return "Excluded — distribution policy is not verified.";
    case "ineligible_conflict":
      return "Excluded — policy evidence conflicts with your confirmation.";
    case "not_applicable":
      return holding?.assetType === "crypto"
        ? "Not applicable — staking rewards are not included."
        : "Excluded — traditional dividend policy does not apply.";
    case "conversion_unavailable":
      return "Conversion unavailable.";
    default:
      return "Excluded from passive-income estimation.";
  }
}

function estimateStatusForIneligible(
  classification: DistributionPolicyClassification,
): PassiveIncomeEstimateStatus {
  if (classification.conflictDetected) {
    return "ineligible_conflict";
  }

  switch (classification.policy) {
    case "accumulating":
      return "ineligible_accumulating";
    case "non_distributing":
      return "ineligible_non_distributing";
    case "unknown":
      return "ineligible_unknown_policy";
    case "not_applicable":
      return "not_applicable";
    default:
      return "ineligible_unknown_policy";
  }
}

function baseRecordFields(input: {
  holding: StoredPortfolioHolding;
  classification: DistributionPolicyClassification;
  storedUserEstimate: PassiveIncomeUserEstimate | null;
}): Pick<
  PassiveIncomeHoldingRecord,
  | "holdingId"
  | "symbol"
  | "name"
  | "distributionPolicy"
  | "classificationConfidence"
  | "storedUserEstimate"
> {
  return {
    holdingId: input.holding.id,
    symbol: input.holding.symbol,
    name: input.holding.name || input.holding.symbol,
    distributionPolicy: input.classification.policy,
    classificationConfidence: input.classification.classificationConfidence,
    storedUserEstimate: input.storedUserEstimate,
  };
}

function buildEligibleRecord(input: {
  holding: StoredPortfolioHolding;
  classification: DistributionPolicyClassification;
  quote: DividendApiQuote | null;
}): PassiveIncomeHoldingRecord {
  const { holding, classification, quote } = input;
  const storedUserEstimate = readStoredUserEstimate(holding);
  const base = baseRecordFields({ holding, classification, storedUserEstimate });
  const acceptsUserEstimate = true;

  const providerSafe =
    quote != null &&
    isSafeEurConversion(quote) &&
    isValidAnnualEstimate(quote.estimatedAnnualDividendEur);

  if (providerSafe && quote) {
    return {
      ...base,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "estimated",
      estimatedAnnualCashDistributionEur: quote.estimatedAnnualDividendEur,
      estimateSource: "provider",
      confidenceLabel: confidenceLabelFor(classification),
      explanation: explanationForRecord({
        estimateStatus: "estimated",
        classification,
        estimateSource: "provider",
      }),
      warnings: [
        "Estimates are not guaranteed distributions.",
        ...(storedUserEstimate
          ? ["A saved user estimate remains stored but provider data is used."]
          : []),
      ],
      sourceFieldsUsed: sourceFieldsUsedForQuote(quote),
      dataUpdatedAt: quote.updatedAt ?? classification.dataUpdatedAt,
      acceptsUserEstimate: false,
    };
  }

  if (quote && !isSafeEurConversion(quote)) {
    const userResolved = resolveUserPassiveIncomeAnnualEur(
      holding,
      storedUserEstimate,
    );
    if (isValidAnnualEstimate(userResolved.amountEur)) {
      return {
        ...base,
        eligibility: "eligible",
        eligibilityReason: null,
        estimateStatus: "user_estimated",
        estimatedAnnualCashDistributionEur: userResolved.amountEur,
        estimateSource: userResolved.source,
        confidenceLabel: "User estimate",
        explanation: explanationForRecord({
          estimateStatus: "user_estimated",
          classification,
          estimateSource: userResolved.source,
        }),
        warnings: [
          "User estimate — provider conversion unavailable.",
          "Estimates are not guaranteed distributions.",
          "Provider data will take priority when available.",
        ],
        sourceFieldsUsed: ["passiveIncomeUserEstimate"],
        dataUpdatedAt: storedUserEstimate?.updatedAt ?? classification.dataUpdatedAt,
        acceptsUserEstimate,
      };
    }

    return {
      ...base,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "conversion_unavailable",
      estimatedAnnualCashDistributionEur: null,
      estimateSource: null,
      confidenceLabel: confidenceLabelFor(classification),
      explanation: explanationForRecord({
        estimateStatus: "conversion_unavailable",
        classification,
      }),
      warnings: ["EUR conversion unavailable for this dividend quote."],
      sourceFieldsUsed: sourceFieldsUsedForQuote(quote),
      dataUpdatedAt: quote.updatedAt ?? classification.dataUpdatedAt,
      acceptsUserEstimate,
    };
  }

  const userResolved = resolveUserPassiveIncomeAnnualEur(
    holding,
    storedUserEstimate,
  );

  if (isValidAnnualEstimate(userResolved.amountEur)) {
    return {
      ...base,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "user_estimated",
      estimatedAnnualCashDistributionEur: userResolved.amountEur,
      estimateSource: userResolved.source,
      confidenceLabel: "User estimate",
      explanation: explanationForRecord({
        estimateStatus: "user_estimated",
        classification,
        estimateSource: userResolved.source,
      }),
      warnings: [
        "User estimate — not guaranteed distributions.",
        "Provider data will take priority when available.",
        ...(userResolved.source === "user_annual_cash_amount"
          ? [
              "Annual cash amount does not automatically adjust when quantity changes.",
            ]
          : []),
      ],
      sourceFieldsUsed: ["passiveIncomeUserEstimate"],
      dataUpdatedAt: storedUserEstimate?.updatedAt ?? classification.dataUpdatedAt,
      acceptsUserEstimate,
    };
  }

  if (userResolved.status === "market_value_unavailable") {
    return {
      ...base,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "market_value_unavailable",
      estimatedAnnualCashDistributionEur: null,
      estimateSource: "user_annual_yield",
      confidenceLabel: "User estimate",
      explanation: explanationForRecord({
        estimateStatus: "market_value_unavailable",
        classification,
        estimateSource: "user_annual_yield",
      }),
      warnings: ["Current market value is required for an annual yield estimate."],
      sourceFieldsUsed: ["passiveIncomeUserEstimate"],
      dataUpdatedAt: storedUserEstimate?.updatedAt ?? classification.dataUpdatedAt,
      acceptsUserEstimate,
    };
  }

  return {
    ...base,
    eligibility: "eligible",
    eligibilityReason: null,
    estimateStatus: "insufficient_data",
    estimatedAnnualCashDistributionEur: null,
    estimateSource: null,
    confidenceLabel: confidenceLabelFor(classification),
    explanation: explanationForRecord({
      estimateStatus: "insufficient_data",
      classification,
    }),
    warnings: ["Add an optional user estimate when provider data is unavailable."],
    sourceFieldsUsed: quote ? sourceFieldsUsedForQuote(quote) : [],
    dataUpdatedAt: quote?.updatedAt ?? classification.dataUpdatedAt,
    acceptsUserEstimate,
  };
}

function buildIneligibleRecord(input: {
  holding: StoredPortfolioHolding;
  classification: DistributionPolicyClassification;
}): PassiveIncomeHoldingRecord {
  const { holding, classification } = input;
  const estimateStatus = estimateStatusForIneligible(classification);
  const storedUserEstimate = readStoredUserEstimate(holding);

  return {
    ...baseRecordFields({ holding, classification, storedUserEstimate }),
    eligibility: "ineligible",
    eligibilityReason: passiveIncomeIneligibilityReason(classification),
    estimateStatus,
    estimatedAnnualCashDistributionEur: null,
    estimateSource: null,
    confidenceLabel: confidenceLabelFor(classification),
    explanation: explanationForRecord({
      estimateStatus,
      classification,
      holding,
    }),
    warnings: storedUserEstimate
      ? [
          "A saved user estimate is retained but excluded while this holding is ineligible.",
        ]
      : [],
    sourceFieldsUsed: [],
    dataUpdatedAt: classification.dataUpdatedAt,
    acceptsUserEstimate: false,
  };
}

function isContributingStatus(status: PassiveIncomeEstimateStatus): boolean {
  return status === "estimated" || status === "user_estimated";
}

export function buildPassiveIncomeProjection(
  holdings: StoredPortfolioHolding[],
  quotes: DividendApiQuote[],
): PassiveIncomeProjectionSnapshot {
  const investments = holdings.filter((holding) => holding.assetType !== "cash");

  const holdingRecords = investments.map((holding) => {
    const dividendQuote = findDividendQuoteForHolding(holding, quotes);
    const classification = classifyDistributionPolicy({
      holding,
      dividendQuote,
    });

    if (!isEligibleForPassiveIncomeEstimation(classification)) {
      return buildIneligibleRecord({ holding, classification });
    }

    return buildEligibleRecord({ holding, classification, quote: dividendQuote });
  });

  const eligibleEstimatedAnnualCashDistributionEur = holdingRecords.reduce(
    (sum, record) =>
      isContributingStatus(record.estimateStatus) &&
      isValidAnnualEstimate(record.estimatedAnnualCashDistributionEur)
        ? sum + record.estimatedAnnualCashDistributionEur
        : sum,
    0,
  );

  const eligibleHoldingsCount = holdingRecords.filter(
    (record) => record.eligibility === "eligible",
  ).length;
  const contributingHoldingsCount = holdingRecords.filter((record) =>
    isContributingStatus(record.estimateStatus),
  ).length;
  const excludedHoldingsCount = holdingRecords.filter(
    (record) => record.eligibility === "ineligible",
  ).length;
  const awaitingDataHoldingsCount = holdingRecords.filter(
    (record) =>
      record.eligibility === "eligible" &&
      !isContributingStatus(record.estimateStatus),
  ).length;
  const includesUserEstimates = holdingRecords.some(
    (record) => record.estimateStatus === "user_estimated",
  );

  const updatedAt = holdingRecords
    .map((record) => record.dataUpdatedAt)
    .filter(Boolean)
    .sort()
    .at(-1) ?? null;

  return {
    eligibleEstimatedAnnualCashDistributionEur,
    eligibleHoldingsCount,
    contributingHoldingsCount,
    excludedHoldingsCount,
    awaitingDataHoldingsCount,
    hasUsableEstimate: contributingHoldingsCount > 0,
    includesUserEstimates,
    holdingRecords,
    updatedAt,
  };
}

export function buildPassiveIncomeGoalProgressState(input: {
  projection: PassiveIncomeProjectionSnapshot;
  passiveIncomeTargetEur: number | null | undefined;
}): PassiveIncomeGoalProgressState {
  const { projection, passiveIncomeTargetEur } = input;
  const eligibleEstimatedAnnualEur =
    projection.eligibleEstimatedAnnualCashDistributionEur;

  if (
    passiveIncomeTargetEur == null ||
    passiveIncomeTargetEur === undefined ||
    passiveIncomeTargetEur === 0
  ) {
    return {
      status: "no-target",
      annualTargetEur: null,
      eligibleEstimatedAnnualEur,
      remainingAnnualEur: null,
      rawProgressPercent: null,
      fillProgressPercent: 0,
      displayProgressPercent: null,
      estimatedMonthlyEquivalentEur: null,
    };
  }

  if (!Number.isFinite(passiveIncomeTargetEur) || passiveIncomeTargetEur < 0) {
    return {
      status: "invalid-target",
      annualTargetEur: passiveIncomeTargetEur,
      eligibleEstimatedAnnualEur,
      remainingAnnualEur: null,
      rawProgressPercent: null,
      fillProgressPercent: 0,
      displayProgressPercent: null,
      estimatedMonthlyEquivalentEur: null,
    };
  }

  if (!projection.hasUsableEstimate) {
    return {
      status: projection.eligibleHoldingsCount > 0 ? "estimate-unavailable" : "no-eligible-holdings",
      annualTargetEur: passiveIncomeTargetEur,
      eligibleEstimatedAnnualEur: 0,
      remainingAnnualEur: null,
      rawProgressPercent: null,
      fillProgressPercent: 0,
      displayProgressPercent: null,
      estimatedMonthlyEquivalentEur: null,
    };
  }

  const rawProgressPercent =
    (eligibleEstimatedAnnualEur / passiveIncomeTargetEur) * 100;
  const fillProgressPercent = Math.min(Math.max(rawProgressPercent, 0), 100);
  const remainingAnnualEur = Math.max(
    passiveIncomeTargetEur - eligibleEstimatedAnnualEur,
    0,
  );

  return {
    status: "ready",
    annualTargetEur: passiveIncomeTargetEur,
    eligibleEstimatedAnnualEur,
    remainingAnnualEur,
    rawProgressPercent,
    fillProgressPercent,
    displayProgressPercent: Math.max(rawProgressPercent, 0),
    estimatedMonthlyEquivalentEur: eligibleEstimatedAnnualEur / 12,
  };
}
