import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  AMBIGUOUS_LISTING_BODY,
  AMBIGUOUS_LISTING_HEADING,
  HOLDING_IDENTIFIER_GLOSSARY_TRIGGER,
  HOLDING_IDENTIFIER_HELP,
  HOLDING_IDENTIFIER_TERMS,
  HOLDING_IDENTIFIER_WHERE_ANSWER,
  HOLDING_IDENTIFIER_WHERE_TITLE,
  humanizeInstrumentMatchMessage,
  UNIDENTIFIED_HOLDING_USER_MESSAGE,
} from "@/lib/content/holdingIdentifierHelp";
import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";
import { AUTO_IMPORT_THRESHOLD, REVIEW_THRESHOLD } from "@/lib/services/import/confidencePolicy";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("holding identifier help", () => {
  const helper = read("components/import/HoldingIdentifierHelp.tsx");
  const review = read("components/import/ImportReviewList.tsx");
  const exchange = read("components/import/ExchangeFieldEditor.tsx");
  const picker = read("components/instruments/ListingCandidatePicker.tsx");
  const portfolio = read("app/portfolio/page.tsx");
  const upload = read("app/upload/page.tsx");
  const matchEngine = read("lib/services/instruments/instrumentMatchEngine.ts");
  const matchRoute = read("app/api/instruments/match/route.ts");
  const parser = read("lib/services/import/spreadsheetParser.ts");

  it("A. Ticker help exists", () => {
    expect(HOLDING_IDENTIFIER_HELP.ticker.title).toBe("Ticker / Symbol");
    expect(HOLDING_IDENTIFIER_HELP.ticker.summary).toMatch(/VWCE or ASML/);
    expect(HOLDING_IDENTIFIER_HELP.ticker.extra).toMatch(/different tickers/);
    expect(read("components/portfolio/AddInvestmentHoldingForm.tsx")).toContain(
      'term="ticker"',
    );
    expect(review).toContain('field === "ticker"');
    expect(review).toContain("HoldingIdentifierLabel");
  });

  it("B. ISIN help exists", () => {
    expect(HOLDING_IDENTIFIER_HELP.isin.title).toBe("ISIN");
    expect(HOLDING_IDENTIFIER_HELP.isin.summary).toMatch(/passport number/);
    expect(HOLDING_IDENTIFIER_HELP.isin.extra).toMatch(/broker/);
    expect(read("components/portfolio/AddInvestmentHoldingForm.tsx")).toContain(
      'helpTerm="isin"',
    );
    expect(review).toContain('field === "isin"');
  });

  it("C. Exchange help exists", () => {
    expect(HOLDING_IDENTIFIER_HELP.exchange.title).toBe("Exchange / Venue");
    expect(HOLDING_IDENTIFIER_HELP.exchange.summary).toMatch(/Xetra/);
    expect(HOLDING_IDENTIFIER_HELP.exchange.extra).toMatch(/more than one exchange/);
    expect(exchange).toContain('term="exchange"');
  });

  it("D. Currency help exists", () => {
    expect(HOLDING_IDENTIFIER_HELP.currency.title).toBe("Currency");
    expect(HOLDING_IDENTIFIER_HELP.currency.summary).toMatch(/EUR or USD/);
    expect(HOLDING_IDENTIFIER_HELP.currency.extra).toMatch(
      /not necessarily your portfolio currency/,
    );
    expect(picker).toContain('term="currency"');
  });

  it("E. user can ignore all help and continue normally", () => {
    expect(HOLDING_IDENTIFIER_GLOSSARY_TRIGGER).toBe("What do these fields mean?");
    expect(helper).toContain("useState(false)");
    expect(helper).not.toContain("defaultOpen");
    expect(review).toContain("HoldingIdentifierGlossaryDisclosure");
    expect(review).toContain("Confirm this holding");
    expect(HOLDING_IDENTIFIER_TERMS).toEqual([
      "ticker",
      "isin",
      "exchange",
      "currency",
    ]);
  });

  it("F. help does not add required fields", () => {
    const addForm = read("components/portfolio/AddInvestmentHoldingForm.tsx");
    expect(addForm).toContain('label="ISIN (optional)"');
    expect(addForm).toContain('helpTerm="isin"');
    expect(addForm).toContain("required={false}");
    expect(addForm).toContain("allowFreeText");
    expect(HOLDING_IDENTIFIER_HELP.isin.summary).not.toMatch(/required/i);
    expect(HOLDING_IDENTIFIER_HELP.ticker.summary).not.toMatch(/required/i);
  });

  it("G. unresolved-row flow still works", () => {
    expect(review).toContain("Needs your help");
    expect(review).toContain("canConfirmImportRow");
    expect(review).toContain("HoldingIdentifierGlossaryDisclosure");
    expect(upload).not.toContain("HoldingIdentifierGlossaryDisclosure");
    expect(upload).not.toContain("What do these fields mean?");
  });

  it("H. manual Add Holding search flow is search-first", () => {
    const addForm = read("components/portfolio/AddInvestmentHoldingForm.tsx");
    expect(portfolio).toContain("lookupListing");
    expect(addForm).toContain("Find listing");
    expect(addForm).toContain("Search by name, ticker or ISIN");
    expect(addForm).toContain("ISIN (optional)");
    expect(addForm).toContain("More search options");
    expect(addForm).toContain("add-holding-search");
    expect(addForm).not.toContain("Tobailey infers the instrument type");
  });

  it("I. mobile helper is not hover-only", () => {
    expect(helper).toContain("min-h-[44px]");
    expect(helper).toContain("min-w-[44px]");
    expect(helper).toContain("aria-expanded");
    expect(helper).toContain("text-[15px]");
    expect(helper).not.toContain("onMouseEnter");
    expect(helper).not.toContain("onMouseOver");
    expect(helper).not.toContain("title=");
  });

  it("J. no matching/API logic changed", () => {
    expect(matchEngine).not.toContain("holdingIdentifierHelp");
    expect(matchRoute).not.toContain("holdingIdentifierHelp");
    expect(parser).not.toContain("holdingIdentifierHelp");
    expect(AUTO_IMPORT_THRESHOLD).toBe(0.94);
    expect(REVIEW_THRESHOLD).toBe(0.82);
  });

  it("glossary includes where-to-find copy", () => {
    expect(HOLDING_IDENTIFIER_WHERE_TITLE).toBe("Where can I find this?");
    expect(HOLDING_IDENTIFIER_WHERE_ANSWER).toMatch(/broker’s product page/);
    expect(helper).toContain("HOLDING_IDENTIFIER_WHERE_TITLE");
  });

  it("ambiguous listing copy is beginner-friendly", () => {
    expect(AMBIGUOUS_LISTING_HEADING).toBe("Same investment, different market?");
    expect(AMBIGUOUS_LISTING_BODY).toBe("Choose the listing shown by your broker.");
    expect(picker).toContain("AmbiguousListingHelp");
    expect(picker).not.toContain("Live pricing source");
    expect(review).not.toContain("% confidence");
  });

  it("humanizes technical match errors without touching quota copy", () => {
    expect(
      humanizeInstrumentMatchMessage(
        "No EODHD listing found for ticker VWCE. Add an ISIN or exchange to resolve.",
      ),
    ).toBe(UNIDENTIFIED_HOLDING_USER_MESSAGE);
    expect(
      humanizeInstrumentMatchMessage(
        "Could not match this holding to a listed instrument.",
      ),
    ).toBe(UNIDENTIFIED_HOLDING_USER_MESSAGE);
    expect(humanizeInstrumentMatchMessage(MATCHING_UNAVAILABLE_WARNING)).toBe(
      MATCHING_UNAVAILABLE_WARNING,
    );
  });
});
