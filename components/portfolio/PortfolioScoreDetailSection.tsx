/**
 * Compact detail panel for a Portfolio Score (Goals / Analysis destinations).
 */

import Link from "next/link";

import {
  SCORE_TONE_LABEL_CLASS,
  type ScoreBandTone,
} from "@/lib/services/portfolio/scorecard/config";
import type {
  PortfolioScore,
  ScoreContextStatus,
} from "@/lib/services/portfolio/scorecard";
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

const CONTEXT_STATUS_CLASS: Record<ScoreContextStatus, string> = {
  positive: "text-emerald-700",
  neutral: "text-slate-600",
  attention: "text-amber-700",
};

const FACTOR_TONE_DOT: Record<ScoreContextStatus, string> = {
  positive: "bg-emerald-500",
  neutral: "bg-slate-400",
  attention: "bg-amber-500",
};

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
  const context = score.context;

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
                "mt-1 text-[13px] font-semibold",
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

        {context ? (
          <div className="rounded-xl bg-slate-50 px-3 py-3">
            <p className={appSectionLabelClass}>What shapes this score</p>
            <p
              className={cn(
                "mt-1 text-[14px] font-semibold leading-snug text-slate-900",
                context.status
                  ? CONTEXT_STATUS_CLASS[context.status]
                  : undefined,
              )}
            >
              {context.headline}
            </p>
            {context.detail ? (
              <p className={`mt-1 ${appSectionMetaClass}`}>{context.detail}</p>
            ) : null}
            {context.factors && context.factors.length > 0 ? (
              <ul className="mt-2 space-y-1.5">
                {context.factors.slice(0, 3).map((factor) => (
                  <li
                    key={factor.label}
                    className={`flex items-start gap-2 ${appSectionBodyClass}`}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                        FACTOR_TONE_DOT[factor.tone],
                      )}
                      aria-hidden
                    />
                    <span>{factor.label}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Link
              href={context.href}
              className="mt-3 inline-flex min-h-[44px] items-center text-[15px] font-semibold text-sky-700 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {context.linkLabel}
            </Link>
          </div>
        ) : null}

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
