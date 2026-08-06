export type {
  CompanionBundle,
  CompanionDeepLink,
  CompanionFocus,
  CompanionMilestone,
  CompanionPeriod,
  CompanionPeriodKind,
  CompanionReview,
  CompanionReviewFact,
} from "@/lib/services/portfolio/companion/types";

export {
  buildCompanionBundle,
  buildCompanionReview,
  resolveCompanionDashboardTeaser,
  type CompanionBuildInput,
} from "@/lib/services/portfolio/companion/buildCompanionReview";

export { resolveCompanionPeriodWindow } from "@/lib/services/portfolio/companion/periodWindows";
export {
  resolveCompanionReadiness,
  resolveDefaultCompanionPeriod,
} from "@/lib/services/portfolio/companion/readiness";
export { detectCompanionMilestone } from "@/lib/services/portfolio/companion/milestones";
export {
  estimatePeriodInvestmentReturn,
  filterSeriesToRange,
  sumDividendAmountInRange,
  sumFlowsInRange,
} from "@/lib/services/portfolio/companion/flows";
export {
  defaultCompanionMoneyFormatter,
  formatSignedMoney,
  formatSignedPercent,
} from "@/lib/services/portfolio/companion/format";
