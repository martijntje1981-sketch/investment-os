import type { DistributionPolicyUserOverride } from "@/lib/types/distributionPolicy";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type InvestmentHoldingMetadata = {
  distributionPolicyUserOverride?: DistributionPolicyUserOverride;
};

function isValidOverride(value: unknown): value is Exclude<DistributionPolicyUserOverride, null> {
  return value === "distributing" || value === "accumulating";
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
): Record<string, unknown> | null {
  const override = holding.distributionPolicyUserOverride ?? null;
  if (override !== "distributing" && override !== "accumulating") {
    return null;
  }

  return {
    distributionPolicyUserOverride: override,
  };
}

export function applyInvestmentMetadataToStoredHolding(
  holding: StoredPortfolioHolding,
  metadata: InvestmentHoldingMetadata,
): StoredPortfolioHolding {
  if (
    metadata.distributionPolicyUserOverride !== "distributing" &&
    metadata.distributionPolicyUserOverride !== "accumulating"
  ) {
    return holding;
  }

  return {
    ...holding,
    distributionPolicyUserOverride: metadata.distributionPolicyUserOverride,
  };
}
