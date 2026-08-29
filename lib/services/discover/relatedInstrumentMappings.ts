/**
 * Explicit trusted related-instrument relationships.
 * Only pairwise mappings verified for research context — never name-based guesses.
 */

export type TrustedRelatedRelationship = {
  holdingProviderSymbol: string;
  relatedProviderSymbol: string;
  relationshipLabel: "Often compared with" | "Similar exposure" | "Research context";
  researchContext: string;
};

const TRUSTED_RELATIONSHIPS: TrustedRelatedRelationship[] = [
  {
    holdingProviderSymbol: "VWCE.XETRA",
    relatedProviderSymbol: "AIFS.XETRA",
    relationshipLabel: "Research context",
    researchContext:
      "Both are UCITS ETFs listed on XETRA, but they target different exposures.",
  },
  {
    holdingProviderSymbol: "AIFS.XETRA",
    relatedProviderSymbol: "VWCE.XETRA",
    relationshipLabel: "Research context",
    researchContext:
      "Broad global equity ETFs are commonly reviewed alongside thematic infrastructure funds.",
  },
  {
    holdingProviderSymbol: "NUKL.XETRA",
    relatedProviderSymbol: "4COP.XETRA",
    relationshipLabel: "Research context",
    researchContext:
      "Both are cyclical thematic ETFs, but uranium/nuclear and copper miners are distinct themes.",
  },
  {
    holdingProviderSymbol: "4COP.XETRA",
    relatedProviderSymbol: "NUKL.XETRA",
    relationshipLabel: "Research context",
    researchContext:
      "Both are cyclical thematic ETFs, but copper miners and uranium/nuclear are distinct themes.",
  },
];

const byHolding = new Map<string, TrustedRelatedRelationship[]>();

for (const relationship of TRUSTED_RELATIONSHIPS) {
  const key = relationship.holdingProviderSymbol.toUpperCase();
  const existing = byHolding.get(key) ?? [];
  existing.push(relationship);
  byHolding.set(key, existing);
}

export function listTrustedRelatedRelationships(
  holdingProviderSymbol: string | null | undefined,
): TrustedRelatedRelationship[] {
  const normalized = holdingProviderSymbol?.trim().toUpperCase();
  if (!normalized) return [];
  return byHolding.get(normalized) ?? [];
}

export function listAllTrustedRelationships(): readonly TrustedRelatedRelationship[] {
  return TRUSTED_RELATIONSHIPS;
}
