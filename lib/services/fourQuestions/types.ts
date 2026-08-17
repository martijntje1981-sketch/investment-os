/**
 * Four Questions — shared view types for Dashboard orchestration.
 */

import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";

export type FourQuestionId =
  | "what_happened"
  | "what_matters_now"
  | "am_i_on_track"
  | "whats_ahead";

export type FourQuestionExploreLink = {
  label: string;
  href: string;
};

export type FourQuestionExpandItem = {
  id: string;
  label: string;
  detail?: string | null;
};

export type FourQuestionAnswer = {
  id: FourQuestionId;
  numberLabel: "01" | "02" | "03" | "04";
  question: string;
  /** Strong one-line answer (glance). */
  answer: string;
  /** Optional single supporting sentence/value. */
  support: string | null;
  expandItems: FourQuestionExpandItem[];
  /** Methodology / disclaimer lines when needed. */
  disclosures: string[];
  explore: FourQuestionExploreLink;
  /** Quiet / unavailable is a valid answer — not an error. */
  quiet: boolean;
  scope: IntelligenceScopeId;
};

export type FourQuestionsBundle = {
  scope: IntelligenceScopeId;
  questions: FourQuestionAnswer[];
};
