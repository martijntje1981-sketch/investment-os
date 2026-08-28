import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import {
  appDarkCardClass,
  appDashboardDarkMetaClass,
  appHeroMetricLabelClass,
} from "@/components/layout/appSurface";
import type { AnalysisAttentionView } from "@/lib/services/analysisGlance";

const actionClass =
  "inline-flex min-h-11 items-center gap-1 text-[14px] font-medium text-white/70 underline-offset-2 hover:text-white hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function AnalysisAttentionBlock({
  view,
}: {
  view: AnalysisAttentionView;
}) {
  return (
    <section
      className={`${appDarkCardClass} min-w-0 overflow-x-clip`}
      data-testid="analysis-attention"
      aria-labelledby="analysis-attention-heading"
    >
      <div className="px-3.5 py-3 sm:px-5 sm:py-3.5">
        <p className={appHeroMetricLabelClass} id="analysis-attention-heading">
          What deserves attention
        </p>
        <p className={`mt-0.5 ${appDashboardDarkMetaClass}`}>
          Your biggest portfolio sensitivities
        </p>
        {view.quietMessage ? (
          <p className="mt-2 text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-white">
            {view.quietMessage}
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {view.items.map((item) => (
              <li key={item.id} className="min-w-0">
                <p className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.02em] text-white">
                  {item.title}
                </p>
                <p className={`mt-1 ${appDashboardDarkMetaClass}`}>{item.body}</p>
                <Link href={item.href} className={`${actionClass} mt-0.5`}>
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
