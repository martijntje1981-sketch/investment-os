/**
 * Centralized attribution period capability model.
 * UI and engine must consume this — do not scatter period assumptions.
 */

import type {
  AttributionCalculationMethod,
  AttributionPeriodCapability,
  AttributionPeriodId,
} from "@/lib/services/performanceAttribution/types";

export const ATTRIBUTION_PERIOD_ORDER: AttributionPeriodId[] = [
  "1D",
  "1W",
  "1M",
  "3M",
  "12M",
];

const CAPABILITIES: Record<AttributionPeriodId, AttributionPeriodCapability> = {
  "1D": {
    period: "1D",
    status: "supported",
    label: "1 day",
    shortLabel: "1D",
    periodSemantics:
      "Previous market close to latest available prices (crypto uses 24h when that is the holding’s move basis). Not an intraday series.",
    calculationMethod: "previous_close_day_move",
    reason: null,
    historyPeriodId: "1D",
  },
  "1W": {
    period: "1W",
    status: "supported",
    label: "1 week",
    shortLabel: "1W",
    periodSemantics:
      "End-of-day price moves with current holdings held constant. Cash flows and trades are not adjusted.",
    calculationMethod: "constant_holdings_eod",
    reason: null,
    historyPeriodId: "1W",
  },
  "1M": {
    period: "1M",
    status: "supported",
    label: "1 month",
    shortLabel: "1M",
    periodSemantics:
      "End-of-day price moves with current holdings held constant. Cash flows and trades are not adjusted.",
    calculationMethod: "constant_holdings_eod",
    reason: null,
    historyPeriodId: "1M",
  },
  "3M": {
    period: "3M",
    status: "unavailable",
    label: "3 months",
    shortLabel: "3M",
    periodSemantics: "Not available until portfolio history supports a 3M window window.",
    calculationMethod: "unavailable",
    reason:
      "Portfolio performance history does not yet expose a verified 3M holding-level window.",
    historyPeriodId: null,
  },
  "12M": {
    period: "12M",
    status: "supported",
    label: "12 months",
    shortLabel: "12M",
    periodSemantics:
      "End-of-day price moves over ~1 year with current holdings held constant. Cash flows and trades are not adjusted.",
    calculationMethod: "constant_holdings_eod",
    reason: null,
    historyPeriodId: "1Y",
  },
};

export function getAttributionPeriodCapability(
  period: AttributionPeriodId,
): AttributionPeriodCapability {
  return CAPABILITIES[period];
}

export function listAttributionPeriodCapabilities(): AttributionPeriodCapability[] {
  return ATTRIBUTION_PERIOD_ORDER.map((period) => CAPABILITIES[period]);
}

export function resolveAttributionCalculationMethod(
  period: AttributionPeriodId,
): AttributionCalculationMethod {
  return CAPABILITIES[period].calculationMethod;
}

/** Map attribution period → existing performance history period for fetches. */
export function attributionPeriodToHistoryPeriod(
  period: AttributionPeriodId,
): "1W" | "1M" | "1Y" | null {
  const history = CAPABILITIES[period].historyPeriodId;
  if (history === "1W" || history === "1M" || history === "1Y") return history;
  return null;
}
