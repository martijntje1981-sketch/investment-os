import { Clock3 } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  formatMarketUpdateTime,
  getMarketStatuses,
} from "@/lib/client/marketStatus";

export function DashboardMarketStatus({
  lastUpdatedAt,
}: {
  lastUpdatedAt: string | null;
}) {
  const statuses = getMarketStatuses();

  return (
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:rounded-[28px]">
      <DashboardSectionHeader
        title="Trading hours"
        subtitle="Major market session status"
        icon={<Clock3 className="h-5 w-5" />}
        iconToneClassName="bg-blue-50 text-blue-700"
        bordered={false}
      />

      <div className={appCardPaddingClass}>
        <div className="grid gap-3 sm:grid-cols-3">
          {statuses.map((market) => {
            const isOpen =
              market.status === "open" || market.status === "always-open";

            return (
              <div
                key={market.label}
                className="rounded-[20px] border border-slate-200 bg-slate-50 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className={appSectionLabelClass}>{market.label}</p>
                    <p className={`mt-1.5 ${appSectionTitleClass} text-base`}>
                      {market.statusLabel}
                    </p>
                  </div>
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                      isOpen ? "bg-emerald-500" : "bg-slate-400"
                    }`}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <p className={`mt-6 border-t border-slate-100 pt-5 ${appSectionMetaClass}`}>
          Latest market update:{" "}
          <span className="font-semibold text-slate-700">
            {formatMarketUpdateTime(lastUpdatedAt)}
          </span>
        </p>
      </div>
    </section>
  );
}
