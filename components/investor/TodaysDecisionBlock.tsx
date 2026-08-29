import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";

import type { TodaysDecisionResult } from "@/lib/client/todaysDecision";
import { isValidArticleUrl } from "@/lib/services/news/intelligenceBullets";

const TONE_STYLES = {
  light: {
    neutral: "border-slate-200/90 bg-slate-50/80 text-slate-800",
    positive: "border-emerald-200/70 bg-emerald-50/50 text-emerald-950",
    attention: "border-amber-200/80 bg-amber-50/60 text-amber-950",
    critical: "border-q2/40 bg-q2-soft text-slate-950",
  },
  dark: {
    neutral: "border-white/10 bg-white/[0.04] text-slate-100",
    positive: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    attention: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    critical: "border-q2/35 bg-q2-strong/20 text-white",
  },
} as const;

const INTERACTIVE_STYLES = {
  light:
    "cursor-pointer transition hover:border-slate-300 hover:bg-white hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 active:scale-[0.995]",
  dark:
    "cursor-pointer transition hover:border-white/20 hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero active:scale-[0.995]",
} as const;

function resolveToneStyles(
  variant: "light" | "dark",
  tone: TodaysDecisionResult["tone"],
) {
  return TONE_STYLES[variant][tone] ?? TONE_STYLES[variant].neutral;
}

function iconToneClass(
  variant: "light" | "dark",
  tone: TodaysDecisionResult["tone"],
): string {
  if (tone === "critical") {
    return variant === "dark" ? "text-brand" : "text-q2-strong";
  }

  if (tone === "attention") {
    return variant === "dark" ? "text-amber-300" : "text-amber-600";
  }

  if (tone === "positive") {
    return variant === "dark" ? "text-emerald-300" : "text-emerald-600";
  }

  return variant === "dark" ? "text-slate-400" : "text-slate-500";
}

function recommendationLabelClass(
  variant: "light" | "dark",
  tone: TodaysDecisionResult["tone"],
): string {
  if (tone === "critical") {
    return variant === "dark" ? "text-brand" : "text-q2-deep";
  }

  return variant === "dark" ? "text-inherit" : "text-inherit";
}

function statusBadgeClass(
  variant: "light" | "dark",
  tone: TodaysDecisionResult["tone"],
): string {
  if (tone === "critical") {
    return variant === "dark"
      ? "border-brand/30 bg-brand/15 text-brand"
      : "border-q2/30 bg-q2-soft text-q2-deep";
  }

  return variant === "dark"
    ? "border-current/10 bg-white/10"
    : "border-current/10 bg-white/50";
}

function destinationCueClass(variant: "light" | "dark"): string {
  return variant === "dark"
    ? "text-brand group-hover:text-white"
    : "text-q1-strong group-hover:text-q1-deep";
}

function resolveDestination(decision: TodaysDecisionResult): {
  href: string;
  label: string;
  external: boolean;
} | null {
  if (decision.destinationHref?.trim()) {
    return {
      href: decision.destinationHref.trim(),
      label: decision.destinationLabel ?? "View insight",
      external: decision.destinationExternal === true,
    };
  }

  if (isValidArticleUrl(decision.sourceUrl)) {
    return {
      href: decision.sourceUrl!.trim(),
      label: decision.sourceLinkLabel ?? "View insight",
      external: true,
    };
  }

  return null;
}

function DecisionContent({
  decision,
  variant,
}: {
  decision: TodaysDecisionResult;
  variant: "light" | "dark";
}) {
  return (
    <div className="flex min-w-0 items-start gap-3.5">
      <Compass
        className={`mt-0.5 h-4 w-4 shrink-0 ${iconToneClass(variant, decision.tone)}`}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3
            id="todays-decision-heading"
            className={`text-[11px] font-semibold uppercase tracking-[0.1em] ${recommendationLabelClass(variant, decision.tone)}`}
          >
            Why it matters
          </h3>
          <span
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeClass(variant, decision.tone)}`}
          >
            {decision.statusLabel}
          </span>
        </div>
        <p
          className={`mt-2 break-words text-[15px] font-medium leading-relaxed ${
            variant === "dark" ? "text-slate-100" : "text-slate-950"
          }`}
        >
          {decision.decision}
        </p>
        {decision.reason ? (
          <p
            className={`mt-2 break-words text-sm leading-relaxed ${
              variant === "dark" ? "text-white/80" : "text-slate-600"
            }`}
          >
            {decision.reason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function TodaysDecisionBlock({
  decision,
  variant = "light",
  compact = false,
}: {
  decision: TodaysDecisionResult;
  variant?: "light" | "dark";
  /** Tighter padding for nested Dashboard briefing use. */
  compact?: boolean;
}) {
  const styles = resolveToneStyles(variant, decision.tone);
  const destination = resolveDestination(decision);
  const paddingClass = compact ? "px-3.5 py-3 md:px-4 md:py-3" : "px-4 py-4 md:px-5 md:py-4";
  const shellClassName = `group min-h-[44px] min-w-0 rounded-[18px] border ${paddingClass} ${styles} ${
    destination ? INTERACTIVE_STYLES[variant] : ""
  }`;

  if (destination?.external) {
    return (
      <a
        href={destination.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-labelledby="todays-decision-heading"
        className={`block ${shellClassName}`}
      >
        <DecisionContent decision={decision} variant={variant} />
        <p
          className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold ${destinationCueClass(variant)}`}
        >
          {destination.label}
          <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </p>
      </a>
    );
  }

  if (destination) {
    return (
      <Link
        href={destination.href}
        aria-labelledby="todays-decision-heading"
        className={`block ${shellClassName}`}
      >
        <DecisionContent decision={decision} variant={variant} />
        <p
          className={`mt-3 inline-flex min-h-[44px] items-center gap-1.5 text-sm font-semibold ${destinationCueClass(variant)}`}
        >
          {destination.label}
          <ArrowRight className="h-4 w-4 shrink-0 transition group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden />
        </p>
      </Link>
    );
  }

  return (
    <section
      aria-labelledby="todays-decision-heading"
      className={shellClassName}
    >
      <DecisionContent decision={decision} variant={variant} />
    </section>
  );
}
