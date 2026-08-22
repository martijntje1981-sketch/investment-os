/**
 * Select whole-instrument holdings affected by a scenario sleeve.
 * Direct current exposures only — no ETF look-through.
 */

import { getHoldingMarketValue } from "@/lib/client/portfolioAnalysis";
import {
  classifyHoldingExposure,
  EQUITY_EXPOSURE_GROUP_ID_SET,
  isBitcoinHolding,
} from "@/lib/services/classification";
import type { ScenarioShockKind } from "@/lib/services/scenarioEngine/types";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export type ValuedScenarioHolding = {
  holding: StoredPortfolioHolding;
  value: number;
};

export function listValuedHoldings(
  holdings: StoredPortfolioHolding[],
): ValuedScenarioHolding[] {
  const valued: ValuedScenarioHolding[] = [];
  for (const holding of holdings) {
    const value = getHoldingMarketValue(holding);
    if (value === null || !Number.isFinite(value) || value <= 0) {
      continue;
    }
    valued.push({ holding, value });
  }
  return valued;
}

export function isHoldingAffectedByShock(
  holding: StoredPortfolioHolding,
  shockKind: ScenarioShockKind,
): boolean {
  const classification = classifyHoldingExposure(holding);

  switch (shockKind) {
    case "equity_classified":
      return EQUITY_EXPOSURE_GROUP_ID_SET.has(classification.normalizedGroupId);
    case "crypto_classified":
      return classification.normalizedGroupId === "crypto";
    case "bitcoin_direct":
      return (
        classification.normalizedGroupId === "crypto" &&
        isBitcoinHolding(holding)
      );
    default: {
      const _exhaustive: never = shockKind;
      return _exhaustive;
    }
  }
}

/**
 * Affected holdings for one scenario. Each holding is included at most once
 * (whole-instrument), so ETF rows are never also shocked via underlyings.
 */
export function selectAffectedHoldings(
  holdings: StoredPortfolioHolding[],
  shockKind: ScenarioShockKind,
): ValuedScenarioHolding[] {
  return listValuedHoldings(holdings).filter(({ holding }) =>
    isHoldingAffectedByShock(holding, shockKind),
  );
}

export function sumValues(rows: ValuedScenarioHolding[]): number {
  return rows.reduce((sum, row) => sum + row.value, 0);
}
