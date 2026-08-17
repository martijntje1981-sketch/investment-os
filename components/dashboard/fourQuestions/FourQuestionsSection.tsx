"use client";

import { useCallback, useId, useState, type MouseEvent } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronDown } from "lucide-react";

import {
  FOUR_QUESTION_VISUAL,
  type FourQuestionAnswer,
  type FourQuestionExpandItem,
  type FourQuestionId,
  type FourQuestionsBundle,
} from "@/lib/services/fourQuestions";

type FourQuestionsSectionProps = {
  bundle: FourQuestionsBundle;
};

function stopToggle(event: MouseEvent) {
  event.stopPropagation();
}

function ExpandIntelligenceRow({ item }: { item: FourQuestionExpandItem }) {
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
          {item.label}
        </span>
        {item.detail ? (
          <span className="mt-0.5 block text-[13px] leading-snug text-slate-800 sm:text-[14px]">
            {item.detail}
          </span>
        ) : null}
      </span>
      {item.href ? (
        <ArrowUpRight
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
          aria-hidden
        />
      ) : null}
    </>
  );

  const baseClass =
    "flex min-h-11 w-full items-start gap-2 rounded-xl px-2 py-2 text-left";

  if (!item.href) {
    return (
      <div
        className={baseClass}
        data-testid={`four-question-item-${item.id}`}
        data-clickable="false"
      >
        {body}
      </div>
    );
  }

  if (item.hrefExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={`${baseClass} cursor-pointer transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35`}
        data-testid={`four-question-item-${item.id}`}
        data-clickable="true"
        data-external="true"
        aria-label={`${item.label}: ${item.detail ?? ""}. Opens in a new tab.`}
        onClick={stopToggle}
      >
        {body}
      </a>
    );
  }

  return (
    <Link
      href={item.href}
      className={`${baseClass} cursor-pointer transition hover:bg-black/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/35`}
      data-testid={`four-question-item-${item.id}`}
      data-clickable="true"
      aria-label={`${item.label}: ${item.detail ?? ""}`}
      onClick={stopToggle}
    >
      {body}
    </Link>
  );
}

function ExploreLink({
  question,
  compact,
}: {
  question: FourQuestionAnswer;
  compact?: boolean;
}) {
  return (
    <Link
      href={question.explore.href}
      className={`inline-flex items-center justify-end gap-1 font-semibold text-slate-600 underline-offset-2 transition hover:text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 ${
        compact ? "min-h-10 text-[12px]" : "min-h-11 text-[13px]"
      }`}
      data-testid={`four-question-explore-${question.id}`}
      onClick={stopToggle}
    >
      {question.explore.label}
      <span aria-hidden>→</span>
    </Link>
  );
}

function QuestionPanel({
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
  const visual = FOUR_QUESTION_VISUAL[question.id];

  return (
    <article
      className={`min-w-0 overflow-hidden rounded-2xl border ${visual.panel} shadow-[0_1px_2px_rgba(15,23,42,0.03)]`}
      data-testid={`four-question-${question.id}`}
      data-expanded={expanded ? "true" : "false"}
      data-quiet={question.quiet ? "true" : "false"}
      data-scope={question.scope}
      data-visual={question.id}
    >
      <button
        type="button"
        className={`flex w-full min-h-11 items-start gap-3 px-3.5 py-3.5 text-left transition sm:gap-3.5 sm:px-4 sm:py-4 ${visual.hover} focus-visible:outline-none focus-visible:ring-2 ${visual.ring}`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        data-testid={`four-question-toggle-${question.id}`}
      >
        <span
          className={`mt-0.5 w-7 shrink-0 text-[11px] font-semibold tabular-nums tracking-[0.08em] ${visual.number}`}
          aria-hidden
        >
          {question.numberLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span
            id={headingId}
            className={`block text-[11px] font-bold uppercase tracking-[0.14em] ${visual.eyebrow}`}
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

      <div
        id={panelId}
        role="region"
        aria-labelledby={headingId}
        hidden={!expanded}
        className="space-y-3 px-3.5 pb-3.5 sm:px-4 sm:pb-4"
        data-testid={`four-question-expand-${question.id}`}
      >
        {expanded ? (
          <>
            {question.expandItems.length > 0 ? (
              <ul className="space-y-1">
                {question.expandItems.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <ExpandIntelligenceRow item={item} />
                  </li>
                ))}
              </ul>
            ) : null}

            {question.disclosures.map((line) => (
              <p
                key={line}
                className="px-2 text-[11px] leading-relaxed text-slate-500"
              >
                {line}
              </p>
            ))}

            <div className="flex justify-end px-2">
              <ExploreLink question={question} />
            </div>
          </>
        ) : null}
      </div>

      {!expanded ? (
        <div className="flex justify-end px-3.5 pb-3 sm:px-4">
          <ExploreLink question={question} compact />
        </div>
      ) : null}
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
      className="min-w-0 space-y-3"
      data-testid="four-questions"
      data-scope={bundle.scope}
      data-expanded={expandedId ?? "none"}
    >
      <header className="px-1">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand/80">
          Four questions
        </p>
        <h2 className="mt-1 text-[1.15rem] font-bold tracking-[-0.03em] text-slate-950 sm:text-[1.25rem]">
          Understand your portfolio
        </h2>
      </header>

      <div className="space-y-2.5 sm:space-y-3">
        {bundle.questions.map((question) => (
          <QuestionPanel
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
