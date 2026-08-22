import {
  appSectionBodyClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";

export function BondsRatesRelationshipVisual({
  showDurationGuide = true,
}: {
  showDurationGuide?: boolean;
}) {
  return (
    <div
      className="min-w-0 space-y-3"
      data-testid="bonds-rates-relationship"
    >
      <div className="grid min-w-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3">
          <p className={appSectionLabelClass}>Rates / yields ↑</p>
          <p className={`mt-1.5 ${appSectionBodyClass}`}>
            Existing bond prices generally ↓
          </p>
        </div>
        <div className="min-w-0 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className={appSectionLabelClass}>Rates / yields ↓</p>
          <p className={`mt-1.5 ${appSectionBodyClass}`}>
            Existing bond prices generally ↑
          </p>
        </div>
      </div>
      {showDurationGuide ? (
        <p className={appSectionBodyClass}>
          Longer duration is generally more rate-sensitive. Shorter duration is
          generally less rate-sensitive.
        </p>
      ) : null}
    </div>
  );
}
