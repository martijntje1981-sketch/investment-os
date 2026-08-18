"use client";

import Link from "next/link";

import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTextLinkClass,
} from "@/components/layout/appSurface";
import { formatContributionPp } from "@/lib/services/personalIntelligence/attribution";
import {
  CONFIDENCE_LABEL_BY_STATUS,
  NEWS_HUB_NO_CATALYST,
  type HoldingIntelligenceCandidate,
} from "@/lib/services/holdingIntelligence";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import { NEWS_PATH } from "@/lib/navigation/appRoutes";

const STATUS_LABEL: Record<HoldingIntelligenceCandidate["explanationStatus"], string> = {
  supported: "Supported context",
  probable_contextual: "Contextual",
  insufficient_evidence: "Insufficient evidence",
  unavailable: "Unavailable",
};

function signedPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function HoldingMoveContextCard({
  candidate,
  newsLoading = false,
  intelligenceDepth = "complete",
}: {
  candidate: HoldingIntelligenceCandidate | null;
  newsLoading?: boolean;
  intelligenceDepth?: FourQuestionsIntelligenceDepth;
}) {
  if (!candidate) return null;

  const isComplete = intelligenceDepth === "complete";
  const impactLabel =
    candidate.contributionPp == null
      ? "Unavailable"
      : formatContributionPp(candidate.contributionPp);
  const moveLabel =
    candidate.changePercent == null
      ? "Unavailable"
      : signedPercent(candidate.changePercent);
  const confidenceLabel = CONFIDENCE_LABEL_BY_STATUS[candidate.explanationStatus];
  const hasReliableContext =
    candidate.explanationStatus === "supported" ||
    candidate.explanationStatus === "probable_contextual";
  const contextLine = hasReliableContext
    ? candidate.explanationNote
    : candidate.explanationStatus === "insufficient_evidence"
      ? NEWS_HUB_NO_CATALYST
      : candidate.explanationNote;

  return (
    <section
      className="min-w-0 rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="holding-move-context-heading"
      data-testid="holding-move-context"
      data-explanation-status={candidate.explanationStatus}
      data-intelligence-depth={intelligenceDepth}
    >
      <p className={appSectionLabelClass}>Holding intelligence</p>
      <h2
        id="holding-move-context-heading"
        className={`mt-1 ${appSectionTitleClass}`}
      >
        Move, context and portfolio impact
      </h2>
      <p className={`mt-1.5 ${appSectionMetaClass}`}>
        Context is attached only when a holding match exists. Tobailey does not
        invent a cause.
      </p>

      <dl className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="min-w-0">
          <dt className={appSectionLabelClass}>Today’s move</dt>
          <dd className="mt-1 text-[1.125rem] font-semibold tabular-nums text-slate-950">
            {moveLabel}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={appSectionLabelClass}>Portfolio impact</dt>
          <dd className="mt-1 text-[1.125rem] font-semibold tabular-nums text-slate-950">
            {impactLabel}
          </dd>
        </div>
        <div className="min-w-0">
          <dt className={appSectionLabelClass}>
            {isComplete ? "Explanation" : "Context"}
          </dt>
          <dd className="mt-1 text-[15px] font-semibold text-slate-950">
            {isComplete
              ? STATUS_LABEL[candidate.explanationStatus]
              : hasReliableContext
                ? "Related context"
                : "No clear catalyst"}
          </dd>
        </div>
      </dl>

      <p className={`mt-4 ${appSectionBodyClass}`}>{contextLine}</p>

      {isComplete && confidenceLabel ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          Confidence: {confidenceLabel}
          {candidate.matchType === "sector_theme" || candidate.isEtfLike
            ? " · Sector context, not a proven cause."
            : candidate.explanationStatus === "supported" ||
                candidate.explanationStatus === "probable_contextual"
              ? " · Related context, not a proven cause."
              : ""}
        </p>
      ) : null}

      {newsLoading && candidate.explanationStatus === "unavailable" ? (
        <p className={`mt-3 ${appSectionMetaClass}`}>
          Checking the shared news pool for a holding match…
        </p>
      ) : null}

      {isComplete && candidate.newsItem && hasReliableContext ? (
        <p className={`mt-3 ${appSectionBodyClass}`}>
          Relevant news:{" "}
          <a
            href={candidate.newsItem.canonicalUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-brand-navy underline-offset-2 hover:underline"
          >
            {candidate.newsItem.title}
          </a>
          <span className={`mt-1 block ${appSectionMetaClass}`}>
            {candidate.newsItem.sourceName}
            {candidate.evidenceTimestamp
              ? ` · ${new Date(candidate.evidenceTimestamp).toLocaleString("en-GB")}`
              : ""}
            {` · ${candidate.matchType.replaceAll("_", " ")}`}
          </span>
        </p>
      ) : null}

      <Link href={NEWS_PATH} className={`mt-4 ${appTextLinkClass}`}>
        Open News
      </Link>
    </section>
  );
}
