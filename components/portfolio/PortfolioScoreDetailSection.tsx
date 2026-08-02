/**
 * Compact detail panel for a Portfolio Score (Goals / Analysis destinations).
 */

import {
  SCORE_TONE_LABEL_CLASS,
  type ScoreBandTone,
} from "@/lib/services/portfolio/scorecard/config";
import type { PortfolioScore } from "@/lib/services/portfolio/scorecard";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function PortfolioScoreDetailSection({
  id,
  score,
  title,
  methodology,
}: {
  id: string;
  score: PortfolioScore;
  title: string;
  methodology: string;
}) {
  const tone: ScoreBandTone = score.band?.tone ?? "balanced";
  const valueLabel =
    score.available && score.value != null ? String(score.value) : "—";

  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className={`scroll-mt-24 ${appDashboardLightCardClass}`}
    >
      <div className={`${appCardPaddingClass} space-y-4`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={appSectionLabelClass}>{title}</p>
            <h2 id={`${id}-heading`} className={`mt-1 ${appSectionTitleClass}`}>
              {score.label} score
            </h2>
            <p className={`mt-1 ${appSectionMetaClass}`}>{score.summary}</p>
          </div>
          <div className="text-right">
            <p
              className={cn(
                "text-3xl font-bold tabular-nums tracking-[-0.04em]",
                score.available
                  ? SCORE_TONE_LABEL_CLASS[tone]
                  : "text-slate-400",
              )}
              aria-label={
                score.available
                  ? `${score.label} ${score.value} out of 100`
                  : `${score.label} unavailable`
              }
            >
              {valueLabel}
              {score.available ? (
                <span className="ml-1 text-sm font-semibold text-slate-500">
                  /100
                </span>
              ) : null}
            </p>
            <p
              className={cn(
                "mt-1 text-[12px] font-semibold",
                score.available
                  ? SCORE_TONE_LABEL_CLASS[tone]
                  : "text-slate-500",
              )}
            >
              {score.available
                ? (score.band?.label ?? score.summary)
                : (score.unavailableReason ?? "Unavailable")}
            </p>
          </div>
        </div>

        {score.evidence.length > 0 ? (
          <ul className="space-y-2">
            {score.evidence.map((item) => (
              <li key={item.id} className={appSectionBodyClass}>
                <span className="font-semibold text-slate-900">
                  {item.label}
                  {item.value != null ? `: ${item.value}` : ""}
                </span>
                <span className="text-slate-600"> — {item.explanation}</span>
              </li>
            ))}
          </ul>
        ) : null}

        {score.attentionPoints.length > 0 ? (
          <div>
            <p className={appSectionLabelClass}>Watch</p>
            <ul className="mt-1 space-y-1">
              {score.attentionPoints.map((point) => (
                <li key={point} className={appSectionBodyClass}>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <details className="rounded-xl bg-slate-50 px-3 py-2">
          <summary className="cursor-pointer text-[13px] font-semibold text-slate-700">
            Methodology
          </summary>
          <p className={`mt-2 ${appSectionMetaClass}`}>{methodology}</p>
          <p className={`mt-2 ${appSectionMetaClass}`}>
            Confidence: {score.confidence.label}. Version {score.version}.
          </p>
        </details>
      </div>
    </section>
  );
}
