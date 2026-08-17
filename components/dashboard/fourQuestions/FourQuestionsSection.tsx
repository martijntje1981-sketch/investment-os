"use client";

import { useCallback, useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

import type {
  FourQuestionAnswer,
  FourQuestionId,
  FourQuestionsBundle,
} from "@/lib/services/fourQuestions";

type FourQuestionsSectionProps = {
  bundle: FourQuestionsBundle;
};

function QuestionRow({
  question,
  expanded,
  onToggle,
}: {
  question: FourQuestionAnswer;
  expanded: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();
  const headingId = useId();

  return (
    <article
      className="border-b border-slate-200/80 last:border-b-0"
      data-testid={`four-question-${question.id}`}
      data-expanded={expanded ? "true" : "false"}
      data-quiet={question.quiet ? "true" : "false"}
      data-scope={question.scope}
    >
      <button
        type="button"
        className="flex w-full min-h-11 items-start gap-3 px-1 py-4 text-left transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35 sm:gap-4 sm:py-5"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        data-testid={`four-question-toggle-${question.id}`}
      >
        <span
          className="mt-0.5 w-7 shrink-0 text-[11px] font-semibold tabular-nums tracking-[0.08em] text-brand/80"
          aria-hidden
        >
          {question.numberLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span
            id={headingId}
            className="block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500"
          >
            {question.question}
          </span>
          <span className="mt-1.5 block text-[1.05rem] font-semibold leading-snug tracking-[-0.03em] text-slate-950 sm:text-[1.125rem]">
            {question.answer}
          </span>
          {question.support ? (
            <span className="mt-1 block text-[13px] leading-snug text-slate-600 sm:text-[14px]">
              {question.support}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`mt-1 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
            expanded ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={headingId}
          className="space-y-3 pb-4 pl-10 pr-1 sm:pl-11"
          data-testid={`four-question-expand-${question.id}`}
        >
          {question.expandItems.length > 0 ? (
            <ul className="space-y-2.5">
              {question.expandItems.map((item) => (
                <li key={item.id} className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
                    {item.label}
                  </p>
                  {item.detail ? (
                    <p className="mt-0.5 text-[13px] leading-snug text-slate-800 sm:text-[14px]">
                      {item.detail}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}

          {question.disclosures.map((line) => (
            <p
              key={line}
              className="text-[11px] leading-relaxed text-slate-500"
            >
              {line}
            </p>
          ))}

          <Link
            href={question.explore.href}
            className="inline-flex min-h-11 items-center gap-1.5 text-[13px] font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            data-testid={`four-question-explore-${question.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            {question.explore.label}
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : (
        <div className="pb-3 pl-10 pr-1 sm:pl-11">
          <Link
            href={question.explore.href}
            className="inline-flex min-h-10 items-center gap-1 text-[12px] font-semibold text-brand/90 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            data-testid={`four-question-explore-${question.id}`}
            onClick={(event) => event.stopPropagation()}
          >
            {question.explore.label}
            <span aria-hidden>→</span>
          </Link>
        </div>
      )}
    </article>
  );
}

/**
 * Dashboard Four Questions — glance → expand → explore.
 * All four always visible; collapsed by default; one expanded at a time.
 */
export function FourQuestionsSection({ bundle }: FourQuestionsSectionProps) {
  const [expandedId, setExpandedId] = useState<FourQuestionId | null>(null);

  const toggle = useCallback((id: FourQuestionId) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  return (
    <section
      aria-label="Four questions"
      className="min-w-0 overflow-hidden rounded-[28px] border border-slate-200/80 bg-white px-4 py-2 shadow-[var(--shadow-card)] sm:px-5 md:rounded-[32px] md:px-6"
      data-testid="four-questions"
      data-scope={bundle.scope}
      data-expanded={expandedId ?? "none"}
    >
      <header className="border-b border-slate-100 px-1 pb-3 pt-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand/80">
          Four questions
        </p>
        <h2 className="mt-1 text-[1.15rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.25rem]">
          Understand your portfolio
        </h2>
      </header>

      <div className="divide-y-0">
        {bundle.questions.map((question) => (
          <QuestionRow
            key={question.id}
            question={question}
            expanded={expandedId === question.id}
            onToggle={() => toggle(question.id)}
          />
        ))}
      </div>
    </section>
  );
}
