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
  size = 96,
  emphasis = "default",
  className,
}: {
  score: DynamicPortfolioScore;
  size?: number;
  /** Daily gets slightly stronger visual weight than Weekly. */
  emphasis?: "primary" | "default";
  className?: string;
}) {
  const stroke = Math.max(6, Math.round(size * 0.078));
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
  const isPrimary = emphasis === "primary";

  const aria = score.available
    ? `${title} Portfolio Score ${score.value} out of 100, ${status}. ${score.summary}`
    : `${title} Portfolio Score unavailable. ${status}`;

  return (
    <Link
      href={score.href}
      className={cn(
        "group flex min-w-0 flex-1 flex-col items-center rounded-xl px-1.5 py-1.5 text-center transition hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-2 sm:py-2",
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0">
          <span
            className={cn(
              "tabular-nums tracking-[-0.045em] text-slate-950",
              isPrimary
                ? "text-[1.55rem] font-extrabold sm:text-[1.7rem]"
                : "text-[1.4rem] font-bold sm:text-[1.55rem]",
            )}
          >
            {display}
          </span>
          {score.available ? (
            <span
              className={cn(
                "font-medium leading-none text-slate-400",
                isPrimary ? "text-[9px]" : "text-[8px]",
              )}
            >
              /100
            </span>
          ) : null}
        </div>
      </div>
      <p
        className={cn(
          "mt-1.5 tracking-[-0.02em]",
          isPrimary
            ? "text-[13px] font-bold text-slate-950"
            : "text-[12px] font-semibold text-slate-700",
        )}
      >
        {title}
      </p>
      <p
        className={cn(
          "mt-0.5 line-clamp-2 text-[10px] font-semibold leading-snug sm:text-[11px]",
          score.available ? SCORE_TONE_LABEL_CLASS[tone] : "text-slate-500",
          !isPrimary && "opacity-90",
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
