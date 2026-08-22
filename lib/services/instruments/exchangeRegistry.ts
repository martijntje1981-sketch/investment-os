/**
 * Central exchange registry — single source of truth for:
 * - user-facing purchase venues
 * - canonical purchase-exchange codes
 * - provider pricing exchanges (EODHD)
 *
 * These concepts are not interchangeable. Purchase-only venues (e.g. TDG)
 * must never be sent to the provider or used to construct TICKER.EXCHANGE
 * provider symbols.
 */

export type ExchangeMarketGroup = "Europe" | "United States" | "Other";

export type ExchangeRegistryEntry = {
  /** Canonical internal purchase-exchange code. */
  purchaseCode: string;
  /** User-facing label for selectors and metadata. */
  displayLabel: string;
  /** Normalized alias tokens (A-Z0-9 only after cleaning). */
  aliases: readonly string[];
  /** Shown in the exchange picker. */
  userSelectable: boolean;
  /** Valid as a holding purchase venue. */
  validPurchaseVenue: boolean;
  /**
   * Direct EODHD pricing exchange when this purchase venue maps 1:1.
   * Null when the venue is purchase-only (e.g. Tradegate).
   */
  providerPricingCode: string | null;
  /**
   * Optional reference pricing venue for documentation only.
   * Must never be used to guess pricing for unmatched instruments.
   */
  referencePricingExchange?: string | null;
  marketGroup?: ExchangeMarketGroup;
};

/**
 * Authoritative exchange metadata. Aliases must not be duplicated in UI,
 * validators, or matching services — resolve through this registry.
 */
export const EXCHANGE_REGISTRY: readonly ExchangeRegistryEntry[] = [
  {
    purchaseCode: "XETRA",
    displayLabel: "Xetra",
    aliases: ["XETRA", "XETR", "XFRA", "FRANKFURT", "DE", "GERMANY", "XET"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "XETRA",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "TDG",
    displayLabel: "Tradegate",
    aliases: ["TDG", "TRADEGATE", "TG", "TRADEGATEBSX"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: null,
    // Documented reference only — pricing requires verified/ISIN mapping.
    referencePricingExchange: "XETRA",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "AS",
    displayLabel: "Amsterdam (Euronext)",
    aliases: ["AS", "AMS", "AMSTERDAM", "EURONEXTAMSTERDAM", "XAMS"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "AS",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "PA",
    displayLabel: "Euronext Paris",
    aliases: ["PA", "PARIS", "EPA", "XPAR", "XEPA", "EURONEXTPARIS"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "PA",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "BR",
    displayLabel: "Euronext Brussels",
    aliases: ["BR", "BRUSSELS", "XBRU", "EURONEXTBRUSSELS"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "BR",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "LSE",
    displayLabel: "London Stock Exchange",
    aliases: ["LSE", "LON", "LONDON", "XLON"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "LSE",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "NASDAQ",
    displayLabel: "Nasdaq",
    aliases: ["NASDAQ", "XNAS"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "US",
    marketGroup: "United States",
  },
  {
    purchaseCode: "NYSE",
    displayLabel: "NYSE",
    aliases: ["NYSE", "XNYS"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "US",
    marketGroup: "United States",
  },
  {
    purchaseCode: "US",
    displayLabel: "US markets",
    aliases: ["US", "UNITEDSTATES", "ARCA"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "US",
    marketGroup: "United States",
  },
  {
    purchaseCode: "SW",
    displayLabel: "SIX Swiss Exchange",
    aliases: ["SW", "SIX", "SWISS", "XSWX", "ZURICH"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "SW",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "MI",
    displayLabel: "Borsa Italiana",
    aliases: ["MI", "MILAN", "ITALY", "XMIL"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "MI",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "MC",
    displayLabel: "Bolsa de Madrid",
    aliases: ["MC", "MADRID", "SPAIN", "XMAD"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "MC",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "ST",
    displayLabel: "Nasdaq Stockholm",
    aliases: ["ST", "STOCKHOLM", "SWEDEN", "XSTO"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "ST",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "HE",
    displayLabel: "Nasdaq Helsinki",
    aliases: ["HE", "HELSINKI", "FINLAND", "XHEL"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "HE",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "IR",
    displayLabel: "Euronext Dublin",
    aliases: ["IR", "DUBLIN", "IRELAND", "XDUB"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "IR",
    marketGroup: "Europe",
  },
  {
    purchaseCode: "VI",
    displayLabel: "Vienna Stock Exchange",
    aliases: ["VI", "VIENNA", "AUSTRIA", "XVIE"],
    userSelectable: true,
    validPurchaseVenue: true,
    providerPricingCode: "VI",
    marketGroup: "Europe",
  },
];

export function cleanExchangeToken(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

const byAlias = new Map<string, ExchangeRegistryEntry>();
const byPurchaseCode = new Map<string, ExchangeRegistryEntry>();

for (const entry of EXCHANGE_REGISTRY) {
  byPurchaseCode.set(entry.purchaseCode, entry);
  for (const alias of entry.aliases) {
    byAlias.set(cleanExchangeToken(alias), entry);
  }
  byAlias.set(cleanExchangeToken(entry.purchaseCode), entry);
  byAlias.set(cleanExchangeToken(entry.displayLabel), entry);
}

export function getExchangeRegistryEntry(
  raw: string | null | undefined,
): ExchangeRegistryEntry | null {
  if (!raw?.trim()) return null;
  return byAlias.get(cleanExchangeToken(raw)) ?? null;
}

export function getExchangeByPurchaseCode(
  purchaseCode: string | null | undefined,
): ExchangeRegistryEntry | null {
  if (!purchaseCode?.trim()) return null;
  return byPurchaseCode.get(purchaseCode.trim().toUpperCase()) ?? null;
}

/** Canonical purchase-exchange code, or null when unrecognized. */
export function normalizePurchaseExchangeCode(
  raw: string | null | undefined,
): string | null {
  return getExchangeRegistryEntry(raw)?.purchaseCode ?? null;
}

/** Direct provider pricing code for a purchase venue, or null when purchase-only. */
export function resolveProviderPricingExchange(
  raw: string | null | undefined,
): string | null {
  const entry = getExchangeRegistryEntry(raw);
  if (!entry) return null;
  return entry.providerPricingCode;
}

export function isValidPurchaseVenue(
  raw: string | null | undefined,
): boolean {
  return getExchangeRegistryEntry(raw)?.validPurchaseVenue === true;
}

export function isProviderPricingExchange(
  raw: string | null | undefined,
): boolean {
  if (!raw?.trim()) return false;
  const cleaned = cleanExchangeToken(raw);
  const entry = getExchangeRegistryEntry(cleaned);
  if (entry?.providerPricingCode === cleaned) {
    return true;
  }
  // Also accept when the raw token is itself a known provider pricing code.
  return EXCHANGE_REGISTRY.some(
    (item) => item.providerPricingCode === cleaned,
  );
}

export function listUserSelectableExchanges(): ExchangeRegistryEntry[] {
  return EXCHANGE_REGISTRY.filter((entry) => entry.userSelectable);
}

export function formatRegistryExchangeLabel(
  raw: string | null | undefined,
): string {
  const entry = getExchangeRegistryEntry(raw);
  if (entry) return entry.displayLabel;
  return raw?.trim() || "—";
}
