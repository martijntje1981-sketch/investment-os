import {
  listLivePricedCryptoBaseAssets,
  type CryptoBaseAssetEntry,
  type CryptoPricingRouteKind,
} from "@/lib/services/portfolio/cryptoBaseAssetRegistry";

export const SUPPORTED_INSTRUMENTS_PATH = "/supported-instruments";

export type InstrumentSupportStatusId =
  | "supported"
  | "supported_via_conversion"
  | "pending_match"
  | "not_supported"
  | "live_price_unavailable";

export type InstrumentSupportStatusDefinition = {
  id: InstrumentSupportStatusId;
  label: string;
  description: string;
};

export const INSTRUMENT_SUPPORT_STATUSES: readonly InstrumentSupportStatusDefinition[] =
  [
    {
      id: "supported",
      label: "Supported",
      description: "Live pricing is available.",
    },
    {
      id: "supported_via_conversion",
      label: "Supported via conversion",
      description:
        "The instrument is priced using a supported market pair plus a live exchange rate.",
    },
    {
      id: "pending_match",
      label: "Pending match",
      description:
        "The holding was imported but still needs instrument matching or review.",
    },
    {
      id: "not_supported",
      label: "Not currently supported",
      description:
        "The holding can be saved, but live pricing and performance are not yet available.",
    },
    {
      id: "live_price_unavailable",
      label: "Live price unavailable",
      description:
        "The instrument is supported in principle, but the required market price or conversion rate is temporarily unavailable.",
    },
  ] as const;

export type SupportedCryptoDisplayRow = {
  name: string;
  symbol: string;
  livePricingStatus: string;
  pricingRoute: string;
  notes: string;
};

const CRYPTO_PRICING_ROUTE_LABELS: Record<CryptoPricingRouteKind, string> = {
  direct_or_converted:
    "Direct pair when available; otherwise USD pair + live FX conversion",
  direct_when_available: "Direct market pair when available from the provider",
};

function buildCryptoDisplayRow(entry: CryptoBaseAssetEntry): SupportedCryptoDisplayRow {
  return {
    name: entry.name,
    symbol: entry.symbol,
    livePricingStatus: entry.livePricing ? "Supported" : "Not currently supported",
    pricingRoute: CRYPTO_PRICING_ROUTE_LABELS[entry.pricingRoute],
    notes:
      entry.publicNote ??
      "Availability depends on the selected trading pair and provider coverage.",
  };
}

/** Public supported-crypto rows — sourced from the live-pricing registry only. */
export function getSupportedCryptoDisplayRows(): SupportedCryptoDisplayRow[] {
  return listLivePricedCryptoBaseAssets().map(buildCryptoDisplayRow);
}

export const supportedInstrumentsHero = {
  title: "Supported instruments",
  subtitle:
    "See which investments currently support live pricing in Investment OS. Unsupported holdings can still be saved, but live prices and performance may be unavailable.",
} as const;

export const cryptoSectionCopy = {
  intro:
    "Crypto pricing depends on the selected trading pair and market-data availability. When a direct pair is unavailable, Investment OS may use a supported USD pair and a live currency conversion rate.",
  footnote:
    "Crypto assets not listed here can still be saved, but live pricing may not yet be available.",
} as const;

export const stocksEtfsSectionCopy = {
  title: "Stocks, ETFs and ETCs",
  paragraphs: [
    "Most listed European and US stocks, ETFs and ETCs can be matched using ticker, ISIN and exchange information.",
    "Live pricing depends on the instrument and market-data coverage.",
    "The same security may trade on multiple exchanges; Investment OS uses a reference exchange where appropriate.",
    "An unsupported or unmatched holding can still be saved for manual review.",
  ],
  notice:
    "Availability can differ by exchange, listing and currency. A successful upload does not always guarantee live pricing.",
} as const;

export const supportedInstrumentsCta = {
  title: "Missing an instrument?",
  body: "Tell us which instrument, exchange or crypto pair you would like us to support.",
  buttonLabel: "Contact us",
  contactPath: "/contact",
} as const;

export const uploadSupportedInstrumentsCallout = {
  title: "Supported instruments",
  body: "Most listed stocks, ETFs and ETCs, plus selected major cryptocurrencies, support live pricing. Unsupported holdings can still be saved.",
  linkLabel: "View supported instruments",
} as const;

export const pricingAvailabilityNote = {
  text: "Live pricing depends on instrument and market-data availability.",
  linkLabel: "View supported instruments",
} as const;

export function getInstrumentSupportStatusDefinition(
  id: InstrumentSupportStatusId,
): InstrumentSupportStatusDefinition {
  const match = INSTRUMENT_SUPPORT_STATUSES.find((status) => status.id === id);
  if (!match) {
    throw new Error(`Unknown instrument support status: ${id}`);
  }
  return match;
}

export function getInstrumentSupportStatusLabel(id: InstrumentSupportStatusId): string {
  return getInstrumentSupportStatusDefinition(id).label;
}
