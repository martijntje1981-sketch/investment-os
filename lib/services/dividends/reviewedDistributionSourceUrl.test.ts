import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

import { classifyDistributionPolicy } from "@/lib/services/dividends/classifyDistributionPolicy";
import {
  buildReviewedDistributionOfficialSourceAnchor,
  isVerifiedReviewedSourceUrl,
  resolveReviewedDistributionPolicySourceLink,
} from "@/lib/services/dividends/reviewedDistributionSourceUrl";
import { listReviewedDistributionPolicies } from "@/lib/services/dividends/reviewedDistributionPolicyRegistry";
import type { DistributionPolicyClassification } from "@/lib/types/distributionPolicy";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const VANGUARD_URL =
  "https://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating";
const ISHARES_URL =
  "https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund";

function reviewedClassification(
  overrides: Partial<DistributionPolicyClassification> = {},
): DistributionPolicyClassification {
  return {
    policy: "accumulating",
    instrumentIdentity: "isin:IE00BK5BQT80",
    isin: "IE00BK5BQT80",
    providerSymbol: "VWCE.XETRA",
    classificationSource: "Reviewed instrument registry",
    classificationConfidence: "reviewed",
    evidenceType: "reviewed_registry",
    evidenceSummary: "Vanguard product documentation.",
    verifiedAt: "2026-07-25T00:00:00.000Z",
    dataUpdatedAt: null,
    isUserConfirmed: false,
    isReviewedOverride: true,
    conflictDetected: false,
    conflictSummary: null,
    providerUnavailable: false,
    sourceUrl: VANGUARD_URL,
    ...overrides,
  };
}

describe("reviewed distribution source URL traceability", () => {
  it("stores exact official HTTPS URLs on both reviewed registry entries", () => {
    const entries = listReviewedDistributionPolicies();
    const vanguard = entries.find((entry) => entry.isin === "IE00BK5BQT80");
    const ishares = entries.find((entry) => entry.isin === "IE00B5BMR087");

    expect(vanguard?.sourceUrl).toBe(VANGUARD_URL);
    expect(ishares?.sourceUrl).toBe(ISHARES_URL);
    expect(entries.every((entry) => isVerifiedReviewedSourceUrl(entry.sourceUrl))).toBe(
      true,
    );
  });

  it("resolves link only for reviewed-registry evidence", () => {
    expect(
      resolveReviewedDistributionPolicySourceLink(reviewedClassification()),
    ).toBe(VANGUARD_URL);
  });

  it("returns null for unknown classifications", () => {
    expect(
      resolveReviewedDistributionPolicySourceLink(
        reviewedClassification({
          policy: "unknown",
          classificationConfidence: "unknown",
          evidenceType: "none",
          isReviewedOverride: false,
          sourceUrl: null,
        }),
      ),
    ).toBeNull();
  });

  it("returns null for user-confirmed classifications", () => {
    expect(
      resolveReviewedDistributionPolicySourceLink(
        reviewedClassification({
          isUserConfirmed: true,
          isReviewedOverride: false,
          evidenceType: "user_confirmed",
          sourceUrl: VANGUARD_URL,
        }),
      ),
    ).toBeNull();
  });

  it("rejects non-HTTPS URLs", () => {
    expect(isVerifiedReviewedSourceUrl("http://example.com/page")).toBe(false);
    expect(
      resolveReviewedDistributionPolicySourceLink(
        reviewedClassification({
          sourceUrl: "http://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating",
        }),
      ),
    ).toBeNull();
  });

  it("rejects javascript and malformed URLs", () => {
    expect(isVerifiedReviewedSourceUrl("javascript:alert(1)")).toBe(false);
    expect(isVerifiedReviewedSourceUrl("not-a-url")).toBe(false);
    expect(
      resolveReviewedDistributionPolicySourceLink(
        reviewedClassification({ sourceUrl: "javascript:alert(1)" }),
      ),
    ).toBeNull();
  });
});

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    ...overrides,
  };
}

describe("reviewed distribution official source anchor", () => {
  it("builds external link props for reviewed registry classification", () => {
    const anchor = buildReviewedDistributionOfficialSourceAnchor(
      reviewedClassification(),
    );

    expect(anchor).toEqual({
      href: VANGUARD_URL,
      target: "_blank",
      rel: "noopener noreferrer",
      label: "View official source",
    });
  });

  it("returns null for unknown classifications", () => {
    expect(
      buildReviewedDistributionOfficialSourceAnchor(
        reviewedClassification({
          policy: "unknown",
          classificationConfidence: "unknown",
          evidenceType: "none",
          isReviewedOverride: false,
          sourceUrl: null,
        }),
      ),
    ).toBeNull();
  });

  it("returns null for user-confirmed classifications", () => {
    const classification = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
        distributionPolicyUserOverride: "accumulating",
      }),
    });

    expect(classification.isUserConfirmed).toBe(true);
    expect(buildReviewedDistributionOfficialSourceAnchor(classification)).toBeNull();
  });

  it("returns null for unsafe non-HTTPS URLs", () => {
    expect(
      buildReviewedDistributionOfficialSourceAnchor(
        reviewedClassification({
          sourceUrl:
            "http://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating",
        }),
      ),
    ).toBeNull();
  });

  it("renders anchor markup from reviewed classification props", () => {
    const anchor = buildReviewedDistributionOfficialSourceAnchor(
      reviewedClassification(),
    );

    const html = renderToStaticMarkup(
      createElement(
        "a",
        {
          href: anchor?.href,
          target: anchor?.target,
          rel: anchor?.rel,
        },
        anchor?.label,
      ),
    );

    expect(html).toContain("View official source");
    expect(html).toContain(`href="${VANGUARD_URL}"`);
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
