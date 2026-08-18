/**
 * Email-sized view of PeriodIntelligenceReview.
 * Field mapping only — shorter than PDF, no new intelligence.
 */

import { PERIOD_FIRST_HISTORY_COPY } from "@/lib/services/periodIntelligence/config";
import { toPersonalReportViewModel } from "@/lib/services/periodIntelligence/reportViewModel";
import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";
import {
  periodReportPdfUrl,
  periodReportSettingsUrl,
  periodReportViewUrl,
} from "@/lib/services/periodIntelligence/email/urls";
import { periodReportFilePeriodId } from "@/lib/services/periodIntelligence/pdf/filename";

export type PeriodReportEmailView = {
  kind: PeriodIntelligenceReview["kind"];
  kicker: string;
  brandLine: string;
  periodLabel: string;
  dateRangeLabel: string;
  conclusion: string;
  glance: string[];
  happened: string | null;
  changed: string | null;
  goal: string | null;
  ahead: string | null;
  contextHeadline: string | null;
  contextChannel: string | null;
  reviewUrl: string;
  pdfUrl: string;
  settingsUrl: string;
  subject: string;
  previewText: string;
  trustLine: string;
  firstHistory: boolean;
  noMaterialChange: boolean;
};

function firstLine(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function movementFromMetrics(review: PeriodIntelligenceReview): string | null {
  const movement = review.hero?.metrics.find(
    (row) => row.id === "return" || row.id === "movement",
  );
  return movement?.value ?? null;
}

export function toPeriodReportEmailView(
  review: PeriodIntelligenceReview,
): PeriodReportEmailView {
  const view = toPersonalReportViewModel(review);
  const periodKey = periodReportFilePeriodId(review);
  const glanceLimit = review.kind === "weekly" ? 2 : 3;
  const happened = view.sections.find((row) => row.id === "happened");
  const changed = view.sections.find((row) => row.id === "changed");
  const goal = view.sections.find((row) => row.id === "goal");
  const ahead = view.sections.find((row) => row.id === "ahead");

  let changedLine = firstLine(changed?.headline);
  if (review.firstHistory) {
    changedLine = PERIOD_FIRST_HISTORY_COPY;
  } else {
    const extra = (changed?.evidence ?? [])
      .map((line) => firstLine(line))
      .filter((line): line is string => Boolean(line) && line !== changedLine)
      .slice(0, 1);
    if (extra[0]) {
      changedLine = changedLine ? `${changedLine} ${extra[0]}` : extra[0];
    }
  }

  const movement = movementFromMetrics(review);
  const monthName = review.period.dateRangeLabel.split(" ")[0] ?? "month";
  const subject =
    review.kind === "weekly"
      ? movement
        ? `Your Tobailey week — portfolio ${movement}`
        : "Your Tobailey week in review"
      : changedLine && !review.firstHistory && !review.noMaterialChange
        ? `Your Tobailey ${monthName} review — what changed`
        : `Your Tobailey ${monthName} review`;

  return {
    kind: review.kind,
    kicker: view.kicker,
    brandLine: "Your personal investment review",
    periodLabel: review.period.label,
    dateRangeLabel: view.dateRangeLabel,
    conclusion: view.conclusion,
    glance: view.executiveSummary.slice(0, glanceLimit),
    happened: firstLine(happened?.headline),
    changed: changedLine,
    goal: firstLine(goal?.headline),
    ahead: firstLine(ahead?.headline),
    contextHeadline: view.context?.headline ?? null,
    contextChannel: view.context?.channelLabel ?? null,
    reviewUrl: periodReportViewUrl(review.kind, periodKey),
    pdfUrl: periodReportPdfUrl(review.kind, periodKey),
    settingsUrl: periodReportSettingsUrl(),
    subject,
    previewText: view.conclusion,
    trustLine: view.trustLine,
    firstHistory: review.firstHistory,
    noMaterialChange: review.noMaterialChange,
  };
}
