import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { CompanionBundle } from "@/lib/services/portfolio/companion";
import { resolveCompanionDashboardTeaser } from "@/lib/services/portfolio/companion";

type DashboardReviewTeaserProps = {
  bundle: CompanionBundle;
};

/**
 * Compact Dashboard entry — only when a weekly/monthly review is ready.
 * Does not add a large card or duplicate Daily Story copy.
 */
export function DashboardReviewTeaser({ bundle }: DashboardReviewTeaserProps) {
  const teaser = resolveCompanionDashboardTeaser(bundle);
  if (!teaser) return null;

  return (
    <div className="px-1">
      <Link
        href={teaser.href}
        className="inline-flex min-h-[44px] items-center gap-2 text-[14px] font-semibold text-brand-navy underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        data-testid="dashboard-review-teaser"
      >
        {teaser.label}
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </div>
  );
}
