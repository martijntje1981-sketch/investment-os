import {
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";

export function NewsIntro({
  updatedLabel,
}: {
  updatedLabel: string | null;
}) {
  return (
    <header className="min-w-0" data-testid="news-intro">
      <p className={appHeroMetricLabelClass}>News</p>
      <h1 className="mt-0.5 text-[1.35rem] font-bold leading-tight tracking-[-0.03em] text-white sm:text-[1.5rem]">
        What matters to your holdings
      </h1>
      <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
        Personal relevance first
      </p>
      {updatedLabel ? (
        <p className={`mt-1 ${appDashboardDarkMetaClass}`}>{updatedLabel}</p>
      ) : null}
    </header>
  );
}
