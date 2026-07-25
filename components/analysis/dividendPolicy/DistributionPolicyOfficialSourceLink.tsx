import { ExternalLink } from "lucide-react";

import { buildReviewedDistributionOfficialSourceAnchor } from "@/lib/services/dividends/reviewedDistributionSourceUrl";
import type { DistributionPolicyClassification } from "@/lib/types/distributionPolicy";

export function DistributionPolicyOfficialSourceLink({
  classification,
  className = "",
}: {
  classification: DistributionPolicyClassification;
  className?: string;
}) {
  const anchor = buildReviewedDistributionOfficialSourceAnchor(classification);

  if (!anchor) {
    return null;
  }

  return (
    <a
      href={anchor.href}
      target={anchor.target}
      rel={anchor.rel}
      className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-violet-700 hover:text-violet-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 ${className}`.trim()}
    >
      {anchor.label}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}
