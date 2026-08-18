"use client";

import Link from "next/link";

import {
  appFourQuestionSupportClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
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
      <p className={`${appSectionLabelClass} text-brand-navy`}>
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
        className={`text-[13px] font-semibold tabular-nums tracking-[0.08em] ${item.visual.number}`}
      >
        {item.numberLabel}
      </span>
      <span className="mt-1 block text-[15px] font-semibold tracking-[-0.02em] text-slate-950 sm:text-[16px]">
        {item.question}
      </span>
      <span className={`mt-0.5 ${appFourQuestionSupportClass}`}>
        {item.navHint}
      </span>
    </Link>
  );
}
