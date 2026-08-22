/**
 * Reviewed distribution-policy metadata keyed by stable instrument identity (ISIN preferred).
 * Never keyed by ticker alone.
 *
 * Production entries require independently verified official issuer documentation.
 * Do not add test-only or uncertain instruments here.
 */

import { normalizeIsin } from "@/lib/services/instruments/validation";
import type { DistributionPolicy } from "@/lib/types/distributionPolicy";

export type ReviewedDistributionPolicyEntry = {
  isin: string;
  /** Canonical and alias EODHD provider symbols for this exact ISIN. */
  providerSymbols: string[];
  instrumentName: string;
  policy: Extract<DistributionPolicy, "distributing" | "accumulating">;
  issuer: string;
  sourceNote: string;
  /** Official issuer product page supporting this exact ISIN classification. */
  sourceUrl?: string;
  reviewedAt: string;
};

const REVIEWED_ENTRIES: ReviewedDistributionPolicyEntry[] = [
  {
    isin: "IE00BK5BQT80",
    providerSymbols: ["VWCE.XETRA"],
    instrumentName: "Vanguard FTSE All-World UCITS ETF USD Accumulating",
    policy: "accumulating",
    issuer: "Vanguard",
    sourceNote:
      "Vanguard product documentation identifies IE00BK5BQT80 as the USD Accumulating (Acc) share class.",
    sourceUrl:
      "https://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating",
    reviewedAt: "2026-07-25T00:00:00.000Z",
  },
  {
    isin: "IE00B5BMR087",
    providerSymbols: ["CSPX.LSE", "SXR8.XETRA"],
    instrumentName: "iShares Core S&P 500 UCITS ETF USD (Acc)",
    policy: "accumulating",
    issuer: "iShares (BlackRock)",
    sourceNote:
      "iShares product documentation identifies IE00B5BMR087 as the USD Accumulating (Acc) share class, commonly listed as CSPX or SXR8.",
    sourceUrl:
      "https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund",
    reviewedAt: "2026-07-25T00:00:00.000Z",
  },
];

const byIsin = new Map<string, ReviewedDistributionPolicyEntry>();
const byProviderSymbol = new Map<string, ReviewedDistributionPolicyEntry>();

for (const entry of REVIEWED_ENTRIES) {
  const isin = normalizeIsin(entry.isin);
  if (isin) {
    byIsin.set(isin, entry);
  }

  for (const providerSymbol of entry.providerSymbols) {
    byProviderSymbol.set(providerSymbol.toUpperCase(), entry);
  }
}

export function lookupReviewedDistributionPolicy(input: {
  isin?: string | null;
  providerSymbol?: string | null;
}): ReviewedDistributionPolicyEntry | null {
  const normalizedIsin = normalizeIsin(input.isin);
  if (normalizedIsin) {
    const byIsinMatch = byIsin.get(normalizedIsin);
    if (byIsinMatch) return byIsinMatch;
  }

  const providerSymbol = input.providerSymbol?.trim().toUpperCase();
  if (providerSymbol) {
    return byProviderSymbol.get(providerSymbol) ?? null;
  }

  return null;
}

export function listReviewedDistributionPolicies(): ReviewedDistributionPolicyEntry[] {
  return [...REVIEWED_ENTRIES];
}
