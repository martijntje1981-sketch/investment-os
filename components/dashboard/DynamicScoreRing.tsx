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
 * Hierarchy: whole-number score → name → band; "/100" stays quiet.
 */
export function DynamicScoreRing({
  score,
  size = 86,
  emphasis = "default",
  appearance = "onLight",
  className,
  onActivate,
}: {
  score: DynamicPortfolioScore;
  size?: number;
  /** Daily gets slightly stronger visual weight than Weekly. */
  emphasis?: "primary" | "default";
  /** Hero uses onDark; standalone pulse card keeps onLight. */
  appearance?: "onLight" | "onDark";
  className?: string;
  /** When set, opens detail instead of navigating immediately. */
  onActivate?: () => void;
}) {
  const stroke = Math.max(5, Math.round(size * 0.082));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fill =
    score.available && score.value != null
      ? Math.min(1, Math.max(0, score.value / 100))
      : 0;
  const offset = circumference * (1 - fill);
  const tone: ScoreBandTone = score.band?.tone ?? "balanced";
  const onDark = appearance === "onDark";
  const ringClass = score.available
    ? SCORE_TONE_RING_CLASS[tone]
    : onDark
      ? "text-white/25"
      : "text-slate-300";
  const display =
    score.available && score.value != null ? String(score.value) : "—";
  const title =
    score.id === "daily"
      ? "Daily"
      : score.id === "weekly"
        ? "Weekly"
        : "Monthly";
  const status = score.available
    ? (score.band?.label ?? score.summary)
    : (score.unavailableReason ?? "Unavailable");
  const isPrimary = emphasis === "primary";
  const compact = size <= 70;

  const aria = score.available
    ? `${title} Portfolio Score ${score.value} out of 100, ${status}. ${score.summary}`
    : `${title} Portfolio Score unavailable. ${status}`;

  const shellClass = cn(
    "group flex min-h-11 min-w-0 flex-1 flex-col items-center rounded-xl px-1 py-1 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    onDark
      ? "hover:bg-white/5 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
      : "hover:bg-slate-50/80",
    className,
  );

  const body = (
    <>
      <div className="relative shrink-0" style={{ width: size, height: size }}>
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
            className={onDark ? "text-white/15" : "text-slate-200"}
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className={cn(
              "tabular-nums tracking-[-0.05em]",
              onDark ? "text-white" : "text-slate-950",
              compact
                ? isPrimary
                  ? "text-[1.1rem] font-extrabold"
                  : "text-[1rem] font-bold"
                : isPrimary
                  ? "text-[1.45rem] font-extrabold sm:text-[1.55rem]"
                  : "text-[1.3rem] font-bold sm:text-[1.4rem]",
            )}
          >
            {display}
          </span>
          {score.available && !compact ? (
            <span
              className={cn(
                "mt-0.5 text-[8px] font-medium",
                onDark ? "text-white/45" : "text-slate-400/90",
              )}
            >
              /100
            </span>
          ) : null}
        </div>
      </div>
      <p
        className={cn(
          "mt-1 tracking-[-0.02em]",
          compact ? "text-[11px] font-semibold" : "mt-1.5",
          onDark
            ? isPrimary
              ? "text-white"
              : "text-white/80"
            : isPrimary
              ? "text-[13px] font-bold text-slate-950"
              : "text-[12px] font-semibold text-slate-700",
          !compact && isPrimary && !onDark && "text-[13px] font-bold",
          !compact && !isPrimary && !onDark && "text-[12px] font-semibold",
        )}
      >
        {title}
      </p>
      {!compact ? (
        <p
          className={cn(
            "mt-0.5 line-clamp-2 max-w-[9.5rem] text-[10px] font-semibold leading-snug sm:max-w-none sm:text-[11px]",
            score.available
              ? onDark
                ? "text-white/55"
                : SCORE_TONE_LABEL_CLASS[tone]
              : onDark
                ? "text-white/40"
                : "text-slate-500",
            !isPrimary && "opacity-90",
          )}
        >
          {status}
        </p>
      ) : (
        <p
          className={cn(
            "mt-0.5 max-w-[4.75rem] truncate text-[9px] font-semibold leading-tight",
            score.available
              ? onDark
                ? "text-white/55"
                : SCORE_TONE_LABEL_CLASS[tone]
              : onDark
                ? "text-white/40"
                : "text-slate-500",
          )}
        >
          {status}
        </p>
      )}
      <span className="sr-only">
        {score.available
          ? `${title} ${score.value} out of 100. ${status}. ${score.timingContext}`
          : `${title} unavailable. ${status}. ${score.timingContext}`}
      </span>
    </>
  );

  if (onActivate) {
    return (
      <button
        type="button"
        className={shellClass}
        aria-label={aria}
        onClick={onActivate}
        data-testid={`pulse-ring-${score.id}`}
      >
        {body}
      </button>
    );
  }

  return (
    <Link href={score.href} className={shellClass} aria-label={aria}>
      {body}
    </Link>
  );
}
