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
  type FourQuestionsIntelligenceDepth,
} from "@/lib/services/fourQuestions";
import {
  appFourQuestionAnswerClass,
  appFourQuestionLabelClass,
  appFourQuestionSupportClass,
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";

type FourQuestionsSectionProps = {
  bundle: FourQuestionsBundle;
  /**
   * Overrides bundle depth when set. Defaults to complete.
   * Reserved for Free/Complete presentation — does not gate access in 6A.
   */
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
};

function stopToggle(event: MouseEvent) {
  event.stopPropagation();
}

function ExpandIntelligenceRow({
  item,
  questionId,
}: {
  item: FourQuestionExpandItem;
  questionId: FourQuestionId;
}) {
  const visual = FOUR_QUESTION_VISUAL[questionId];
  const emphasis = item.emphasis ?? (item.id === "complete-preview" ? "high" : "supporting");
  const isComplete = item.id === "complete-preview";
  const surface = isComplete
    ? visual.completeTease
    : emphasis === "high"
      ? visual.expandHigh
      : emphasis === "low"
        ? visual.expandLow
        : visual.expandSupporting;
  const labelClass = isComplete
    ? "text-white/80"
    : emphasis === "high"
      ? visual.expandLabel
      : "text-slate-500";
  const detailClass = isComplete
    ? "text-white"
    : emphasis === "low"
      ? "text-slate-600"
      : "text-slate-800";
  const bulletClass = isComplete ? "text-white/90" : "text-slate-700";
  const iconClass = isComplete ? "text-white/90" : visual.hubAccentIcon;

  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span
          className={`${appSectionLabelClass} ${labelClass}`}
        >
          {item.label}
        </span>
        {item.detail ? (
          <span
            className={`mt-0.5 block text-[15px] leading-relaxed sm:text-[16px] ${detailClass}`}
          >
            {item.detail}
          </span>
        ) : null}
        {item.bullets && item.bullets.length > 0 ? (
          <ul className={`mt-2 space-y-0.5 pl-4 text-[15px] leading-relaxed ${bulletClass}`}>
            {item.bullets.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </span>
      {item.href ? (
        <ArrowUpRight
          className={`mt-0.5 h-4 w-4 shrink-0 ${iconClass}`}
          aria-hidden
        />
      ) : null}
    </>
  );

  const baseClass = `flex min-h-11 w-full items-start gap-2 rounded-xl px-3 py-3 text-left ${surface}`;

  if (!item.href) {
    return (
      <div
        className={baseClass}
        data-testid={`four-question-item-${item.id}`}
        data-clickable="false"
        data-emphasis={emphasis}
      >
        {body}
      </div>
    );
  }

  const clickableClass = `${baseClass} cursor-pointer transition ${
    isComplete ? "hover:brightness-110" : visual.expandClickable
  } focus-visible:outline-none focus-visible:ring-2 ${visual.ring}`;

  if (item.hrefExternal) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={clickableClass}
        data-testid={`four-question-item-${item.id}`}
        data-clickable="true"
        data-external="true"
        data-emphasis={emphasis}
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
      className={clickableClass}
      data-testid={`four-question-item-${item.id}`}
      data-clickable="true"
      data-emphasis={emphasis}
      aria-label={`${item.label}: ${item.detail ?? ""}`}
      onClick={stopToggle}
    >
      {body}
    </Link>
  );
}

function ExploreLink({
  question,
}: {
  question: FourQuestionAnswer;
}) {
  const visual = FOUR_QUESTION_VISUAL[question.id];
  return (
    <Link
      href={question.explore.href}
      className={`inline-flex min-h-11 w-full items-center justify-between gap-1.5 rounded-xl px-3 py-2.5 text-[15px] font-semibold ${visual.completeTease} transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 ${visual.ring}`}
      data-testid={`four-question-explore-${question.id}`}
      onClick={stopToggle}
    >
      <span>{question.explore.label}</span>
      <span aria-hidden>→</span>
    </Link>
  );
}

function QuestionPanel({
  question,
  expanded,
  onToggle,
  isLast,
}: {
  question: FourQuestionAnswer;
  expanded: boolean;
  onToggle: () => void;
  isLast: boolean;
}) {
  const panelId = useId();
  const headingId = useId();
  const visual = FOUR_QUESTION_VISUAL[question.id];

  return (
    <article
      className={`min-w-0 ${isLast ? "" : "border-b border-slate-200/80"}`}
      data-testid={`four-question-${question.id}`}
      data-expanded={expanded ? "true" : "false"}
      data-quiet={question.quiet ? "true" : "false"}
      data-scope={question.scope}
      data-visual={question.id}
    >
      <button
        type="button"
        className={`flex w-full min-h-12 items-start gap-3 px-4 py-3.5 text-left transition sm:gap-4 sm:px-5 sm:py-4 ${visual.hover} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset ${visual.ring}`}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        data-testid={`four-question-toggle-${question.id}`}
      >
        <span
          className={`mt-1 w-8 shrink-0 text-[13px] font-semibold tabular-nums tracking-[0.06em] ${visual.number}`}
          aria-hidden
        >
          {question.numberLabel}
        </span>
        <span className="min-w-0 flex-1">
          <span
            id={headingId}
            className={appFourQuestionLabelClass}
          >
            {question.question}
          </span>
          <span
            className={`${appFourQuestionAnswerClass} ${
              question.quiet ? "text-slate-600" : "text-slate-950"
            }`}
          >
            {question.answer}
          </span>
          {question.support ? (
            <span className={appFourQuestionSupportClass}>
              {question.support}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={`mt-1.5 h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${
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
        className={`space-y-3 px-4 pb-4 sm:px-5 sm:pb-5 ${expanded ? visual.expandPanel : ""}`}
        data-testid={`four-question-expand-${question.id}`}
      >
        {expanded ? (
          <>
            {question.expandItems.length > 0 ? (
              <ul className="space-y-2 pt-2">
                {question.expandItems.map((item) => (
                  <li key={item.id} className="min-w-0">
                    <ExpandIntelligenceRow item={item} questionId={question.id} />
                  </li>
                ))}
              </ul>
            ) : null}

            {question.disclosures.map((line) => (
              <p
                key={line}
                className={appSectionMetaClass}
              >
                {line}
              </p>
            ))}

            <div className="pt-1">
              <ExploreLink question={question} />
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}

/**
 * Dashboard Four Questions — glance → expand → explore.
 * All four always visible; collapsed by default; one expanded at a time.
 */
export function FourQuestionsSection({
  bundle,
  intelligenceDepth,
}: FourQuestionsSectionProps) {
  const [expandedId, setExpandedId] = useState<FourQuestionId | null>(null);
  const depth: FourQuestionsIntelligenceDepth =
    intelligenceDepth ?? bundle.intelligenceDepth ?? "complete";

  const toggle = useCallback((id: FourQuestionId) => {
    setExpandedId((current) => (current === id ? null : id));
  }, []);

  return (
    <section
      aria-label="Your portfolio in four questions"
      className="min-w-0 space-y-3"
      data-testid="four-questions"
      data-scope={bundle.scope}
      data-intelligence-depth={depth}
      data-expanded={expandedId ?? "none"}
    >
      <header className="px-0.5 sm:px-1">
        <h2 className="text-[1.2rem] font-bold tracking-[-0.035em] text-slate-950 sm:text-[1.35rem]">
          Your portfolio in four questions
        </h2>
      </header>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        data-testid="four-questions-stack"
      >
        {bundle.questions.map((question, index) => (
          <QuestionPanel
            key={question.id}
            question={question}
            expanded={expandedId === question.id}
            onToggle={() => toggle(question.id)}
            isLast={index === bundle.questions.length - 1}
          />
        ))}
      </div>
    </section>
  );
}
