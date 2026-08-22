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

export type FourQuestionExpandEmphasis = "high" | "supporting" | "low";

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
  /** Visual scan weight. Defaults to supporting. */
  emphasis?: FourQuestionExpandEmphasis;
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
 * One Tobailey blue family: Q1 brightest, Q4 deepest navy.
 * Soft `panel` stays for Dashboard/Analysis cards.
 * Richer hub and nav tokens power authenticated hub chrome.
 */
export const FOUR_QUESTION_VISUAL: Record<
  FourQuestionId,
  {
    /** Distinct intelligence-card surface — not a 1px accent. */
    card: string;
    iconWell: string;
    answer: string;
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
    /** Expanded-state wash behind trace rows. */
    expandPanel: string;
    expandHigh: string;
    expandSupporting: string;
    expandLow: string;
    expandClickable: string;
    expandLabel: string;
    completeTease: string;
  }
> = {
  what_happened: {
    card: "overflow-hidden rounded-[24px] border-2 border-q1/60 bg-gradient-to-br from-q1-soft via-q1-soft/70 to-white shadow-[0_12px_32px_-16px_rgba(7,95,140,0.22)]",
    iconWell:
      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-q1-strong text-white shadow-md shadow-q1-deep/25",
    answer: "text-q1-deep",
    panel:
      "border-2 border-q1/60 bg-gradient-to-br from-q1-soft via-q1-soft/70 to-white",
    number: "text-q1-strong",
    eyebrow: "text-q1-deep/75",
    hover: "hover:bg-q1-soft/80",
    ring: "focus-visible:ring-q1/45",
    onDark: "text-q1",
    navIdle:
      "border-q1/40 bg-gradient-to-br from-q1-soft to-white",
    navNumberIdle: "text-q1-strong",
    navLabelIdle: "text-q1-deep",
    navActive:
      "border-q1-strong bg-gradient-to-br from-q1-strong to-q1-deep shadow-md shadow-q1-deep/20 ring-1 ring-inset ring-white/20",
    navNumberActive: "text-white",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-q1-soft/85 via-[#f4f7fb] to-[#eef3f8]",
    hubHero:
      "bg-gradient-to-br from-q1-deep via-q1-strong to-q1 text-white shadow-lg shadow-q1-deep/20",
    hubAnswer:
      "border border-q1/35 bg-gradient-to-br from-q1-soft via-white to-white shadow-md shadow-q1-deep/8 border-l-[5px] border-l-q1-strong",
    hubAnswerEyebrow: "text-q1-strong",
    hubTintSection:
      "border border-q1/25 bg-gradient-to-br from-q1-soft/80 via-white to-white",
    hubAccentText: "text-q1-strong",
    hubAccentIcon: "text-q1-strong",
    hubRowHover: "hover:bg-q1-soft/80",
    hubDot: "bg-q1-strong",
    expandPanel:
      "border-t border-q1/25 bg-gradient-to-b from-q1-soft/70 via-white to-white",
    expandHigh:
      "border border-q1/35 bg-gradient-to-br from-q1-soft via-white to-white border-l-[4px] border-l-q1-strong",
    expandSupporting:
      "border-l-[3px] border-l-q1/70 bg-q1-soft/55",
    expandLow: "border-l-2 border-l-slate-300 bg-slate-50/70",
    expandClickable: "hover:bg-q1-soft hover:shadow-sm",
    expandLabel: "text-q1-strong",
    completeTease:
      "border border-q1-deep/30 bg-gradient-to-r from-q1-deep via-q1-strong to-q1 text-white shadow-sm shadow-q1-deep/20",
  },
  what_matters_now: {
    card: "overflow-hidden rounded-[24px] border-2 border-q2/55 bg-gradient-to-br from-q2-soft via-white to-white shadow-[0_12px_32px_-16px_rgba(20,88,163,0.20)]",
    iconWell:
      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-q2-strong text-white shadow-md shadow-q2-deep/25",
    answer: "text-q2-deep",
    panel:
      "border-2 border-q2/55 bg-gradient-to-br from-q2-soft via-white to-white",
    number: "text-q2-strong",
    eyebrow: "text-q2-deep/75",
    hover: "hover:bg-q2-soft/80",
    ring: "focus-visible:ring-q2/45",
    onDark: "text-q2",
    navIdle:
      "border-q2/40 bg-gradient-to-br from-q2-soft to-white",
    navNumberIdle: "text-q2-strong",
    navLabelIdle: "text-q2-deep",
    navActive:
      "border-q2-strong bg-gradient-to-br from-q2-strong to-q2-deep shadow-md shadow-q2-deep/20 ring-1 ring-inset ring-white/20",
    navNumberActive: "text-white",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-q2-soft/85 via-[#f4f7fb] to-[#eef3f8]",
    hubHero:
      "bg-gradient-to-br from-q2-deep via-q2-strong to-q2 text-white shadow-lg shadow-q2-deep/20",
    hubAnswer:
      "border border-q2/35 bg-gradient-to-br from-q2-soft via-white to-white shadow-md shadow-q2-deep/8 border-l-[5px] border-l-q2-strong",
    hubAnswerEyebrow: "text-q2-strong",
    hubTintSection:
      "border border-q2/25 bg-gradient-to-br from-q2-soft/80 via-white to-white",
    hubAccentText: "text-q2-strong",
    hubAccentIcon: "text-q2-strong",
    hubRowHover: "hover:bg-q2-soft/80",
    hubDot: "bg-q2-strong",
    expandPanel:
      "border-t border-q2/25 bg-gradient-to-b from-q2-soft/70 via-white to-white",
    expandHigh:
      "border border-q2/35 bg-gradient-to-br from-q2-soft via-white to-white border-l-[4px] border-l-q2-strong",
    expandSupporting:
      "border-l-[3px] border-l-q2/70 bg-q2-soft/55",
    expandLow: "border-l-2 border-l-slate-300 bg-slate-50/70",
    expandClickable: "hover:bg-q2-soft hover:shadow-sm",
    expandLabel: "text-q2-strong",
    completeTease:
      "border border-q2-deep/30 bg-gradient-to-r from-q2-deep via-q2-strong to-q2 text-white shadow-sm shadow-q2-deep/20",
  },
  am_i_on_track: {
    card: "overflow-hidden rounded-[24px] border-2 border-q3/50 bg-gradient-to-br from-q3-soft via-white to-white shadow-[0_12px_32px_-16px_rgba(19,58,118,0.20)]",
    iconWell:
      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-q3-strong text-white shadow-md shadow-q3-deep/25",
    answer: "text-q3-deep",
    panel:
      "border-2 border-q3/50 bg-gradient-to-br from-q3-soft via-white to-white",
    number: "text-q3-strong",
    eyebrow: "text-q3-deep/75",
    hover: "hover:bg-q3-soft/80",
    ring: "focus-visible:ring-q3/45",
    onDark: "text-brand",
    navIdle:
      "border-q3/40 bg-gradient-to-br from-q3-soft to-white",
    navNumberIdle: "text-q3-strong",
    navLabelIdle: "text-q3-deep",
    navActive:
      "border-q3-strong bg-gradient-to-br from-q3-strong to-q3-deep shadow-md shadow-q3-deep/20 ring-1 ring-inset ring-white/20",
    navNumberActive: "text-white",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-q3-soft/85 via-[#f4f7fb] to-[#eef3f8]",
    hubHero:
      "bg-gradient-to-br from-q3-deep via-q3-strong to-q3 text-white shadow-lg shadow-q3-deep/20",
    hubAnswer:
      "border border-q3/35 bg-gradient-to-br from-q3-soft via-white to-white shadow-md shadow-q3-deep/8 border-l-[5px] border-l-q3-strong",
    hubAnswerEyebrow: "text-q3-strong",
    hubTintSection:
      "border border-q3/25 bg-gradient-to-br from-q3-soft/80 via-white to-white",
    hubAccentText: "text-q3-strong",
    hubAccentIcon: "text-q3-strong",
    hubRowHover: "hover:bg-q3-soft/80",
    hubDot: "bg-q3-strong",
    expandPanel:
      "border-t border-q3/25 bg-gradient-to-b from-q3-soft/70 via-white to-white",
    expandHigh:
      "border border-q3/35 bg-gradient-to-br from-q3-soft via-white to-white border-l-[4px] border-l-q3-strong",
    expandSupporting:
      "border-l-[3px] border-l-q3/70 bg-q3-soft/55",
    expandLow: "border-l-2 border-l-slate-300 bg-slate-50/70",
    expandClickable: "hover:bg-q3-soft hover:shadow-sm",
    expandLabel: "text-q3-strong",
    completeTease:
      "border border-q3-deep/30 bg-gradient-to-r from-q3-deep via-q3-strong to-q3 text-white shadow-sm shadow-q3-deep/20",
  },
  whats_ahead: {
    card: "overflow-hidden rounded-[24px] border-2 border-q4-strong/45 bg-gradient-to-br from-q4-soft via-white to-white shadow-[0_12px_32px_-16px_rgba(11,31,58,0.18)]",
    iconWell:
      "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-q4-deep text-white shadow-md shadow-q4-deep/25",
    answer: "text-q4-deep",
    panel:
      "border-2 border-q4-strong/45 bg-gradient-to-br from-q4-soft via-white to-white",
    number: "text-q4-strong",
    eyebrow: "text-q4-deep/75",
    hover: "hover:bg-q4-soft/80",
    ring: "focus-visible:ring-q4/45",
    onDark: "text-brand",
    navIdle:
      "border-q4/40 bg-gradient-to-br from-q4-soft to-white",
    navNumberIdle: "text-q4-strong",
    navLabelIdle: "text-q4-deep",
    navActive:
      "border-q4-strong bg-gradient-to-br from-q4-strong to-q4-deep shadow-md shadow-q4-deep/20 ring-1 ring-inset ring-white/15",
    navNumberActive: "text-white",
    navLabelActive: "text-white",
    hubPageWash:
      "bg-gradient-to-b from-q4-soft/85 via-[#f4f7fb] to-[#eef3f8]",
    hubHero:
      "bg-gradient-to-br from-q4-deep via-q4-strong to-q4 text-white shadow-lg shadow-q4-deep/25",
    hubAnswer:
      "border border-q4/35 bg-gradient-to-br from-q4-soft via-white to-white shadow-md shadow-q4-deep/8 border-l-[5px] border-l-q4-strong",
    hubAnswerEyebrow: "text-q4-strong",
    hubTintSection:
      "border border-q4/25 bg-gradient-to-br from-q4-soft/80 via-white to-white",
    hubAccentText: "text-q4-strong",
    hubAccentIcon: "text-q4-strong",
    hubRowHover: "hover:bg-q4-soft/80",
    hubDot: "bg-q4-strong",
    expandPanel:
      "border-t border-q4/25 bg-gradient-to-b from-q4-soft/70 via-white to-white",
    expandHigh:
      "border border-q4/35 bg-gradient-to-br from-q4-soft via-white to-white border-l-[4px] border-l-q4-strong",
    expandSupporting:
      "border-l-[3px] border-l-q4/70 bg-q4-soft/55",
    expandLow: "border-l-2 border-l-slate-300 bg-slate-50/70",
    expandClickable: "hover:bg-q4-soft hover:shadow-sm",
    expandLabel: "text-q4-strong",
    completeTease:
      "border border-q4-deep/30 bg-gradient-to-r from-q4-deep via-q4-strong to-q4 text-white shadow-sm shadow-q4-deep/20",
  },
};
