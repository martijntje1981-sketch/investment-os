import type { DistributionPolicyUserOverride } from "@/lib/types/distributionPolicy";
import {
  normalizePassiveIncomeUserEstimate,
  type PassiveIncomeUserEstimate,
} from "@/lib/types/passiveIncomeUserEstimate";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type InvestmentHoldingMetadata = {
  distributionPolicyUserOverride?: DistributionPolicyUserOverride;
  passiveIncomeUserEstimate?: PassiveIncomeUserEstimate | null;
};

function isValidOverride(
  value: unknown,
): value is Exclude<DistributionPolicyUserOverride, null> {
  return (
    value === "distributing" ||
    value === "accumulating" ||
    value === "non_distributing"
  );
}

export function parseInvestmentHoldingMetadata(
  metadata: unknown,
): InvestmentHoldingMetadata | null {
  if (!metadata || typeof metadata !== "object") return null;

  const record = metadata as Record<string, unknown>;
  const parsed: InvestmentHoldingMetadata = {};

  if (isValidOverride(record.distributionPolicyUserOverride)) {
    parsed.distributionPolicyUserOverride = record.distributionPolicyUserOverride;
  }

  if ("passiveIncomeUserEstimate" in record) {
    if (record.passiveIncomeUserEstimate == null) {
      parsed.passiveIncomeUserEstimate = null;
    } else {
      const estimate = normalizePassiveIncomeUserEstimate(
        record.passiveIncomeUserEstimate,
      );
      if (estimate) {
        parsed.passiveIncomeUserEstimate = estimate;
      }
    }
  }

  return parsed;
}

export function buildInvestmentHoldingMetadata(
  holding: StoredPortfolioHolding,
): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  const override = holding.distributionPolicyUserOverride ?? null;

  if (isValidOverride(override)) {
    metadata.distributionPolicyUserOverride = override;
  }

  const estimate = normalizePassiveIncomeUserEstimate(
    holding.passiveIncomeUserEstimate,
  );
  if (estimate) {
    metadata.passiveIncomeUserEstimate = estimate;
  }

  return metadata;
}

export function applyInvestmentMetadataToStoredHolding(
  holding: StoredPortfolioHolding,
  metadata: InvestmentHoldingMetadata,
): StoredPortfolioHolding {
  let next: StoredPortfolioHolding = { ...holding };

  if (isValidOverride(metadata.distributionPolicyUserOverride)) {
    next = {
      ...next,
      distributionPolicyUserOverride: metadata.distributionPolicyUserOverride,
    };
  } else if (holding.distributionPolicyUserOverride != null) {
    next = {
      ...next,
      distributionPolicyUserOverride: undefined,
    };
  }

  if (metadata.passiveIncomeUserEstimate) {
    next = {
      ...next,
      passiveIncomeUserEstimate: metadata.passiveIncomeUserEstimate,
    };
  } else if ("passiveIncomeUserEstimate" in metadata) {
    next = {
      ...next,
      passiveIncomeUserEstimate: undefined,
    };
  }

  return next;
}
