import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  PRODUCT_MODELS,
  PRODUCT_MODEL_TRIAL_HREF,
  PRODUCT_POSITIONING,
  getProductModel,
} from "@/lib/content/productModels";
import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";
import { COMPLETE_MONTHLY_PRICE_LABEL } from "@/lib/services/productAccess";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("public Free vs Complete plans", () => {
  it("defines only Free and Complete public plans", () => {
    expect(PRODUCT_MODELS.map((m) => m.id)).toEqual(["free", "complete"]);
    for (const model of PRODUCT_MODELS) {
      expect(model.publicName).toMatch(/^Tobailey /);
      expect(model.ctaHref).toBe(PRODUCT_MODEL_TRIAL_HREF);
      expect(model.shortDescription.length).toBeGreaterThan(20);
    }
    expect(getProductModel("free").publicName).toBe("Tobailey Free");
    expect(getProductModel("complete").publicName).toBe("Tobailey Complete");
    expect(getProductModel("complete").priceLabel).toBe(
      COMPLETE_MONTHLY_PRICE_LABEL,
    );
    expect(getProductModel("free").priceLabel).toBe("€0");
  });

  it("positions Free as useful core intelligence, not an empty shell", () => {
    const free = getProductModel("free");
    const blob = `${free.headline} ${free.shortDescription} ${free.highlights.join(" ")}`;
    expect(blob.toLowerCase()).toMatch(/portfolio tracking/);
    expect(blob.toLowerCase()).toMatch(/four questions/);
    expect(blob.toLowerCase()).toMatch(/limited intelligence depth/);
    expect(blob.toLowerCase()).not.toMatch(/\bads?\b/);
  });

  it("positions Complete as full depth without claiming unreleased evidence layers", () => {
    const complete = getProductModel("complete");
    const blob = `${complete.shortDescription} ${complete.highlights.join(" ")}`;
    expect(blob.toLowerCase()).toMatch(/everything in/);
    expect(blob.toLowerCase()).toMatch(/full intelligence depth/);
    expect(blob.toLowerCase()).not.toMatch(/what changed/);
    expect(blob.toLowerCase()).not.toMatch(/data confidence/);
  });
});

describe("Phase 2 public homepage Four Questions + plans", () => {
  it("renders Four Questions from the central catalog, not a duplicate config", () => {
    const section = read("components/marketing/PublicFourQuestionsSection.tsx");
    const home = read("app/page.tsx");
    const products = read("components/marketing/PublicProductModelsSection.tsx");

    expect(section).toContain('from "@/lib/services/fourQuestions/catalog"');
    expect(section).toContain("FOUR_QUESTIONS");
    expect(section).not.toMatch(/What happened\?/i);
    expect(home).toContain("PublicProductModelsSection");
    expect(home).toContain("Understand your money");
    expect(home).toContain("in four questions");
    expect(products).toContain('from "@/lib/content/productModels"');
    expect(products).toContain("PRODUCT_MODELS");
    expect(products).toContain("PRODUCT_POSITIONING");
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
    expect(home).toContain("Start with 14 days of Complete");
    expect(home).toContain("Explore Demo Portfolio");
    expect(home).toContain("/signup?intent=trial");
    expect(home).toContain("/explore");
    expect(home).not.toMatch(/stripe|checkout|entitlement|feature.?lock/i);
    expect(products).not.toMatch(/stripe|checkout|entitlement/i);
    expect(read("lib/content/productModels.ts")).toContain(
      "PRODUCT_MODEL_TRIAL_HREF",
    );
  });

  it("uses Free vs Complete positioning on public surfaces and drops the three-product model", () => {
    const models = read("lib/content/productModels.ts");
    const products = read("components/marketing/PublicProductModelsSection.tsx");
    const home = read("app/page.tsx");
    const pricing = read("app/pricing/page.tsx");
    const header = read("components/marketing/MarketingHeader.tsx");

    expect(PRODUCT_POSITIONING.title).toBe(
      "Start with everything. Keep what you need.",
    );
    expect(models).toContain("Tobailey Free");
    expect(models).toContain("Tobailey Complete");
    expect(models).not.toContain("Tobailey Invest");
    expect(models).not.toContain("Tobailey Crypto");
    expect(products).toContain("PRODUCT_POSITIONING.title");
    expect(products).toContain("14 days of Complete");
    expect(products).not.toContain("Three ways to use Tobailey");
    expect(products).not.toContain("Product choice is positioning for now");
    expect(home).not.toContain("Three ways to use Tobailey");
    expect(home).not.toContain("#products");
    expect(pricing).not.toContain("One plan. Complete clarity");
    expect(pricing).toContain("Tobailey Free");
    expect(header).toContain("/#plans");
    expect(header).not.toContain("/#products");
  });
});
