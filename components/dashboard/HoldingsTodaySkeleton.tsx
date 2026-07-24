import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import { appCardClass, appCardPaddingClass } from "@/components/layout/appSurface";

export function HoldingsTodaySkeleton() {
  return (
    <section className={appCardClass} aria-busy="true" aria-label="Loading holdings">
      <DashboardSectionHeader
        title="Your holdings today"
        subtitle="Loading positions…"
        bordered={false}
      />
      <div className={`space-y-4 ${appCardPaddingClass}`}>
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-16 animate-pulse rounded-2xl bg-slate-100"
          />
        ))}
      </div>
    </section>
  );
}
