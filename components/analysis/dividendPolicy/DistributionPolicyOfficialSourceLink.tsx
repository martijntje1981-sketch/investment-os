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
      className={`inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-q1-strong hover:text-q1-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${className}`.trim()}
    >
      {anchor.label}
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
    </a>
  );
}
