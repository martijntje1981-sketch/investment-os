import type { DistributionPolicyUserOverride } from "@/lib/types/distributionPolicy";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type InvestmentHoldingMetadata = {
  distributionPolicyUserOverride?: DistributionPolicyUserOverride;
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
  const override = record.distributionPolicyUserOverride;

  if (override == null) {
    return {};
  }

  if (!isValidOverride(override)) {
    return {};
  }

  return {
    distributionPolicyUserOverride: override,
  };
}

export function buildInvestmentHoldingMetadata(
  holding: StoredPortfolioHolding,
): Record<string, unknown> {
  const override = holding.distributionPolicyUserOverride ?? null;
  if (isValidOverride(override)) {
    return {
      distributionPolicyUserOverride: override,
    };
  }

  // Empty object clears a previous override on sync without inventing parallel fields.
  return {};
}

export function applyInvestmentMetadataToStoredHolding(
  holding: StoredPortfolioHolding,
  metadata: InvestmentHoldingMetadata,
): StoredPortfolioHolding {
  if (isValidOverride(metadata.distributionPolicyUserOverride)) {
    return {
      ...holding,
      distributionPolicyUserOverride: metadata.distributionPolicyUserOverride,
    };
  }

  if (holding.distributionPolicyUserOverride == null) {
    return holding;
  }

  return {
    ...holding,
    distributionPolicyUserOverride: undefined,
  };
}
