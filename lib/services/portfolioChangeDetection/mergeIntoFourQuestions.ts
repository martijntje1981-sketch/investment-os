/**
 * Attach relevant change signals to existing Four Questions expand items.
 * Does not rewrite glance answers. Skips a question when the signal is not relevant.
 */

import type {
  FourQuestionAnswer,
  FourQuestionsBundle,
} from "@/lib/services/fourQuestions/types";
import type { PortfolioChangeAttention } from "@/lib/services/portfolioChangeDetection/types";

function relevantSignals(
  attention: PortfolioChangeAttention | null | undefined,
): NonNullable<PortfolioChangeAttention["primary"]>[] {
  if (!attention || attention.status !== "attention") return [];
  return [
    ...(attention.primary ? [attention.primary] : []),
    ...attention.secondary,
  ];
}

function alreadyCovered(question: FourQuestionAnswer, signalId: string): boolean {
  return question.expandItems.some(
    (item) => item.id === `change-attention-${signalId}`,
  );
}

export function mergePortfolioChangeIntoFourQuestions(
  bundle: FourQuestionsBundle,
  attention: PortfolioChangeAttention | null | undefined,
): FourQuestionsBundle {
  const signals = relevantSignals(attention);
  if (signals.length === 0) return bundle;

  return {
    ...bundle,
    questions: bundle.questions.map((question) => {
      const additions = signals.filter(
        (signal) =>
          signal.fourQuestionId === question.id &&
          !alreadyCovered(question, signal.id),
      );
      if (additions.length === 0) return question;
      return {
        ...question,
        expandItems: [
          ...additions.map((signal) => ({
            id: `change-attention-${signal.id}`,
            label: "New & Notable",
            detail: signal.title,
            bullets: [signal.whyItMatters, signal.evidence.howCalculated],
            href: signal.destination.href,
            emphasis: "high" as const,
          })),
          ...question.expandItems,
        ],
      };
    }),
  };
}
