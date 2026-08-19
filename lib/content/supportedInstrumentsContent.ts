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

/** Public crypto support overview — generic capability, not a coin allowlist. */
export function getSupportedCryptoDisplayRows(): SupportedCryptoDisplayRow[] {
  return [
    {
      name: "Active EODHD CC pairs",
      symbol: "BASE/QUOTE",
      livePricingStatus: "Supported",
      pricingRoute: "Direct pair when the exact CC listing exists",
      notes:
        "Tobailey treats EODHD's active CC coverage as the source of truth instead of a fixed coin list.",
    },
    {
      name: "Supported conversion pairs",
      symbol: "BASE/EUR",
      livePricingStatus: "Supported via conversion",
      pricingRoute: "USD source pair plus a verified live FX conversion when needed",
      notes:
        "If the direct CC pair is missing, Tobailey can reuse a supported USD pair when the required conversion path is already verified.",
    },
  ];
}

export const supportedInstrumentsHero = {
  title: "Supported instruments",
  subtitle:
    "See which investments currently support live pricing in Tobailey. Unsupported holdings can still be saved, but live prices and performance may be unavailable.",
} as const;

export const cryptoSectionCopy = {
  intro:
    "Crypto pricing depends on the selected trading pair and active EODHD CC coverage. When a direct pair is unavailable, Tobailey may use a supported USD pair and a live currency conversion rate.",
  footnote:
    "Coverage is pair-based, not coin-list based: a crypto can be supported for one trading pair and unavailable for another.",
} as const;

export const stocksEtfsSectionCopy = {
  title: "Stocks, ETFs, bond ETFs and ETCs",
  paragraphs: [
    "Most listed European and US stocks, ETFs, bond ETFs and ETCs can be matched using ticker, ISIN and exchange information.",
    "Live pricing depends on the instrument and market-data coverage.",
    "The same security may trade on multiple exchanges; Tobailey uses a reference exchange where appropriate.",
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
  body: "Most listed stocks, ETFs and ETCs, plus crypto pairs covered by EODHD CC, support live pricing. Unsupported holdings can still be saved.",
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
