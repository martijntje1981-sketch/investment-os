/**
 * Conservative passive-income projection — single canonical model for Goals and Dashboard.
 * Uses distribution-policy eligibility + existing dividend quote annual estimates only.
 */

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
  PassiveIncomeEstimateStatus,
  PassiveIncomeHoldingRecord,
  PassiveIncomeProjectionSnapshot,
} from "@/lib/types/dividends";
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

/**
 * Accept only EUR (or missing currency treated as portfolio-base EUR).
 * Non-EUR quotes lack explicit conversion-applied metadata on DividendApiQuote,
 * so their amounts cannot be proven to be portfolio-base EUR.
 */
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

function explanationForRecord(input: {
  estimateStatus: PassiveIncomeEstimateStatus;
  classification: DistributionPolicyClassification;
  holding?: StoredPortfolioHolding;
}): string {
  const { estimateStatus, classification, holding } = input;

  switch (estimateStatus) {
    case "estimated":
      if (classification.isUserConfirmed) {
        return "Included — user-confirmed distributing share class.";
      }
      if (classification.classificationConfidence === "verified") {
        return "Included — verified distributing share class.";
      }
      return "Included — reviewed distributing share class.";
    case "insufficient_data":
      return "Income estimate unavailable — verified policy, but no reliable annual distribution data.";
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

function buildEligibleRecord(input: {
  holding: StoredPortfolioHolding;
  classification: DistributionPolicyClassification;
  quote: DividendApiQuote | null;
}): PassiveIncomeHoldingRecord {
  const { holding, classification, quote } = input;
  const warnings: string[] = [];

  if (!quote) {
    return {
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      distributionPolicy: classification.policy,
      classificationConfidence: classification.classificationConfidence,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "insufficient_data",
      estimatedAnnualCashDistributionEur: null,
      confidenceLabel: confidenceLabelFor(classification),
      explanation: explanationForRecord({
        estimateStatus: "insufficient_data",
        classification,
      }),
      warnings,
      sourceFieldsUsed: [],
      dataUpdatedAt: classification.dataUpdatedAt,
    };
  }

  if (!isSafeEurConversion(quote)) {
    return {
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      distributionPolicy: classification.policy,
      classificationConfidence: classification.classificationConfidence,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "conversion_unavailable",
      estimatedAnnualCashDistributionEur: null,
      confidenceLabel: confidenceLabelFor(classification),
      explanation: explanationForRecord({
        estimateStatus: "conversion_unavailable",
        classification,
      }),
      warnings: ["EUR conversion unavailable for this dividend quote."],
      sourceFieldsUsed: sourceFieldsUsedForQuote(quote),
      dataUpdatedAt: quote.updatedAt ?? classification.dataUpdatedAt,
    };
  }

  const annualEur = quote.estimatedAnnualDividendEur;
  if (!isValidAnnualEstimate(annualEur)) {
    return {
      holdingId: holding.id,
      symbol: holding.symbol,
      name: holding.name || holding.symbol,
      distributionPolicy: classification.policy,
      classificationConfidence: classification.classificationConfidence,
      eligibility: "eligible",
      eligibilityReason: null,
      estimateStatus: "insufficient_data",
      estimatedAnnualCashDistributionEur: null,
      confidenceLabel: confidenceLabelFor(classification),
      explanation: explanationForRecord({
        estimateStatus: "insufficient_data",
        classification,
      }),
      warnings,
      sourceFieldsUsed: sourceFieldsUsedForQuote(quote),
      dataUpdatedAt: quote.updatedAt ?? classification.dataUpdatedAt,
    };
  }

  return {
    holdingId: holding.id,
    symbol: holding.symbol,
    name: holding.name || holding.symbol,
    distributionPolicy: classification.policy,
    classificationConfidence: classification.classificationConfidence,
    eligibility: "eligible",
    eligibilityReason: null,
    estimateStatus: "estimated",
    estimatedAnnualCashDistributionEur: annualEur,
    confidenceLabel: confidenceLabelFor(classification),
    explanation: explanationForRecord({
      estimateStatus: "estimated",
      classification,
    }),
    warnings: ["Estimate — not guaranteed future cash distributions."],
    sourceFieldsUsed: sourceFieldsUsedForQuote(quote),
    dataUpdatedAt: quote.updatedAt ?? classification.dataUpdatedAt,
  };
}

function buildIneligibleRecord(input: {
  holding: StoredPortfolioHolding;
  classification: DistributionPolicyClassification;
}): PassiveIncomeHoldingRecord {
  const { holding, classification } = input;
  const estimateStatus = estimateStatusForIneligible(classification);

  return {
    holdingId: holding.id,
    symbol: holding.symbol,
    name: holding.name || holding.symbol,
    distributionPolicy: classification.policy,
    classificationConfidence: classification.classificationConfidence,
    eligibility: "ineligible",
    eligibilityReason: passiveIncomeIneligibilityReason(classification),
    estimateStatus,
    estimatedAnnualCashDistributionEur: null,
    confidenceLabel: confidenceLabelFor(classification),
    explanation: explanationForRecord({
      estimateStatus,
      classification,
      holding,
    }),
    warnings: [],
    sourceFieldsUsed: [],
    dataUpdatedAt: classification.dataUpdatedAt,
  };
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
      record.estimateStatus === "estimated" &&
      isValidAnnualEstimate(record.estimatedAnnualCashDistributionEur)
        ? sum + record.estimatedAnnualCashDistributionEur
        : sum,
    0,
  );

  const eligibleHoldingsCount = holdingRecords.filter(
    (record) => record.eligibility === "eligible",
  ).length;
  const contributingHoldingsCount = holdingRecords.filter(
    (record) => record.estimateStatus === "estimated",
  ).length;
  const excludedHoldingsCount = holdingRecords.filter(
    (record) => record.eligibility === "ineligible",
  ).length;
  const awaitingDataHoldingsCount = holdingRecords.filter(
    (record) =>
      record.eligibility === "eligible" && record.estimateStatus !== "estimated",
  ).length;

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
