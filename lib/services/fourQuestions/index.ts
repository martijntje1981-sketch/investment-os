export type {
  FourQuestionAnswer,
  FourQuestionExpandItem,
  FourQuestionExploreLink,
  FourQuestionId,
  FourQuestionsBundle,
  FourQuestionsIntelligenceDepth,
} from "./types";
export { FOUR_QUESTION_VISUAL } from "./types";
export {
  ANALYSIS_FOUR_QUESTION_NAV,
  ANALYSIS_FOUR_QUESTION_SECTION_IDS,
} from "./analysisSections";
export type {
  AnalysisFourQuestionNavItem,
  AnalysisFourQuestionSectionId,
} from "./analysisSections";
export {
  FOUR_QUESTIONS,
  FOUR_QUESTION_HUB_PATHS,
  WHAT_HAPPENED_HUB_PATH,
  WHAT_MATTERS_HUB_PATH,
  ON_TRACK_HUB_PATH,
  WHATS_AHEAD_HUB_PATH,
  getFourQuestionDefinition,
  fourQuestionHubPath,
  resolveFourQuestionsPagePlacement,
} from "./catalog";
export type {
  FourQuestionDefinition,
  FourQuestionsPagePlacement,
} from "./catalog";

export { buildFourQuestions } from "./buildFourQuestions";
export type { BuildFourQuestionsInput } from "./buildFourQuestions";
export {
  briefingThemesOverlap,
  evaluateBriefingSelection,
  informationValueScore,
  selectForwardScenario,
  selectWhatMattersAttention,
  themeKeyForHolding,
  themeKeyForScenarioId,
  themeKeyForSymbol,
  usedThemeKeysInclude,
} from "./briefingSelection";
export type {
  BriefingAttentionPick,
  BriefingInsightAngle,
  BriefingInsightCandidate,
  BriefingRejection,
  BriefingSelectionTrace,
} from "./briefingSelection";
export {
  applyFourQuestionsIntelligenceDepth,
  applyFourQuestionsProductAccess,
} from "./applyIntelligenceDepth";
export { buildWhatHappenedQuestion } from "./buildWhatHappened";
export { buildWhatMattersNowQuestion } from "./buildWhatMattersNow";
export {
  buildAmIOnTrackQuestion,
  formatOnTrackSupportLine,
  isMeaningfulRecentPace,
} from "./buildAmIOnTrack";
export { buildWhatsAheadQuestion } from "./buildWhatsAhead";
