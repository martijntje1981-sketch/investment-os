/**
 * Current Portfolio Stance from live holdings.
 * Reuses allocation / resilience when the caller already computed them.
 */

import type { PortfolioAnalysisSnapshot } from "@/lib/client/portfolioAnalysis";
import type { PortfolioExposureAllocation } from "@/lib/services/classification";
import { buildPortfolioStanceFromInputs } from "@/lib/services/portfolioStance/buildPortfolioStance";
import { collectStanceInputsFromHoldings } from "@/lib/services/portfolioStance/collectStanceInputs";
import type { PortfolioStance } from "@/lib/services/portfolioStance/types";
import type { ResilienceProfile } from "@/lib/services/resilience";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type BuildPortfolioStanceInput = {
  holdings: StoredPortfolioHolding[];
  allocation?: PortfolioExposureAllocation | null;
  analysis?: PortfolioAnalysisSnapshot | null;
  resilience?: ResilienceProfile | null;
};

export function buildPortfolioStance(
  input: BuildPortfolioStanceInput,
): PortfolioStance {
  if (input.holdings.length === 0) {
    return buildPortfolioStanceFromInputs({
      groupWeights: {},
      unclassifiedWeightPercent: 0,
      largestHoldingWeightPercent: null,
      largestHoldingLabel: null,
      largestHoldingIsStabilizing: true,
      modeledImpactPercent: null,
      modeledScenarioId: null,
      modeledScenarioName: null,
      distinctClassifiedGroupCount: 0,
      portfolioValueAvailable: false,
      sourceQuality: "current",
    });
  }

  return buildPortfolioStanceFromInputs(
    collectStanceInputsFromHoldings(input),
  );
}
