/**
 * Four Questions — shared view types for Dashboard orchestration.
 */

import type { IntelligenceScopeId } from "@/lib/services/intelligenceScope";

/**
 * Presentation depth for Four Questions intelligence.
 * Phase 6A always uses `complete`. `free` is reserved for a later
 * entitlement slice — do not gate access here.
 */
export type FourQuestionsIntelligenceDepth = "free" | "complete";

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
  /** Optional measurable evidence bullets for trace layers. */
  bullets?: string[];
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
  /** Defaults to complete until Free/Complete entitlements ship. */
  intelligenceDepth: FourQuestionsIntelligenceDepth;
  questions: FourQuestionAnswer[];
};

/**
 * Visual identity tokens per question.
 * Soft `panel` stays for Dashboard/Analysis cards.
 * Richer hub and nav tokens power authenticated hub chrome.
 */
export const FOUR_QUESTION_VISUAL: Record<
  FourQuestionId,
  {
    panel: string;
    number: string;
    eyebrow: string;
    hover: string;
    ring: string;
    /** Dark-surface accent for public previews. */
    onDark: string;
    /** Compact nav — inactive (still colored). */
    navIdle: string;
    navNumberIdle: string;
    navLabelIdle: string;
    /** Compact nav — active (rich). */
    navActive: string;
    navNumberActive: string;
    navLabelActive: string;
    /** Hub page wash behind content. */
    hubPageWash: string;
    /** Strong colored hero surface. */
    hubHero: string;
    /** Answer focal card. */
    hubAnswer: string;
    hubAnswerEyebrow: string;
    /** Soft alternating section tint. */
    hubTintSection: string;
    hubAccentText: string;
    hubAccentIcon: string;
    hubRowHover: string;
    hubDot: string;
  }
> = {
  what_happened: {
    panel:
      "border-cyan-200/55 bg-gradient-to-br from-cyan-50/70 via-white to-white",
    number: "text-cyan-700/75",
    eyebrow: "text-cyan-900/55",
    hover: "hover:bg-cyan-50/50",
    ring: "focus-visible:ring-cyan-400/40",
    onDark: "text-cyan-300",
    navIdle:
      "border-cyan-300/80 bg-gradient-to-br from-cyan-100/95 to-cyan-50/90",
    navNumberIdle: "text-cyan-700",
    navLabelIdle: "text-cyan-950/85",
    navActive:
      "border-cyan-400 bg-gradient-to-br from-cyan-600 via-cyan-500 to-sky-500 shadow-md shadow-cyan-900/20 ring-1 ring-inset ring-white/25",
    navNumberActive: "text-cyan-50",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-cyan-100/70 via-[#f4f8fb] to-[#eef2f6]",
    hubHero:
      "bg-gradient-to-br from-[#0b4f6c] via-[#0e7490] to-[#38bdf8] text-white shadow-lg shadow-cyan-900/25",
    hubAnswer:
      "border border-cyan-300/70 bg-gradient-to-br from-cyan-100 via-white to-sky-50 shadow-md shadow-cyan-900/10 border-l-[5px] border-l-cyan-600",
    hubAnswerEyebrow: "text-cyan-800",
    hubTintSection:
      "border border-cyan-200/70 bg-gradient-to-br from-cyan-50/90 via-white to-white",
    hubAccentText: "text-cyan-800",
    hubAccentIcon: "text-cyan-600",
    hubRowHover: "hover:bg-cyan-50/90",
    hubDot: "bg-cyan-500",
  },
  what_matters_now: {
    panel:
      "border-violet-200/55 bg-gradient-to-br from-violet-50/65 via-white to-white",
    number: "text-violet-700/75",
    eyebrow: "text-violet-900/55",
    hover: "hover:bg-violet-50/45",
    ring: "focus-visible:ring-violet-400/40",
    onDark: "text-violet-300",
    navIdle:
      "border-violet-300/80 bg-gradient-to-br from-violet-100/95 to-violet-50/90",
    navNumberIdle: "text-violet-700",
    navLabelIdle: "text-violet-950/85",
    navActive:
      "border-violet-400 bg-gradient-to-br from-violet-700 via-violet-600 to-fuchsia-500 shadow-md shadow-violet-900/20 ring-1 ring-inset ring-white/25",
    navNumberActive: "text-violet-100",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-violet-100/70 via-[#f6f4fb] to-[#eef2f6]",
    hubHero:
      "bg-gradient-to-br from-[#3b0764] via-[#6d28d9] to-[#a78bfa] text-white shadow-lg shadow-violet-900/25",
    hubAnswer:
      "border border-violet-300/70 bg-gradient-to-br from-violet-100 via-white to-fuchsia-50 shadow-md shadow-violet-900/10 border-l-[5px] border-l-violet-600",
    hubAnswerEyebrow: "text-violet-800",
    hubTintSection:
      "border border-violet-200/70 bg-gradient-to-br from-violet-50/90 via-white to-white",
    hubAccentText: "text-violet-800",
    hubAccentIcon: "text-violet-600",
    hubRowHover: "hover:bg-violet-50/90",
    hubDot: "bg-violet-500",
  },
  am_i_on_track: {
    panel:
      "border-amber-200/55 bg-gradient-to-br from-amber-50/65 via-white to-white",
    number: "text-amber-800/75",
    eyebrow: "text-amber-950/50",
    hover: "hover:bg-amber-50/45",
    ring: "focus-visible:ring-amber-400/40",
    onDark: "text-amber-300",
    navIdle:
      "border-amber-300/80 bg-gradient-to-br from-amber-100/95 to-amber-50/90",
    navNumberIdle: "text-amber-800",
    navLabelIdle: "text-amber-950/85",
    navActive:
      "border-amber-400 bg-gradient-to-br from-amber-600 via-amber-500 to-yellow-400 shadow-md shadow-amber-900/20 ring-1 ring-inset ring-white/30",
    navNumberActive: "text-amber-50",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-amber-100/75 via-[#fbf7f0] to-[#eef2f6]",
    hubHero:
      "bg-gradient-to-br from-[#78350f] via-[#d97706] to-[#fbbf24] text-white shadow-lg shadow-amber-900/25",
    hubAnswer:
      "border border-amber-300/70 bg-gradient-to-br from-amber-100 via-white to-yellow-50 shadow-md shadow-amber-900/10 border-l-[5px] border-l-amber-600",
    hubAnswerEyebrow: "text-amber-900",
    hubTintSection:
      "border border-amber-200/70 bg-gradient-to-br from-amber-50/90 via-white to-white",
    hubAccentText: "text-amber-900",
    hubAccentIcon: "text-amber-700",
    hubRowHover: "hover:bg-amber-50/90",
    hubDot: "bg-amber-500",
  },
  whats_ahead: {
    panel:
      "border-teal-200/55 bg-gradient-to-br from-teal-50/65 via-white to-white",
    number: "text-teal-700/75",
    eyebrow: "text-teal-900/55",
    hover: "hover:bg-teal-50/45",
    ring: "focus-visible:ring-teal-400/40",
    onDark: "text-teal-300",
    navIdle:
      "border-teal-300/80 bg-gradient-to-br from-teal-100/95 to-teal-50/90",
    navNumberIdle: "text-teal-700",
    navLabelIdle: "text-teal-950/85",
    navActive:
      "border-teal-400 bg-gradient-to-br from-teal-700 via-teal-500 to-emerald-400 shadow-md shadow-teal-900/20 ring-1 ring-inset ring-white/25",
    navNumberActive: "text-teal-50",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-teal-100/70 via-[#f0f8f7] to-[#eef2f6]",
    hubHero:
      "bg-gradient-to-br from-[#115e59] via-[#0d9488] to-[#2dd4bf] text-white shadow-lg shadow-teal-900/25",
    hubAnswer:
      "border border-teal-300/70 bg-gradient-to-br from-teal-100 via-white to-emerald-50 shadow-md shadow-teal-900/10 border-l-[5px] border-l-teal-600",
    hubAnswerEyebrow: "text-teal-800",
    hubTintSection:
      "border border-teal-200/70 bg-gradient-to-br from-teal-50/90 via-white to-white",
    hubAccentText: "text-teal-800",
    hubAccentIcon: "text-teal-600",
    hubRowHover: "hover:bg-teal-50/90",
    hubDot: "bg-teal-500",
  },
};
