import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_MODELS,
  PRODUCT_MODEL_TRIAL_HREF,
  getProductModel,
} from "@/lib/content/productModels";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Phase 2 product models catalog", () => {
  it("defines Invest, Crypto and Complete aligned to IntelligenceScope", () => {
    expect(PRODUCT_MODELS.map((m) => m.id)).toEqual([
      "invest",
      "crypto",
      "complete",
    ]);
    for (const model of PRODUCT_MODELS) {
      expect(model.scope).toBe(model.id);
      expect(model.publicName).toMatch(/^Tobailey /);
      expect(model.ctaHref).toBe(PRODUCT_MODEL_TRIAL_HREF);
      expect(model.shortDescription.length).toBeGreaterThan(20);
    }
    expect(getProductModel("complete").publicName).toBe("Tobailey Complete");
  });

  it("positions Crypto as holdings-first, not Bitcoin-only", () => {
    const crypto = getProductModel("crypto");
    const blob = `${crypto.headline} ${crypto.shortDescription} ${crypto.highlights.join(" ")}`;
    expect(blob.toLowerCase()).toMatch(/holdings|coins|owned-coin/);
    expect(blob.toLowerCase()).toMatch(/ethereum|coins|altcoins|supported/);
    expect(blob.toLowerCase()).not.toMatch(/bitcoin only|btc-only|only bitcoin/);
  });

  it("positions Complete as one ranked intelligence layer", () => {
    const complete = getProductModel("complete");
    const blob = `${complete.shortDescription} ${complete.highlights.join(" ")}`;
    expect(blob.toLowerCase()).toMatch(/one portfolio|one intelligence|ranks|ranked|coherent/);
    expect(blob.toLowerCase()).not.toMatch(/invest \+ crypto|stacked together/);
  });
});

describe("Phase 2 public homepage Four Questions + products", () => {
  it("renders Four Questions from the central catalog, not a duplicate config", () => {
    const section = read("components/marketing/PublicFourQuestionsSection.tsx");
    const home = read("app/page.tsx");
    const products = read("components/marketing/PublicProductModelsSection.tsx");

    expect(section).toContain('from "@/lib/services/fourQuestions/catalog"');
    expect(section).toContain("FOUR_QUESTIONS");
    expect(section).not.toMatch(/What happened\?/i);
    expect(home).toContain("PublicFourQuestionsSection");
    expect(home).toContain("PublicProductModelsSection");
    expect(home).toContain("Understand your money");
    expect(home).toContain("in four questions");
    expect(products).toContain('from "@/lib/content/productModels"');
    expect(products).toContain("PRODUCT_MODELS");
  });

  it("keeps public and authenticated question labels aligned", () => {
    expect(FOUR_QUESTIONS.map((q) => q.question)).toEqual([
      "What happened?",
      "What matters now?",
      "Am I on track?",
      "What’s ahead?",
    ]);
    const section = read("components/marketing/PublicFourQuestionsSection.tsx");
    expect(section).toContain("question.question");
    expect(section).toContain("question.visual");
    expect(section).toContain("publicPromise");
  });

  it("preserves Demo vs Trial CTAs without billing or scope gating", () => {
    const home = read("app/page.tsx");
    const products = read("components/marketing/PublicProductModelsSection.tsx");
    expect(home).toContain("Start your 7-day trial");
    expect(home).toContain("Explore Demo Portfolio");
    expect(home).toContain("/signup?intent=trial");
    expect(home).toContain("/explore");
    expect(home).not.toMatch(/stripe|checkout|entitlement|feature.?lock/i);
    expect(products).not.toMatch(/stripe|checkout|entitlement/i);
    expect(read("lib/content/productModels.ts")).toContain(
      "PRODUCT_MODEL_TRIAL_HREF",
    );
  });

  it("keeps Crypto / Complete positioning language on the public surface", () => {
    const products = read("lib/content/productModels.ts");
    expect(products).toContain("owned-coin");
    expect(products).toContain("Bitcoin, Ethereum");
    expect(products).toContain("One portfolio. One intelligence layer. Four answers");
  });
});
