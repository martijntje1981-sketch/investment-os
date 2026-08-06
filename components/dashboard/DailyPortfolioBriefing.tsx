import Link from "next/link";

import type { DailyPortfolioBriefingResult } from "@/lib/client/dailyPortfolioBriefing";

/**
 * Quiet personal conclusion layer inside the near-black Dashboard hero.
 * Not a separate Dashboard card.
 */
export function DailyPortfolioBriefing({
  briefing,
}: {
  briefing: DailyPortfolioBriefingResult;
}) {
  return (
    <div
      className="mt-3 border-t border-white/10 pt-3"
      data-testid="daily-portfolio-briefing"
    >
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
