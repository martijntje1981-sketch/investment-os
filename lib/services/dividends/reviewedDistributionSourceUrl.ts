import type { DistributionPolicyClassification } from "@/lib/types/distributionPolicy";

/** Only HTTPS URLs from reviewed-registry evidence may reach the UI link. */
export function isVerifiedReviewedSourceUrl(
  url: string | null | undefined,
): url is string {
  if (!url?.trim()) {
    return false;
  }

  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Resolves a safe external link for reviewed registry classifications only.
 * User-confirmed, unknown, and other evidence paths never expose a source URL.
 */
export function resolveReviewedDistributionPolicySourceLink(
  classification: DistributionPolicyClassification,
): string | null {
  if (classification.isUserConfirmed) {
    return null;
  }

  if (!classification.isReviewedOverride) {
    return null;
  }

  if (classification.evidenceType !== "reviewed_registry") {
    return null;
  }

  if (!isVerifiedReviewedSourceUrl(classification.sourceUrl)) {
    return null;
  }

  return classification.sourceUrl.trim();
}

export type ReviewedDistributionOfficialSourceAnchor = {
  href: string;
  target: "_blank";
  rel: "noopener noreferrer";
  label: "View official source";
};

export function buildReviewedDistributionOfficialSourceAnchor(
  classification: DistributionPolicyClassification,
): ReviewedDistributionOfficialSourceAnchor | null {
  const href = resolveReviewedDistributionPolicySourceLink(classification);
  if (!href) {
    return null;
  }

  return {
    href,
    target: "_blank",
    rel: "noopener noreferrer",
    label: "View official source",
  };
}
