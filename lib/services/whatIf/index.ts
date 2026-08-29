export type {
  WhatIfAccessMode,
  WhatIfComparisonRow,
  WhatIfConfidence,
  WhatIfPathSnapshot,
  WhatIfScenarioInput,
  WhatIfScenarioResult,
  WhatIfScenarioSelection,
  WhatIfStatus,
  WhatIfUnsupportedScenarioId,
} from "@/lib/services/whatIf/types";

export { buildWhatIfScenario } from "@/lib/services/whatIf/buildWhatIfScenario";

export {
  canExploreFullWhatIf,
  resolveWhatIfAccessMode,
} from "@/lib/services/whatIf/access";

export {
  buildContributionWhatIfPresets,
  buildPlanningAssumptionPresets,
  CONTRIBUTION_WHATIF_INCREMENTS_EUR,
  CONTRIBUTION_WHATIF_SLIDER_STEP,
  readSavedMonthlyContribution,
  readSavedPlanningAssumption,
} from "@/lib/services/whatIf/options";

export {
  assertNoWhatIfAdvisoryLanguage,
  FIXED_INCOME_UNAVAILABLE_REASON,
  WHAT_IF_DISCLAIMER,
  WHAT_IF_PROHIBITED_PATTERNS,
} from "@/lib/services/whatIf/wording";
