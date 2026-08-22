/**
 * Analysis Four Questions sections — derived from central catalog.
 */

import {
  FOUR_QUESTIONS,
  type FourQuestionDefinition,
} from "@/lib/services/fourQuestions/catalog";

export const ANALYSIS_FOUR_QUESTION_SECTION_IDS = {
  what_happened: "what-happened",
  what_matters_now: "what-matters",
  am_i_on_track: "on-track",
  whats_ahead: "whats-ahead",
} as const;

export type AnalysisFourQuestionSectionId =
  (typeof ANALYSIS_FOUR_QUESTION_SECTION_IDS)[keyof typeof ANALYSIS_FOUR_QUESTION_SECTION_IDS];

export type AnalysisFourQuestionNavItem = {
  id: FourQuestionDefinition["id"];
  sectionId: AnalysisFourQuestionSectionId;
  numberLabel: FourQuestionDefinition["numberLabel"];
  question: string;
  navHint: string;
  intro: string;
  visual: FourQuestionDefinition["visual"];
};

export const ANALYSIS_FOUR_QUESTION_NAV: readonly AnalysisFourQuestionNavItem[] =
  FOUR_QUESTIONS.map((item) => ({
    id: item.id,
    sectionId: item.analysisSectionId,
    numberLabel: item.numberLabel,
    question: item.question,
    navHint: item.navHint,
    intro: item.analysisIntro,
    visual: item.visual,
  }));
