import { appDashboardDarkMetaClass } from "@/components/layout/appSurface";

/**
 * Dark Analysis stance scale. Uses the existing 0–100 stance score as position.
 * Does not invent a new score.
 */
export function AnalysisStanceScale({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));

  return (
    <div className="min-w-0" data-testid="analysis-stance-scale">
      <div className="flex items-center justify-between">
        <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${appDashboardDarkMetaClass}`}>
          Defensive
        </p>
        <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${appDashboardDarkMetaClass}`}>
          Offensive
        </p>
      </div>
      <div
        className="relative mt-1.5 h-2 w-full overflow-visible rounded-full bg-gradient-to-r from-sky-400/35 via-white/25 to-amber-300/50"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={clamped}
        aria-label="Portfolio stance"
      >
        <span
          className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-sky-300 shadow-md"
          style={{ left: `${clamped}%` }}
        />
      </div>
    </div>
  );
}
