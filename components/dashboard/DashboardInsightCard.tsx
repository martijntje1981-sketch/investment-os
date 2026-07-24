import { Sparkles } from "lucide-react";

import { DashboardSectionHeader } from "@/components/dashboard/DashboardSectionHeader";
import {
  appCardPaddingCompactClass,
  appDashboardLightCardClass,
  appSectionBodyClass,
  appSectionLabelClass,
} from "@/components/layout/appSurface";
import type { DashboardInsightSections } from "@/lib/client/dashboardInsight";

export function DashboardInsightCard({
  sections,
}: {
  sections: DashboardInsightSections;
}) {
  const blocks = [
    { label: "Main risk", value: sections.mainRisk },
    { label: "Main opportunity", value: sections.mainOpportunity },
    { label: "Current conclusion", value: sections.recommendation },
  ];

  return (
    <section className={appDashboardLightCardClass}>
      <DashboardSectionHeader
        title="AI portfolio insight"
        subtitle="Based on your saved holdings and today's data"
        icon={<Sparkles className="h-5 w-5" />}
      />

      <div className="grid gap-px bg-slate-100 md:grid-cols-3">
        {blocks.map((block) => (
          <div
            key={block.label}
            className={`min-w-0 bg-white ${appCardPaddingCompactClass}`}
          >
            <p className={appSectionLabelClass}>{block.label}</p>
            <p className={`mt-2.5 ${appSectionBodyClass}`}>{block.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
