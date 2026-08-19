"use client";

import type { ReactNode } from "react";

import type { AnalysisFourQuestionNavItem } from "@/lib/services/fourQuestions/analysisSections";
import { appSectionBodyClass } from "@/components/layout/appSurface";

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
        className={`rounded-[24px] px-4 py-4 sm:px-5 sm:py-5 ${item.visual.card}`}
      >
        <div className="flex items-start gap-3">
          <span className={item.visual.iconWell} aria-hidden>
            <span className="text-[13px] font-bold tabular-nums">
              {item.numberLabel}
            </span>
          </span>
          <div className="min-w-0">
            <h2
              id={`${item.sectionId}-heading`}
              className="text-[1.25rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.5rem]"
            >
              {item.question}
            </h2>
            <p className={`mt-1 ${appSectionBodyClass}`}>
              {item.intro}
            </p>
          </div>
        </div>
      </header>
      <div className="space-y-4 md:space-y-5">{children}</div>
    </section>
  );
}
