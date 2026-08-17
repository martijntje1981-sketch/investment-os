"use client";

import Link from "next/link";

import {
  ANALYSIS_FOUR_QUESTION_NAV,
  type AnalysisFourQuestionNavItem,
} from "@/lib/services/fourQuestions/analysisSections";

/**
 * Top-of-Analysis jump nav — same four questions as Dashboard.
 * Simple in-page anchors; no complex tab state.
 */
export function AnalysisFourQuestionsNav() {
  return (
    <nav
      aria-label="Four questions"
      className="mt-6"
      data-testid="analysis-four-questions-nav"
    >
      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand/80">
        Explore your portfolio
      </p>
      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {ANALYSIS_FOUR_QUESTION_NAV.map((item) => (
          <li key={item.id}>
            <NavCard item={item} />
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavCard({ item }: { item: AnalysisFourQuestionNavItem }) {
  return (
    <Link
      href={`#${item.sectionId}`}
      className={`block min-h-11 rounded-2xl border px-3.5 py-3 transition focus-visible:outline-none focus-visible:ring-2 ${item.visual.panel} ${item.visual.ring} hover:brightness-[0.99]`}
      data-testid={`analysis-four-nav-${item.id}`}
    >
      <span
        className={`text-[11px] font-semibold tabular-nums tracking-[0.08em] ${item.visual.number}`}
      >
        {item.numberLabel}
      </span>
      <span className="mt-1 block text-[14px] font-semibold tracking-[-0.02em] text-slate-950">
        {item.question}
      </span>
      <span className="mt-0.5 block text-[12px] leading-snug text-slate-600">
        {item.navHint}
      </span>
    </Link>
  );
}
