import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import { HELP_CENTRE_SECTIONS } from "@/lib/content/helpCentre";

describe("Help Centre content", () => {
  it("covers the required Help Centre topics", () => {
    const titles = HELP_CENTRE_SECTIONS.map((section) => section.title);
    expect(titles).toEqual(
      expect.arrayContaining([
        "Getting started",
        "Adding holdings",
        "Import portfolio",
        "Goals",
        "Portfolio History & export",
        "Portfolio Health & Analysis",
        "News & Perspectives",
        "Demo vs personal trial",
        "Currencies & prices",
        "Frequently asked questions",
        "Glossary",
        "Disclaimers",
      ]),
    );
  });

  it("keeps answers short and free of advisory language", () => {
    for (const section of HELP_CENTRE_SECTIONS) {
      for (const item of section.questions) {
        expect(item.answer.length).toBeLessThan(420);
        expect(item.answer).not.toMatch(/\byou should buy\b/i);
        expect(item.answer).not.toMatch(/\brecommend buying\b/i);
      }
    }
  });

  it("wires the Help Centre into /faq without a marketing violet hero", () => {
    const page = readFileSync(
      path.resolve(process.cwd(), "app/faq/page.tsx"),
      "utf8",
    );
    expect(page).toContain("HELP_CENTRE_SECTIONS");
    expect(page).toContain("Help Centre");
    expect(page).toContain("appCardClass");
    expect(page).not.toContain("from-blue-200/40 via-violet-200");
    expect(page).not.toContain("font-black");
    expect(page).not.toContain("backToDashboard");
  });
});
