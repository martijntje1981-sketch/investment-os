import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  HELP_CENTRE_SECTIONS,
  searchHelpCentre,
} from "@/lib/content/helpCentre";

describe("Help Centre content", () => {
  it("covers the required Help Centre categories", () => {
    const titles = HELP_CENTRE_SECTIONS.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Getting started",
        "Understand your portfolio",
        "Reviews and notifications",
        "Your data",
        "Market data",
        "Account and access",
        "Safety and limitations",
        "Glossary",
        "Disclaimers",
      ]),
    );
  });

  it("uses Portfolio Scorecard and Your Review naming", () => {
    const blob = JSON.stringify(HELP_CENTRE_SECTIONS);
    expect(blob).toContain("Portfolio Scorecard");
    expect(blob).toContain("Your Review");
    expect(blob).toContain("Export Portfolio");
    expect(blob).not.toMatch(/Open Portfolio Health/);
    expect(blob).not.toContain("Portfolio Health & Analysis");
  });

  it("has unique question identifiers within each section", () => {
    for (const section of HELP_CENTRE_SECTIONS) {
      const questions = section.questions.map((item) => item.question);
      expect(new Set(questions).size).toBe(questions.length);
    }
  });

  it("keeps answers short and free of buy/sell advice", () => {
    for (const section of HELP_CENTRE_SECTIONS) {
      for (const item of section.questions) {
        expect(item.answer.length).toBeLessThan(520);
        expect(item.answer).not.toMatch(/\byou should buy\b/i);
        expect(item.answer).not.toMatch(/\brecommend buying\b/i);
      }
    }
  });

  it("finds common search phrases", () => {
    expect(searchHelpCentre("financial advice").length).toBeGreaterThan(0);
    expect(searchHelpCentre("Portfolio Scorecard").length).toBeGreaterThan(0);
    expect(searchHelpCentre("review email").length).toBeGreaterThan(0);
    expect(searchHelpCentre("export").length).toBeGreaterThan(0);
    expect(searchHelpCentre("previous close").length).toBeGreaterThan(0);
  });

  it("wires searchable Help Centre into /faq", () => {
    const page = readFileSync(
      path.resolve(process.cwd(), "app/faq/page.tsx"),
      "utf8",
    );
    expect(page).toContain("HelpCentreClient");
    expect(page).toContain("Help Centre");
    expect(page).not.toContain("from-blue-200/40 via-violet-200");
    expect(page).not.toContain("backToDashboard");
  });
});
