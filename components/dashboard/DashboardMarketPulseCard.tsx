import Link from "next/link";
import { ArrowRight, Waves } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
} from "@/components/layout/appSurface";

export function DashboardMarketPulseCard({
  leadLabel,
  moveLabel,
}: {
  leadLabel?: string | null;
  moveLabel?: string | null;
}) {
  return (
    <section
      aria-labelledby="market-pulse-preview-heading"
      className={appDashboardLightCardClass}
    >
      <DashboardSectionHeader
        titleId="market-pulse-preview-heading"
        title="Market Pulse"
        subtitle="Markets linked to your portfolio"
        icon={<Waves className="h-5 w-5" />}
        iconToneClassName="bg-amber-50 text-amber-700"
        bordered={false}
      />
      <div className={appCardPaddingClass}>
        <p className={`text-[16px] font-semibold text-slate-950`}>
          {leadLabel ?? "Open Market Pulse for commodities, crypto and linked markets."}
        </p>
        {moveLabel ? (
          <p className={`mt-2 ${appSectionBodyClass} text-slate-600`}>{moveLabel}</p>
        ) : null}
        <Link
          href="/market-pulse"
          className="mt-4 inline-flex min-h-[44px] items-center gap-1.5 text-[15px] font-semibold text-slate-950"
        >
          Open Market Pulse
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
