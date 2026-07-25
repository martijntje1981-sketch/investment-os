/**
 * Passive-income eligibility boundary (Phase 1A — prepared, not connected to Goals).
 */

import type { DistributionPolicyClassification } from "@/lib/types/distributionPolicy";

export function isEligibleForPassiveIncomeEstimation(
  classification: DistributionPolicyClassification,
): boolean {
  if (classification.conflictDetected) {
    return false;
  }

  if (classification.policy !== "distributing") {
    return false;
  }

  return (
    classification.classificationConfidence === "verified" ||
    classification.classificationConfidence === "reviewed" ||
    classification.classificationConfidence === "user_confirmed"
  );
}

export function passiveIncomeIneligibilityReason(
  classification: DistributionPolicyClassification,
): string | null {
  if (isEligibleForPassiveIncomeEstimation(classification)) {
    return null;
  }

  if (classification.conflictDetected) {
    return "Conflicting distribution information — not eligible for passive-income estimation.";
  }

  switch (classification.policy) {
    case "accumulating":
      return "Accumulating/reinvesting instruments contribute no cash passive income.";
    case "unknown":
      return "Unknown distribution policy — no passive-income estimate.";
    case "not_applicable":
      return "Traditional dividend policy does not apply to this instrument.";
    default:
      return "Not eligible for passive-income estimation.";
  }
}
