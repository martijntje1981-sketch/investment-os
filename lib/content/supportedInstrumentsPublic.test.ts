import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("supported instruments public experience", () => {
  it("keeps /supported-instruments outside protected routes", () => {
    const middleware = readFileSync(
      path.resolve(process.cwd(), "lib/supabase/middleware.ts"),
      "utf8",
    );

    expect(middleware).not.toContain('"/supported-instruments"');
    expect(middleware).not.toContain("'/supported-instruments'");
  });

  it("renders a public supported instruments page", () => {
    const page = readFileSync(
      path.resolve(process.cwd(), "app/supported-instruments/page.tsx"),
      "utf8",
    );

    expect(page).toContain("MarketingHeader");
    expect(page).toContain("Supported instruments");
    expect(page).toContain("getSupportedCryptoDisplayRows");
    expect(page).not.toContain("redirect(");
  });

  it("links to supported instruments from the homepage footer and pricing section", () => {
    const homePage = readFileSync(
      path.resolve(process.cwd(), "app/page.tsx"),
      "utf8",
    );

    expect(homePage).toContain("SUPPORTED_INSTRUMENTS_PATH");
    expect(homePage).toContain("Supported instruments");
    expect(homePage).toContain("pricingAvailabilityNote");
  });

  it("links to supported instruments from the upload screen", () => {
    const uploadPage = readFileSync(
      path.resolve(process.cwd(), "app/upload/page.tsx"),
      "utf8",
    );
    const callout = readFileSync(
      path.resolve(
        process.cwd(),
        "components/marketing/SupportedInstrumentsCallout.tsx",
      ),
      "utf8",
    );

    expect(uploadPage).toContain("SupportedInstrumentsCallout");
    expect(callout).toContain("SUPPORTED_INSTRUMENTS_PATH");
    expect(callout).toContain("uploadSupportedInstrumentsCallout.linkLabel");
  });

  it("includes both support FAQ entries on the public FAQ page", () => {
    const helpCentre = readFileSync(
      path.resolve(process.cwd(), "lib/content/helpCentre.ts"),
      "utf8",
    );
    const faqPage = readFileSync(
      path.resolve(process.cwd(), "app/faq/page.tsx"),
      "utf8",
    );
    const faqContent = readFileSync(
      path.resolve(process.cwd(), "lib/content/supportedInstrumentsFaq.ts"),
      "utf8",
    );

    expect(helpCentre).toContain("whichInvestmentsSupportedFaq");
    expect(helpCentre).toContain("unsupportedInvestmentFaq");
    expect(faqPage).toContain("HELP_CENTRE_SECTIONS");
    expect(faqContent).toContain("Which investments are supported?");
    expect(faqContent).toContain("What happens if my investment is not supported?");
    expect(faqContent).toContain("View the current supported instruments");
  });

  it("shows support status labels during import review", () => {
    const reviewList = readFileSync(
      path.resolve(process.cwd(), "components/import/ImportReviewList.tsx"),
      "utf8",
    );
    const autoList = readFileSync(
      path.resolve(process.cwd(), "components/import/ImportSummaryCard.tsx"),
      "utf8",
    );

    expect(reviewList).toContain("SupportStatusBadge");
    expect(reviewList).toContain("resolveImportRowInstrumentSupportStatus");
    expect(autoList).toContain("SupportStatusBadge");
    expect(autoList).toContain("resolveImportRowInstrumentSupportStatus");
  });
});
