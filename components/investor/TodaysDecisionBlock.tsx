import { Compass } from "lucide-react";

import { IntelligenceArticleLink } from "@/components/news/IntelligenceArticleLink";
import type { TodaysDecisionResult } from "@/lib/client/todaysDecision";

const TONE_STYLES = {
  light: {
    neutral: "border-slate-200/90 bg-slate-50/80 text-slate-800",
    positive: "border-emerald-200/70 bg-emerald-50/50 text-emerald-950",
    attention: "border-amber-200/80 bg-amber-50/60 text-amber-950",
    critical: "border-rose-200/80 bg-rose-50/70 text-rose-950",
  },
  dark: {
    neutral: "border-white/10 bg-white/[0.04] text-slate-100",
    positive: "border-emerald-400/20 bg-emerald-500/10 text-emerald-100",
    attention: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    critical: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  },
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
    return variant === "dark" ? "text-rose-300" : "text-rose-600";
  }

  if (tone === "attention") {
    return variant === "dark" ? "text-amber-300" : "text-amber-600";
  }

  if (tone === "positive") {
    return variant === "dark" ? "text-emerald-300" : "text-emerald-600";
  }

  return variant === "dark" ? "text-slate-400" : "text-slate-500";
}

export function TodaysDecisionBlock({
  decision,
  variant = "light",
}: {
  decision: TodaysDecisionResult;
  variant?: "light" | "dark";
}) {
  const styles = resolveToneStyles(variant, decision.tone);

  return (
    <section
      aria-labelledby="todays-decision-heading"
      className={`min-w-0 rounded-[18px] border px-4 py-4 md:px-5 md:py-4 ${styles}`}
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <Compass
          className={`mt-0.5 h-4 w-4 shrink-0 ${iconToneClass(variant, decision.tone)}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="todays-decision-heading"
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
            >
              Recommendation
            </h3>
            <span className="rounded-full border border-current/10 bg-white/50 px-2.5 py-0.5 text-[11px] font-medium">
              {decision.statusLabel}
            </span>
          </div>
          <div className="mt-2 break-words text-[15px] font-medium leading-relaxed">
            <IntelligenceArticleLink
              href={decision.sourceUrl}
              sourceName={decision.sourceName}
              linkLabel={decision.sourceLinkLabel ?? "Read article"}
              variant={variant}
            >
              {decision.decision}
            </IntelligenceArticleLink>
          </div>
          {decision.reason ? (
            <p
              className={`mt-2 break-words text-sm leading-relaxed ${
                variant === "dark" ? "text-slate-300" : "text-slate-600"
              }`}
            >
              {decision.reason}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
