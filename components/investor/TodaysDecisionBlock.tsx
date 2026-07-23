import { Compass } from "lucide-react";

import { IntelligenceArticleLink } from "@/components/news/IntelligenceArticleLink";
import type { TodaysDecisionResult } from "@/lib/client/todaysDecision";

const TONE_STYLES = {
  light: {
    neutral: "border-slate-200 bg-slate-50 text-slate-700",
    watch: "border-blue-200 bg-blue-50 text-blue-900",
    elevated: "border-amber-200 bg-amber-50 text-amber-950",
    urgent: "border-rose-200 bg-rose-50 text-rose-950",
  },
  dark: {
    neutral: "border-white/10 bg-white/[0.04] text-slate-100",
    watch: "border-blue-400/20 bg-blue-500/10 text-blue-100",
    elevated: "border-amber-400/20 bg-amber-500/10 text-amber-100",
    urgent: "border-rose-400/20 bg-rose-500/10 text-rose-100",
  },
} as const;

export function TodaysDecisionBlock({
  decision,
  variant = "light",
}: {
  decision: TodaysDecisionResult;
  variant?: "light" | "dark";
}) {
  const styles = TONE_STYLES[variant][decision.tone];

  return (
    <section
      aria-labelledby="todays-decision-heading"
      className={`min-w-0 rounded-[16px] border px-4 py-3 ${styles}`}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Compass
          className={`mt-0.5 h-4 w-4 shrink-0 ${variant === "dark" ? "text-violet-300" : "text-violet-600"}`}
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
            <span className="rounded-full border border-current/20 px-2 py-0.5 text-xs font-semibold">
              {decision.statusLabel}
            </span>
          </div>
          <div className="mt-1.5">
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
              className={`mt-1 text-sm leading-relaxed ${
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
