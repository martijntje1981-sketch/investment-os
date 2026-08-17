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
  /** Trustworthy destination only — omit when none exists. */
  href?: string | null;
  /** True when href is a verified external article URL. */
  hrefExternal?: boolean;
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

/** Restrained visual identity tokens per question (CSS class keys). */
export const FOUR_QUESTION_VISUAL: Record<
  FourQuestionId,
  {
    panel: string;
    number: string;
    eyebrow: string;
    hover: string;
    ring: string;
  }
> = {
  what_happened: {
    panel:
      "border-cyan-200/55 bg-gradient-to-br from-cyan-50/70 via-white to-white",
    number: "text-cyan-700/75",
    eyebrow: "text-cyan-900/55",
    hover: "hover:bg-cyan-50/50",
    ring: "focus-visible:ring-cyan-400/40",
  },
  what_matters_now: {
    panel:
      "border-violet-200/55 bg-gradient-to-br from-violet-50/65 via-white to-white",
    number: "text-violet-700/75",
    eyebrow: "text-violet-900/55",
    hover: "hover:bg-violet-50/45",
    ring: "focus-visible:ring-violet-400/40",
  },
  am_i_on_track: {
    panel:
      "border-amber-200/55 bg-gradient-to-br from-amber-50/65 via-white to-white",
    number: "text-amber-800/75",
    eyebrow: "text-amber-950/50",
    hover: "hover:bg-amber-50/45",
    ring: "focus-visible:ring-amber-400/40",
  },
  whats_ahead: {
    panel:
      "border-teal-200/55 bg-gradient-to-br from-teal-50/65 via-white to-white",
    number: "text-teal-700/75",
    eyebrow: "text-teal-900/55",
    hover: "hover:bg-teal-50/45",
    ring: "focus-visible:ring-teal-400/40",
  },
};
