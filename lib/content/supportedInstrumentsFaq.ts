import { SUPPORTED_INSTRUMENTS_PATH } from "@/lib/content/supportedInstrumentsContent";

export type SupportedInstrumentsFaqEntry = {
  question: string;
  answer: string;
  link?: {
    href: string;
    label: string;
  };
};

export const whichInvestmentsSupportedFaq: SupportedInstrumentsFaqEntry = {
  question: "Which investments are supported?",
  answer:
    "Tobailey supports live pricing for many listed European and US stocks, ETFs and ETCs, as well as selected major cryptocurrencies. Availability depends on the exchange, listing, trading pair and market-data provider. Holdings that are not currently supported can still be saved, but live prices, performance and portfolio valuation may be unavailable.",
  link: {
    href: SUPPORTED_INSTRUMENTS_PATH,
    label: "View the current supported instruments",
  },
};

export const unsupportedInvestmentFaq: SupportedInstrumentsFaqEntry = {
  question: "What happens if my investment is not supported?",
  answer:
    "You can still save the holding. Tobailey will clearly show when live pricing is unavailable or when the instrument needs review. We continue to expand instrument and crypto support over time.",
};
