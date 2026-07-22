import { Sparkles } from "lucide-react";

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
    <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm md:rounded-[28px]">
      <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 md:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-black tracking-[-0.03em] text-slate-950">
            AI portfolio insight
          </h2>
          <p className="text-sm text-slate-500">
            Based on your saved holdings and today&apos;s data
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-slate-100 md:grid-cols-3">
        {blocks.map((block) => (
          <div key={block.label} className="min-w-0 bg-white px-4 py-4 md:px-5 md:py-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-500">
              {block.label}
            </p>
            <p className="mt-2 text-base leading-relaxed text-slate-700">{block.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
