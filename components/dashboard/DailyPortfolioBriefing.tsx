import Link from "next/link";

import type { DailyPortfolioBriefingResult } from "@/lib/client/dailyPortfolioBriefing";
import type { TodaysFocus } from "@/lib/client/smartDashboardIntelligence";

/**
 * Quiet personal conclusion layer inside the Dashboard hero.
 * Not a separate Dashboard card.
 */
export function DailyPortfolioBriefing({
  briefing,
  todaysFocus = null,
  appearance = "onLight",
}: {
  briefing: DailyPortfolioBriefingResult;
  todaysFocus?: TodaysFocus | null;
  appearance?: "onLight" | "onDark";
}) {
  const onLight = appearance === "onLight";

  return (
    <div
      className={`mt-3 border-t pt-3 motion-safe:animate-[tobailey-fade-in_280ms_ease-out] motion-reduce:animate-none ${
        onLight ? "border-sky-200/70" : "border-white/10"
      }`}
      data-testid="daily-portfolio-briefing"
    >
      {todaysFocus ? (
        <div
          className="mb-2.5"
          data-testid="todays-focus"
          data-focus-kind={todaysFocus.kind}
        >
          <p
            className={`text-[13px] font-semibold uppercase tracking-[0.08em] ${
              onLight ? "text-slate-700" : "text-white/70"
            }`}
          >
            Today’s focus
          </p>
          {todaysFocus.href ? (
            <Link
              href={todaysFocus.href}
              className={`mt-1 inline-flex min-h-[44px] max-w-full items-center rounded-full border px-3 py-1.5 text-[15px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 ${
                onLight
                  ? "border-sky-200 bg-white text-slate-900 hover:bg-sky-50"
                  : "border-white/15 bg-white/10 text-white/85 hover:bg-white/15 focus-visible:ring-offset-navy-hero"
              }`}
            >
              <span className="truncate">{todaysFocus.label}</span>
            </Link>
          ) : (
            <span
              className={`mt-1 inline-flex min-h-[44px] max-w-full items-center rounded-full border px-3 py-1.5 text-[15px] font-semibold ${
                onLight
                  ? "border-sky-200 bg-white text-slate-900"
                  : "border-white/15 bg-white/10 text-white/85"
              }`}
            >
              <span className="truncate">{todaysFocus.label}</span>
            </span>
          )}
        </div>
      ) : null}

      <p
        className={`text-[15px] font-medium leading-relaxed tracking-[-0.01em] sm:text-[16px] ${
          onLight ? "text-slate-800" : "text-white/80"
        }`}
      >
        <span className={onLight ? "text-slate-950" : "text-white"}>
          {briefing.greeting}
        </span>
        {briefing.sentences.map((sentence) => (
          <span key={sentence} className="mt-0.5 block sm:mt-0 sm:inline">
            {" "}
            {sentence}
          </span>
        ))}
      </p>
      {briefing.deepLink ? (
        <Link
          href={briefing.deepLink.href}
          className={`mt-2 inline-flex min-h-[44px] items-center text-[15px] font-semibold underline-offset-4 transition hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 ${
            onLight
              ? "text-slate-800 hover:text-slate-950"
              : "text-white/70 hover:text-white focus-visible:ring-offset-navy-hero"
          }`}
        >
          {briefing.deepLink.label}
        </Link>
      ) : null}
    </div>
  );
}
