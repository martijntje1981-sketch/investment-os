"use client";

import type { ReactNode } from "react";

import type { AnalysisFourQuestionNavItem } from "@/lib/services/fourQuestions/analysisSections";

type AnalysisQuestionSectionProps = {
  item: AnalysisFourQuestionNavItem;
  children: ReactNode;
};

/**
 * Question band for Analysis — subtle tinted header, tools remain secondary.
 */
export function AnalysisQuestionSection({
  item,
  children,
}: AnalysisQuestionSectionProps) {
  return (
    <section
      id={item.sectionId}
      className="mt-8 scroll-mt-24 space-y-4 md:mt-10 md:space-y-5"
      aria-labelledby={`${item.sectionId}-heading`}
      data-testid={`analysis-question-${item.id}`}
      data-question={item.id}
    >
      <header
        className={`rounded-2xl border px-4 py-3.5 sm:px-5 sm:py-4 ${item.visual.panel}`}
      >
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 w-8 shrink-0 text-[12px] font-semibold tabular-nums tracking-[0.08em] ${item.visual.number}`}
            aria-hidden
          >
            {item.numberLabel}
          </span>
          <div className="min-w-0">
            <h2
              id={`${item.sectionId}-heading`}
              className="text-[1.15rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.25rem]"
            >
              {item.question}
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-slate-600 sm:text-[14px]">
              {item.intro}
            </p>
          </div>
        </div>
      </header>
      <div className="space-y-4 md:space-y-5">{children}</div>
    </section>
  );
}
