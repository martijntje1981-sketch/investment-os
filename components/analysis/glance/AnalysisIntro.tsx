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
      <h1 className="mt-1 max-w-[20rem] text-[1.65rem] font-bold leading-tight tracking-[-0.03em] text-white sm:max-w-xl sm:text-[1.875rem]">
        Understand how your portfolio is positioned, what drives its risk, and what could change the picture.
      </h1>
      {updatedLabel ? (
        <p className={`mt-2 ${appDashboardDarkMetaClass}`}>{updatedLabel}</p>
      ) : null}
    </header>
  );
}
