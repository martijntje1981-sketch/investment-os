"use client";

import type {
  ExpectedReturnBand,
  ExpectedVolatilityLevel,
} from "@/lib/services/portfolio/portfolioHealthProfile";

const ZONES = [
  {
    id: "efficient",
    label: "Efficient Growth",
    className: "bg-sky-500/[0.12]",
    x: 0,
    y: 0,
  },
  {
    id: "aggressive",
    label: "Aggressive Growth",
    className: "bg-violet-500/[0.14]",
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
    <div className="w-full">
      <div
        className="relative aspect-[5/4] w-full overflow-hidden rounded-[24px] border border-white/12 sm:aspect-[4/3]"
        role="img"
        aria-label={`Your portfolio: ${returnBand} expected return, ${volatilityLevel} expected volatility`}
      >
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          {ZONES.map((zone) => (
            <div
              key={zone.id}
              className={`relative p-2.5 sm:p-3.5 ${zone.className} ${
                zone.x === 1 ? "border-l border-white/10" : ""
              } ${zone.y === 1 ? "border-t border-white/10" : ""}`}
            >
              <p className="max-w-[9rem] text-[10px] font-bold leading-snug text-white/80 sm:max-w-none sm:text-[12px]">
                {zone.label}
              </p>
            </div>
          ))}
        </div>

        <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
          Expected return
        </span>
        <span className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-[0.14em] text-white/40">
          Expected volatility
        </span>
        <span className="pointer-events-none absolute left-3 top-2 text-[10px] font-semibold text-white/45">
          High
        </span>
        <span className="pointer-events-none absolute bottom-7 left-3 text-[10px] font-semibold text-white/45">
          Low
        </span>
        <span className="pointer-events-none absolute bottom-7 right-3 text-[10px] font-semibold text-white/45">
          High
        </span>

        <div
          className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${x}%`, top: `${y}%` }}
        >
          <span className="absolute -inset-3 animate-pulse rounded-full bg-sky-400/20" />
          <span className="relative block h-4 w-4 rounded-full border-2 border-white bg-sky-400 shadow-[0_0_18px_rgba(56,189,248,0.55)]" />
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-white/15 bg-white/5 px-4 py-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-sky-300">
          Your portfolio
        </p>
        <p className="mt-1 text-[15px] font-semibold text-white">
          {returnBand} expected return · {volatilityLevel} expected volatility
        </p>
      </div>
    </div>
  );
}
