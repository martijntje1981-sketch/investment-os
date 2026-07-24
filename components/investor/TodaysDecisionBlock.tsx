import { Compass } from "lucide-react";

import { IntelligenceArticleLink } from "@/components/news/IntelligenceArticleLink";
import type { TodaysDecisionResult } from "@/lib/client/todaysDecision";

const TONE_STYLES = {
  light: {
    neutral: "border-slate-200 bg-slate-50 text-slate-800",
    positive: "border-emerald-200/80 bg-emerald-50/70 text-emerald-950",
    attention: "border-amber-200/80 bg-amber-50/70 text-amber-950",
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

export function TodaysDecisionBlock({
  decision,
  variant = "light",
}: {
  decision: TodaysDecisionResult;
  variant?: "light" | "dark";
}) {
  const styles = resolveToneStyles(variant, decision.tone);
  const iconToneClass =
    variant === "dark"
      ? decision.tone === "critical"
        ? "text-rose-300"
        : decision.tone === "attention"
          ? "text-amber-300"
          : decision.tone === "positive"
            ? "text-emerald-300"
            : "text-slate-300"
      : decision.tone === "critical"
        ? "text-rose-600"
        : decision.tone === "attention"
          ? "text-amber-600"
          : decision.tone === "positive"
            ? "text-emerald-600"
            : "text-slate-600";

  return (
    <section
      aria-labelledby="todays-decision-heading"
      className={`min-w-0 rounded-[16px] border px-3.5 py-3 md:px-4 md:py-3.5 ${styles}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Compass
          className={`mt-0.5 h-4 w-4 shrink-0 ${iconToneClass}`}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3
              id="todays-decision-heading"
              className="text-xs font-semibold uppercase tracking-[0.08em]"
            >
              Today&apos;s Decision
            </h3>
            <span className="rounded-full border border-current/15 px-2 py-0.5 text-[11px] font-semibold">
              {decision.statusLabel}
            </span>
          </div>
          <div className="mt-1.5 break-words">
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
              className={`mt-1.5 break-words text-sm leading-relaxed ${
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
