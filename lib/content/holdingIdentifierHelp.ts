/**
 * Beginner-friendly copy for ticker, ISIN, exchange and listing currency.
 * Presentation only — does not change matching or required fields.
 */

export const HOLDING_IDENTIFIER_TERMS = [
  "ticker",
  "isin",
  "exchange",
  "currency",
] as const;

export type HoldingIdentifierTerm = (typeof HOLDING_IDENTIFIER_TERMS)[number];

export type HoldingIdentifierHelpCopy = {
  title: string;
  summary: string;
  extra?: string;
};

export const HOLDING_IDENTIFIER_HELP: Record<
  HoldingIdentifierTerm,
  HoldingIdentifierHelpCopy
> = {
  ticker: {
    title: "Ticker / Symbol",
    summary:
      "The short market code for an investment. For example: VWCE or ASML.",
    extra: "Some investments have different tickers on different exchanges.",
  },
  isin: {
    title: "ISIN",
    summary:
      "A unique international identification number for an investment — like a passport number for a stock, ETF or bond.",
    extra:
      "You can usually find the ISIN on your broker’s product page or statement.",
  },
  exchange: {
    title: "Exchange / Venue",
    summary:
      "The market where the investment is traded, such as Xetra, Euronext or Nasdaq.",
    extra:
      "This matters when the same ticker exists on more than one exchange.",
  },
  currency: {
    title: "Currency",
    summary:
      "The currency in which this listing is traded, such as EUR or USD.",
    extra:
      "This is the trading currency of the listing, not necessarily your portfolio currency.",
  },
};

export const HOLDING_IDENTIFIER_WHERE_TITLE = "Where can I find this?";

export const HOLDING_IDENTIFIER_WHERE_ANSWER =
  "Usually on your broker’s product page, transaction confirmation or portfolio statement.";

export const HOLDING_IDENTIFIER_GLOSSARY_TRIGGER =
  "What do these fields mean?";

export const AMBIGUOUS_LISTING_HEADING = "Same investment, different market?";

export const AMBIGUOUS_LISTING_BODY =
  "Choose the listing shown by your broker.";

export const UNIDENTIFIED_HOLDING_MESSAGE =
  "We couldn’t confidently identify this investment.";

export const UNIDENTIFIED_LISTING_MESSAGE =
  "We couldn’t confidently identify this listing.";

export const UNIDENTIFIED_HOLDING_HINT =
  "Check the ticker, ISIN or exchange shown by your broker.";

export const UNIDENTIFIED_HOLDING_USER_MESSAGE = `${UNIDENTIFIED_HOLDING_MESSAGE} ${UNIDENTIFIED_HOLDING_HINT}`;

const KEEP_ORIGINAL_PATTERN =
  /temporarily unavailable|quota|rate.?limit|payment required|Enter a ticker|Expected format/i;

const TECHNICAL_MATCH_PATTERN =
  /EODHD|symbol resolution|venue mismatch|instrument identifier invalid|could not match this holding|No EODHD listing|Ticker provided without exchange|No listing matched this holding|We couldn't find a listing|Could not match this holding/i;

export function humanizeInstrumentMatchMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;
  if (KEEP_ORIGINAL_PATTERN.test(trimmed)) return trimmed;
  if (TECHNICAL_MATCH_PATTERN.test(trimmed)) {
    return UNIDENTIFIED_HOLDING_USER_MESSAGE;
  }
  return trimmed;
}
