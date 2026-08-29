"use client";

import type {
  ExpectedReturnBand,
  ExpectedVolatilityLevel,
} from "@/lib/services/portfolio/portfolioHealthProfile";

const ZONES = [
  {
    id: "efficient",
    label: "Efficient Growth",
    className: "bg-brand/[0.14]",
    x: 0,
    y: 0,
  },
  {
    id: "aggressive",
    label: "Aggressive Growth",
    className: "bg-q2/[0.16]",
    x: 1,
    y: 0,
  },
  {
    id: "defensive",
    label: "Defensive / Conservative",
    className: "bg-slate-500/[0.10]",
    x: 0,
    y: 1,
  },
  {
    id: "volatile",
    label: "High Vol / Limited Return",
    className: "bg-amber-500/[0.10]",
    x: 1,
    y: 1,
  },
] as const;

/**
 * Descriptive Risk vs Expected Return map with labelled zones.
 * Positioning only — no fake numerical precision.
 * Compact wide matrix — must not dominate the Scorecard page.
 */
export function RiskReturnMap({
  volatilityIndex,
  returnIndex,
  volatilityLevel,
  returnBand,
}: {
  volatilityIndex: number;
  returnIndex: number;
  volatilityLevel: ExpectedVolatilityLevel;
  returnBand: ExpectedReturnBand;
}) {
  const x = Math.max(12, Math.min(88, volatilityIndex * 100));
  const y = Math.max(14, Math.min(86, (1 - returnIndex) * 100));

  return (
    <div className="w-full" data-testid="risk-return-map">
      <div className="flex items-stretch gap-1.5">
        <div
          className="flex w-4 shrink-0 flex-col items-center justify-between py-0.5 sm:w-5"
          aria-hidden
        >
          <span className="text-[10px] font-semibold text-white/50">High</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 [writing-mode:vertical-rl] rotate-180">
            Expected return
          </span>
          <span className="text-[10px] font-semibold text-white/50">Low</span>
        </div>

        <div
          className="relative h-[188px] min-w-0 flex-1 overflow-hidden rounded-xl border border-white/12 bg-navy-hero-deep/40 sm:h-[240px] lg:h-[256px]"
          role="img"
          aria-label={`Your portfolio: ${returnBand} expected return, ${volatilityLevel} expected volatility`}
          data-testid="risk-return-matrix"
        >
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
            {ZONES.map((zone) => (
              <div
                key={zone.id}
                className={`relative px-2 py-1.5 sm:px-3 sm:py-2 ${zone.className} ${
                  zone.x === 1 ? "border-l border-white/10" : ""
                } ${zone.y === 1 ? "border-t border-white/10" : ""}`}
              >
                <p className="max-w-[10rem] text-[11px] font-semibold leading-snug text-white/85 sm:text-[12px]">
                  {zone.label}
                </p>
              </div>
            ))}
          </div>

          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span className="absolute -inset-2.5 animate-pulse rounded-full bg-brand/25" />
            <span className="relative block h-3.5 w-3.5 rounded-full border-2 border-white bg-brand shadow-[0_0_14px_rgba(93,183,255,0.45)] sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>

      <div
        className="mt-1.5 flex items-center justify-between pl-6 text-[10px] font-bold uppercase tracking-[0.12em] text-white/55 sm:pl-7 sm:text-[11px]"
        aria-hidden
      >
        <span>Low</span>
        <span>Expected volatility</span>
        <span>High</span>
      </div>

      <p className="mt-3 text-[15px] font-semibold leading-snug text-white">
        {returnBand} expected return · {volatilityLevel} expected volatility
      </p>
    </div>
  );
}
