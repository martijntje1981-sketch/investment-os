import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";

export function AnalysisIntro({
  updatedLabel,
}: {
  updatedLabel: string | null;
}) {
  return (
    <header className="min-w-0" data-testid="analysis-intro">
      <p className={appHeroMetricLabelClass}>Analysis</p>
      <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.5rem]">
        Understand your portfolio
      </h1>
      <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
        Position · Risk · What could change
      </p>
      {updatedLabel ? (
        <p className={`mt-1 ${appDashboardDarkMetaClass}`}>{updatedLabel}</p>
      ) : null}
    </header>
  );
}
