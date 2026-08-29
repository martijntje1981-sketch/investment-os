import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type {
  AnalysisAttentionItem,
  AnalysisAttentionView,
} from "@/lib/services/analysisGlance";

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

function valueClass(tone: AnalysisAttentionItem["tone"]): string {
  if (tone === "caution") return "text-amber-300";
  if (tone === "info") return "text-sky-300";
  return "text-white";
}

export function AnalysisAttentionBlock({
  view,
}: {
  view: AnalysisAttentionView;
}) {
  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="analysis-attention"
      data-limited={view.limited ? "true" : "false"}
      aria-labelledby="analysis-attention-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="analysis-attention-heading">
          What deserves attention
        </p>
        {view.quietMessage ? (
          <p className={`mt-2 ${appDashboardDarkMetaClass}`}>{view.quietMessage}</p>
        ) : (
          <ul className="mt-2.5 space-y-3">
            {view.items.map((item) => (
              <li key={item.id} className="min-w-0">
                <p
                  className={`text-[1.5rem] font-bold leading-none tracking-[-0.03em] tabular-nums ${valueClass(item.tone)}`}
                >
                  {item.value}
                </p>
                <p className="mt-1 text-[14px] font-semibold text-white">
                  {item.label}
                </p>
                <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
                  {item.implication}
                </p>
                <Link href={item.href} className={`${actionClass} -mb-2 mt-0`}>
                  {item.hrefLabel}
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
