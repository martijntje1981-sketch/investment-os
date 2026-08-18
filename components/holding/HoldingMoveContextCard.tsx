"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

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
  type HoldingPageNewsItem,
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

function formatNewsTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function HoldingMoveContextCard({
  candidate,
  relatedNews,
  newsLoading = false,
  intelligenceDepth = "complete",
}: {
  candidate: HoldingIntelligenceCandidate | null;
  relatedNews?: HoldingPageNewsItem[];
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
    : NEWS_HUB_NO_CATALYST;
  const newsItems = relatedNews ?? [];
  const isSectorContext =
    candidate.matchType === "sector_theme" ||
    (candidate.isEtfLike && candidate.matchType !== "direct_instrument");

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
          <dt className={appSectionLabelClass}>Confidence</dt>
          <dd className="mt-1 text-[15px] font-semibold text-slate-950">
            {isComplete && confidenceLabel
              ? confidenceLabel
              : hasReliableContext
                ? "Related context"
                : "No clear catalyst"}
          </dd>
        </div>
      </dl>

      <p className={`mt-4 ${appSectionBodyClass}`}>{contextLine}</p>

      {isComplete && hasReliableContext ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          {STATUS_LABEL[candidate.explanationStatus]}
          {isSectorContext
            ? " · Sector context, not a proven cause."
            : " · Related context, not a proven cause."}
        </p>
      ) : null}

      {newsLoading && newsItems.length === 0 ? (
        <p className={`mt-3 ${appSectionMetaClass}`}>
          Checking the shared news pool for a holding match…
        </p>
      ) : (
        <div className="mt-4 min-w-0" data-testid="holding-page-news">
          <p className={appSectionLabelClass}>Latest relevant news</p>
          {newsItems.length > 0 ? (
            <ul className="mt-2 space-y-2.5">
              {newsItems.map((row) => {
                const published = formatNewsTime(
                  row.item.publishedAt || candidate.evidenceTimestamp,
                );
                return (
                  <li
                    key={row.item.id}
                    data-testid="holding-page-news-item"
                    data-match-role={row.matchRole}
                  >
                    {row.matchRole === "sector_context" ? (
                      <p className={appSectionMetaClass}>Sector context</p>
                    ) : null}
                    <a
                      href={row.item.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${appSectionBodyClass} font-semibold text-brand-navy underline-offset-2 hover:underline`}
                    >
                      {row.item.title}
                      <ArrowUpRight
                        className="ml-1 inline h-3.5 w-3.5 align-text-top"
                        aria-hidden
                      />
                    </a>
                    <p className={`mt-0.5 ${appSectionMetaClass}`}>
                      {row.item.sourceName}
                      {published ? ` · ${published}` : ""}
                      {row.matchRole === "sector_context"
                        ? " · Sector context, not a proven cause."
                        : " · Related context, not a proven cause."}
                    </p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p
              className={`mt-1 ${appSectionBodyClass}`}
              data-testid="holding-page-news-empty"
            >
              {NEWS_HUB_NO_CATALYST}
            </p>
          )}
        </div>
      )}

      <Link href={NEWS_PATH} className={`mt-4 ${appTextLinkClass}`}>
        Open News
      </Link>
    </section>
  );
}
