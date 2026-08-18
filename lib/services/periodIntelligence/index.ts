export type {
  PeriodInsightKind,
  PeriodIntelligenceContextItem,
  PeriodIntelligenceKind,
  PeriodIntelligencePeriod,
  PeriodIntelligenceReview,
  PeriodIntelligenceSection,
  PeriodIntelligenceSectionId,
  PeriodReportExploreHrefs,
  PeriodReportHero,
  PeriodReportHeroMetric,
} from "@/lib/services/periodIntelligence/types";

export {
  PERIOD_ADVICE_PATTERNS,
  PERIOD_CAUSAL_PATTERNS,
  PERIOD_COMPLETE_TEASE,
  PERIOD_FIRST_HISTORY_COPY,
  PERIOD_INSIGHT_RANK,
  PERIOD_NO_MATERIAL_CHANGE_COPY,
  PERIOD_SECTION_TITLES,
} from "@/lib/services/periodIntelligence/config";

export {
  buildPeriodIntelligenceReview,
  type BuildPeriodIntelligenceReviewInput,
} from "@/lib/services/periodIntelligence/buildPeriodIntelligenceReview";

export {
  applyPeriodIntelligenceDepth,
  periodIntelligenceExploreLabel,
} from "@/lib/services/periodIntelligence/applyPeriodIntelligenceDepth";

export { selectPeriodPrimaryInsight } from "@/lib/services/periodIntelligence/selectPeriodPrimaryInsight";
export { selectPeriodReviewContext } from "@/lib/services/periodIntelligence/selectPeriodReviewContext";
export { toPersonalReportViewModel } from "@/lib/services/periodIntelligence/reportViewModel";
export type {
  PersonalReportAccent,
  PersonalReportSectionView,
  PersonalReportViewModel,
} from "@/lib/services/periodIntelligence/reportViewModel";
export { periodReportExploreHrefs } from "@/lib/services/periodIntelligence/reportExplore";
export {
  buildArchivedMonthlyPeriodIntelligenceReview,
  canDownloadPeriodReportPdf,
  extractPdfPlainText,
  periodReportFilePeriodId,
  periodReportPdfFilename,
  renderPeriodReportPdf,
  resolvePeriodReportPdfAccess,
} from "@/lib/services/periodIntelligence/pdf";

export {
  buildTrustedMonthlyPeriodReview,
  buildTrustedWeeklyPeriodReview,
  deliverPeriodReviewEmails,
  evaluatePeriodReportEmailDelivery,
  isEligibleForPeriodReportEmail,
  renderPeriodReportEmail,
  toPeriodReportEmailView,
} from "@/lib/services/periodIntelligence/email";
