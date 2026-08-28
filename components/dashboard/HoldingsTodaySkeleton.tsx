import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { appCardPaddingClass, appDarkCardClass } from "@/components/layout/appSurface";

export function HoldingsTodaySkeleton() {
  return (
    <section className={appDarkCardClass} aria-busy="true" aria-label="Loading holdings">
      <DashboardSectionHeader
        variant="feature"
        title="Your holdings"
        subtitle="Loading positions…"
        bordered={false}
      />
      <div className={`space-y-3 ${appCardPaddingClass}`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-14 animate-pulse rounded-2xl bg-white/8"
          />
        ))}
      </div>
    </section>
  );
}
