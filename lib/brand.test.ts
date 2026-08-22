import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import { BRAND, BRAND_META, FOUR_QUESTION_COLORS } from "@/lib/brand";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Tobailey brand system", () => {
  it("exposes central brand constants", () => {
    expect(BRAND.name).toBe("Tobailey");
    expect(BRAND.tagline).toBe("Your investments. Understood.");
    expect(BRAND.primary).toBe("#5DB7FF");
    expect(BRAND.navy).toBe("#0B1F3A");
    expect(BRAND.navyHero).toBe("#0B1F3A");
    expect(BRAND.navyCard).toBe("#16324F");
    expect(BRAND_META.title).toBe("Tobailey");
  });

  it("ships SVG brand assets and PWA manifest", () => {
    for (const relativePath of [
      "public/brand/tobailey-icon.svg",
      "public/brand/tobailey-logo.svg",
      "public/brand/tobailey-logo-tagline.svg",
      "public/manifest.webmanifest",
      "app/icon.svg",
    ]) {
      expect(
        existsSync(path.resolve(process.cwd(), relativePath)),
        relativePath,
      ).toBe(true);
    }

    const manifest = read("public/manifest.webmanifest");
    expect(manifest).toContain('"name": "Tobailey"');
    expect(manifest).toContain("Your investments. Understood.");
  });

  it("wires brand tokens into globals.css", () => {
    const css = read("app/globals.css");
    expect(css).toContain("--brand-primary: #5db7ff");
    expect(css).toContain("--color-brand:");
    expect(css).toContain("--color-brand-navy:");
    expect(css).toContain("--color-navy-hero:");
    expect(css).toContain("--color-navy-card:");
    expect(css).toContain("--accent-green:");
    expect(css).toContain("--hero-premium-from: #b7dcf2");
    expect(css).toContain("--q1: #2eb5f0");
    expect(css).toContain("--q2: #2773c8");
    expect(css).toContain("--q3: #1b4f9a");
    expect(css).toContain("--q4: #163a66");
  });

  it("keeps Four Questions in one blue family with distinct depths", () => {
    expect(FOUR_QUESTION_COLORS.what_happened.accent).toBe("#2EB5F0");
    expect(FOUR_QUESTION_COLORS.what_matters_now.accent).toBe("#2773C8");
    expect(FOUR_QUESTION_COLORS.am_i_on_track.accent).toBe("#1B4F9A");
    expect(FOUR_QUESTION_COLORS.whats_ahead.accent).toBe("#163A66");
    expect(FOUR_QUESTION_COLORS.whats_ahead.deep).toBe("#0B1F3A");
  });

  it("keeps marketing and auth surfaces on the Tobailey logo", () => {
    expect(read("components/marketing/MarketingHeader.tsx")).toContain(
      "TobaileyLogo",
    );
    expect(read("app/login/page.tsx")).toContain("TobaileyLogo");
    expect(read("app/signup/page.tsx")).toContain("TobaileyLogo");
    expect(read("app/layout.tsx")).toContain("BRAND_META");
  });
});
