/**
 * Portfolio Evolution thresholds and copy.
 * Conservative. Not advice. No invented history.
 */

import type { PerformancePeriodId } from "@/lib/client/performance/types";
import { PORTFOLIO_HISTORY_PATH } from "@/lib/navigation/appRoutes";
import type { EvolutionTimeframeId } from "@/lib/services/portfolioEvolution/types";

export const PORTFOLIO_EVOLUTION_HREF = `${PORTFOLIO_HISTORY_PATH}#portfolio-evolution`;

export const EVOLUTION_BUILDING_HEADLINE =
  "Portfolio Evolution is building your history.";

export const EVOLUTION_BUILDING_BODY =
  "Your first meaningful comparison will appear once enough portfolio snapshots are available.";

export const EVOLUTION_METHODOLOGY_NOTE =
  "The value line is current holdings at historical market prices. Recorded contributions and withdrawals are a separate ledger and are not added into that line.";

export const EVOLUTION_DAILY_MIX_BLOCK_REASON =
  "Historical allocation persistence required.";

export const EVOLUTION_SPARSE_MIX_NOTE =
  "Mix checkpoints use stored weekly or monthly snapshots only. Days between captures are not reconstructed.";

export const EVOLUTION_TIMEFRAME_TO_PERIOD: Record<
  EvolutionTimeframeId,
  PerformancePeriodId
> = {
  "30D": "1M",
  "90D": "3M",
  "1Y": "1Y",
  ALL: "ALL",
};

export const EVOLUTION_TIMEFRAME_DAYS: Record<
  EvolutionTimeframeId,
  number | null
> = {
  "30D": 30,
  "90D": 90,
  "1Y": 365,
  ALL: null,
};

export const EVOLUTION_TIMEFRAME_MIN_SPAN_DAYS: Record<
  EvolutionTimeframeId,
  number
> = {
  "30D": 10,
  "90D": 40,
  "1Y": 90,
  ALL: 2,
};

export const EVOLUTION_THRESHOLDS = {
  exposurePp: 3,
  concentrationPp: 2,
  scenarioPp: 2,
  cashPp: 3,
  materialValue: 1,
  cryptoCrossed: 50,
  largestHoldingCrossed: 50,
  cashFloor: 5,
} as const;

export const EVOLUTION_PREFERRED_COMPARISON_DAYS = 90;
export const EVOLUTION_FALLBACK_COMPARISON_DAYS = 30;
