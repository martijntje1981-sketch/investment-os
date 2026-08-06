import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { CompanionBundle } from "@/lib/services/portfolio/companion";
import { resolveCompanionDashboardTeaser } from "@/lib/services/portfolio/companion";

type DashboardReviewTeaserProps = {
  bundle: CompanionBundle;
};

/**
 * Always-visible quiet Dashboard entry to Your Review.
 * Emphasises readiness when weekly/monthly reviews are available;
 * never a large competing card.
 */
export function DashboardReviewTeaser({ bundle }: DashboardReviewTeaserProps) {
  const teaser = resolveCompanionDashboardTeaser(bundle);

  return (
    <div className="px-1" data-testid="dashboard-review-teaser">
      <Link
        href={teaser.href}
        className="inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-brand-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
      >
        {teaser.label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
