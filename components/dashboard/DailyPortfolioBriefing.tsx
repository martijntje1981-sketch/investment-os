import Link from "next/link";

import type { DailyPortfolioBriefingResult } from "@/lib/client/dailyPortfolioBriefing";
import type { TodaysFocus } from "@/lib/client/smartDashboardIntelligence";

/**
 * Quiet personal conclusion layer inside the near-black Dashboard hero.
 * Not a separate Dashboard card.
 */
export function DailyPortfolioBriefing({
  briefing,
  todaysFocus = null,
}: {
  briefing: DailyPortfolioBriefingResult;
  todaysFocus?: TodaysFocus | null;
}) {
  return (
    <div
      className="mt-3 border-t border-white/10 pt-3 motion-safe:animate-[tobailey-fade-in_280ms_ease-out] motion-reduce:animate-none"
      data-testid="daily-portfolio-briefing"
    >
      {todaysFocus ? (
        <div
          className="mb-2.5"
          data-testid="todays-focus"
          data-focus-kind={todaysFocus.kind}
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">
            Today’s focus
          </p>
          {todaysFocus.href ? (
            <Link
              href={todaysFocus.href}
              className="mt-1 inline-flex min-h-[36px] max-w-full items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85 transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
            >
              <span className="truncate">{todaysFocus.label}</span>
            </Link>
          ) : (
            <span className="mt-1 inline-flex min-h-[36px] max-w-full items-center rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12px] font-semibold text-white/85">
              <span className="truncate">{todaysFocus.label}</span>
            </span>
          )}
        </div>
      ) : null}

      <p className="text-[13px] font-medium leading-snug tracking-[-0.01em] text-white/70 sm:text-[14px] sm:leading-relaxed">
        <span className="text-white/85">{briefing.greeting}</span>
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
          className="mt-2 inline-flex min-h-[36px] items-center text-[12px] font-semibold text-white/55 underline-offset-4 transition hover:text-white/80 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/50 focus-visible:ring-offset-2 focus-visible:ring-offset-navy-hero"
        >
          {briefing.deepLink.label}
        </Link>
      ) : null}
    </div>
  );
}
