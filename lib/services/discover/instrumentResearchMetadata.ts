/**
 * Verified research metadata for supported instruments only.
 * Never infer classification from instrument names alone.
 */

export type InstrumentResearchProfile = {
  providerSymbol: string;
  symbol: string;
  assetClass: "cash" | "equity_etf" | "thematic_etf" | "digital_assets" | "income_etp";
  fundCategory: string;
  sectorExposure: string[];
  regionExposure: string[];
  marketCapExposure: "broad" | "thematic" | "unknown";
  incomeProfile: "growth" | "income" | "mixed" | "none";
  cyclicalProfile: "cyclical" | "defensive" | "mixed" | "unknown";
  verified: true;
};

const PROFILES: InstrumentResearchProfile[] = [
  {
    providerSymbol: "VWCE.XETRA",
    symbol: "VWCE",
    assetClass: "equity_etf",
    fundCategory: "Global diversified equity ETF",
    sectorExposure: ["Broad market"],
    regionExposure: ["Global developed", "Emerging markets"],
    marketCapExposure: "broad",
    incomeProfile: "growth",
    cyclicalProfile: "mixed",
    verified: true,
  },
  {
    providerSymbol: "IB1T.XETRA",
    symbol: "IB1T",
    assetClass: "digital_assets",
    fundCategory: "Bitcoin ETP",
    sectorExposure: ["Digital assets"],
    regionExposure: ["Global"],
    marketCapExposure: "thematic",
    incomeProfile: "none",
    cyclicalProfile: "cyclical",
    verified: true,
  },
  {
    providerSymbol: "NUKL.XETRA",
    symbol: "NUKL",
    assetClass: "thematic_etf",
    fundCategory: "Uranium and nuclear thematic ETF",
    sectorExposure: ["Energy", "Uranium"],
    regionExposure: ["Global"],
    marketCapExposure: "thematic",
    incomeProfile: "growth",
    cyclicalProfile: "cyclical",
    verified: true,
  },
  {
    providerSymbol: "AIFS.XETRA",
    symbol: "AIFS",
    assetClass: "thematic_etf",
    fundCategory: "AI infrastructure thematic ETF",
    sectorExposure: ["Technology", "AI infrastructure"],
    regionExposure: ["Global"],
    marketCapExposure: "thematic",
    incomeProfile: "growth",
    cyclicalProfile: "cyclical",
    verified: true,
  },
  {
    providerSymbol: "4COP.XETRA",
    symbol: "4COP",
    assetClass: "thematic_etf",
    fundCategory: "Copper miners thematic ETF",
    sectorExposure: ["Materials", "Copper miners"],
    regionExposure: ["Global"],
    marketCapExposure: "thematic",
    incomeProfile: "growth",
    cyclicalProfile: "cyclical",
    verified: true,
  },
  {
    providerSymbol: "STRC.AS",
    symbol: "STRC",
    assetClass: "income_etp",
    fundCategory: "Strategy yield ETP",
    sectorExposure: ["Multi-strategy"],
    regionExposure: ["Global"],
    marketCapExposure: "thematic",
    incomeProfile: "income",
    cyclicalProfile: "defensive",
    verified: true,
  },
];

const byProviderSymbol = new Map<string, InstrumentResearchProfile>();

for (const profile of PROFILES) {
  byProviderSymbol.set(profile.providerSymbol.toUpperCase(), profile);
}

export function lookupInstrumentResearchProfile(
  providerSymbol: string | null | undefined,
): InstrumentResearchProfile | null {
  const normalized = providerSymbol?.trim().toUpperCase();
  if (!normalized) return null;
  return byProviderSymbol.get(normalized) ?? null;
}

export function listVerifiedResearchProfiles(): readonly InstrumentResearchProfile[] {
  return PROFILES;
}

export type ResearchCoverageDimension = {
  id: string;
  label: string;
  description: string;
  matchesProfile: (profile: InstrumentResearchProfile) => boolean;
};

export const RESEARCH_COVERAGE_DIMENSIONS: ResearchCoverageDimension[] = [
  {
    id: "cash",
    label: "Cash",
    description: "Cash or cash-equivalent holdings.",
    matchesProfile: () => false,
  },
  {
    id: "global_equity",
    label: "Global diversified equity",
    description: "Broad global equity ETF exposure.",
    matchesProfile: (profile) => profile.assetClass === "equity_etf",
  },
  {
    id: "sector_thematic",
    label: "Sector or thematic ETFs",
    description: "Targeted sector or theme exposure.",
    matchesProfile: (profile) => profile.assetClass === "thematic_etf",
  },
  {
    id: "digital_assets",
    label: "Digital assets",
    description: "Crypto or digital-asset linked products.",
    matchesProfile: (profile) => profile.assetClass === "digital_assets",
  },
  {
    id: "commodities",
    label: "Commodities exposure",
    description: "Commodity-linked or miners exposure.",
    matchesProfile: (profile) =>
      profile.sectorExposure.some((sector) =>
        /copper|uranium|materials|commodit/i.test(sector),
      ),
  },
  {
    id: "income_yield",
    label: "Income or yield-focused products",
    description: "Holdings with an explicit income or yield profile.",
    matchesProfile: (profile) =>
      profile.incomeProfile === "income" || profile.assetClass === "income_etp",
  },
  {
    id: "fixed_income",
    label: "Bonds / fixed income",
    description: "Direct bond or fixed-income fund exposure.",
    matchesProfile: () => false,
  },
  {
    id: "healthcare",
    label: "Healthcare sector",
    description: "Direct healthcare sector exposure.",
    matchesProfile: (profile) =>
      profile.sectorExposure.some((sector) => /health/i.test(sector)),
  },
  {
    id: "emerging_markets",
    label: "Emerging markets",
    description: "Dedicated emerging-market equity exposure.",
    matchesProfile: (profile) =>
      profile.regionExposure.some((region) => /emerging/i.test(region)) &&
      profile.assetClass === "equity_etf",
  },
];
