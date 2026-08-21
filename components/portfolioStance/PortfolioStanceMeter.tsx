"use client";

import {
  appSectionLabelClass,
  appSectionMetaClass,
} from "@/components/layout/appSurface";

export function PortfolioStanceMeter({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="min-w-0" data-testid="portfolio-stance-meter">
      <div className="flex items-center justify-between gap-3">
        <p className={appSectionLabelClass}>Defensive</p>
        <p className={appSectionLabelClass}>Offensive</p>
      </div>
      <div
        className={`relative mt-1.5 w-full overflow-hidden rounded-full bg-gradient-to-r from-cyan-100 via-slate-200 to-cyan-800 ${
          compact ? "h-2.5" : "h-3.5"
        }`}
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label="Portfolio stance"
      >
        <span
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy-hero shadow-md sm:h-5 sm:w-5"
          style={{ left: `${clamped}%` }}
        />
      </div>
      {compact ? null : (
        <p className={`mt-2 ${appSectionMetaClass}`}>
          Three visual zones — defensive, neutral, offensive. Labels describe
          positioning, not quality.
        </p>
      )}
    </div>
  );
}
