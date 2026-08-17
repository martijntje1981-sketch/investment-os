/**
 * Analysis page Four Questions section contract.
 * Same wording/visual identity as Dashboard; tools stay underneath.
 */

import { FOUR_QUESTION_VISUAL, type FourQuestionId } from "@/lib/services/fourQuestions/types";

export const ANALYSIS_FOUR_QUESTION_SECTION_IDS = {
  what_happened: "what-happened",
  what_matters_now: "what-matters",
  am_i_on_track: "on-track",
  whats_ahead: "whats-ahead",
} as const;

export type AnalysisFourQuestionSectionId =
  (typeof ANALYSIS_FOUR_QUESTION_SECTION_IDS)[keyof typeof ANALYSIS_FOUR_QUESTION_SECTION_IDS];

export type AnalysisFourQuestionNavItem = {
  id: FourQuestionId;
  sectionId: AnalysisFourQuestionSectionId;
  numberLabel: "01" | "02" | "03" | "04";
  question: string;
  /** One-line nav hint under the question. */
  navHint: string;
  /** Short section intro. */
  intro: string;
  visual: (typeof FOUR_QUESTION_VISUAL)[FourQuestionId];
};

export const ANALYSIS_FOUR_QUESTION_NAV: readonly AnalysisFourQuestionNavItem[] =
  [
    {
      id: "what_happened",
      sectionId: ANALYSIS_FOUR_QUESTION_SECTION_IDS.what_happened,
      numberLabel: "01",
      question: "What happened?",
      navHint: "Performance & attribution",
      intro:
        "See what moved your portfolio and which holdings drove the result.",
      visual: FOUR_QUESTION_VISUAL.what_happened,
    },
    {
      id: "what_matters_now",
      sectionId: ANALYSIS_FOUR_QUESTION_SECTION_IDS.what_matters_now,
      numberLabel: "02",
      question: "What matters now?",
      navHint: "Exposure & intelligence",
      intro: "Understand structure and what deserves attention today.",
      visual: FOUR_QUESTION_VISUAL.what_matters_now,
    },
    {
      id: "am_i_on_track",
      sectionId: ANALYSIS_FOUR_QUESTION_SECTION_IDS.am_i_on_track,
      numberLabel: "03",
      question: "Am I on track?",
      navHint: "Goals & progress",
      intro: "Check progress against your plan — full goal editing stays on Goals.",
      visual: FOUR_QUESTION_VISUAL.am_i_on_track,
    },
    {
      id: "whats_ahead",
      sectionId: ANALYSIS_FOUR_QUESTION_SECTION_IDS.whats_ahead,
      numberLabel: "04",
      question: "What’s ahead?",
      navHint: "Scenarios & resilience",
      intro:
        "See where your portfolio is sensitive — models, not predictions.",
      visual: FOUR_QUESTION_VISUAL.whats_ahead,
    },
  ] as const;
