"use client";

import Link from "next/link";

import {
  SCORE_TONE_LABEL_CLASS,
  SCORE_TONE_RING_CLASS,
  type ScoreBandTone,
} from "@/lib/services/portfolio/scorecard/config";
import type { DynamicPortfolioScore } from "@/lib/services/portfolio/periodScores";

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/**
 * Circular ring for Daily / Weekly dynamic scores (Dashboard Portfolio Pulse).
 * Separate from structural ScoreRing to avoid coupling Scorecard types.
 */
export function DynamicScoreRing({
  score,
  size = 112,
  className,
}: {
  score: DynamicPortfolioScore;
  size?: number;
  className?: string;
}) {
  const stroke = Math.max(7, Math.round(size * 0.08));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill =
    score.available && score.value != null
      ? Math.min(1, Math.max(0, score.value / 100))
      : 0;
  const offset = circumference * (1 - fill);
  const tone: ScoreBandTone = score.band?.tone ?? "balanced";
  const ringClass = score.available
    ? SCORE_TONE_RING_CLASS[tone]
    : "text-slate-300";
  const display =
    score.available && score.value != null ? String(score.value) : "—";
  const title = score.id === "daily" ? "Daily" : "Weekly";
  const status = score.available
    ? (score.band?.label ?? score.summary)
    : (score.unavailableReason ?? "Unavailable");

  const aria = score.available
    ? `${title} Portfolio Score ${score.value} out of 100, ${status}. ${score.summary}`
    : `${title} Portfolio Score unavailable. ${status}`;

  return (
    <Link
      href={score.href}
      className={cn(
        "group flex min-w-0 flex-1 flex-col items-center rounded-2xl px-2 py-3 text-center transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        className,
      )}
      aria-label={aria}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="motion-safe:-rotate-90 motion-reduce:rotate-0"
          role="img"
          aria-hidden
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className="text-slate-200"
            stroke="currentColor"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            className={ringClass}
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[1.65rem] font-bold tabular-nums tracking-[-0.04em] text-slate-950 sm:text-[1.85rem]">
            {display}
          </span>
          {score.available ? (
            <span className="text-[10px] font-semibold text-slate-500">
              /100
            </span>
          ) : null}
        </div>
      </div>
      <p className="mt-2.5 text-[13px] font-bold tracking-[-0.02em] text-slate-950">
        {title}
      </p>
      <p
        className={cn(
          "mt-1 line-clamp-2 min-h-[2.4em] text-[11px] font-semibold leading-snug",
          score.available ? SCORE_TONE_LABEL_CLASS[tone] : "text-slate-500",
        )}
      >
        {status}
      </p>
      <span className="sr-only">
        {score.available
          ? `${title} ${score.value} out of 100. ${status}. ${score.timingContext}`
          : `${title} unavailable. ${status}. ${score.timingContext}`}
      </span>
    </Link>
  );
}
