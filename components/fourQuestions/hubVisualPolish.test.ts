import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { FOUR_QUESTIONS } from "@/lib/services/fourQuestions/catalog";

function read(relativePath: string): string {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("Four Question hubs visual brand polish", () => {
  const hub = read("components/fourQuestions/QuestionHubPage.tsx");
  const brandBar = read("components/fourQuestions/QuestionHubBrandBar.tsx");
  const compact = read("components/fourQuestions/FourQuestionsCompactNav.tsx");
  const watermark = read("components/fourQuestions/TobaileyMarkWatermark.tsx");
  const types = read("lib/services/fourQuestions/types.ts");

  it("adds a dark Tobailey brand bar with Dashboard return", () => {
    expect(hub).toContain("QuestionHubBrandBar");
    expect(brandBar).toContain("TobaileyLogo");
    expect(brandBar).toContain("onDark");
    expect(brandBar).toContain("DASHBOARD_PATH");
    expect(brandBar).toContain('data-testid="question-hub-brand-bar"');
    expect(brandBar).toContain('data-testid="question-hub-dashboard-link"');
    expect(brandBar).toContain("bg-[#0B1F3A]");
  });

  it("uses rich shared hub visual tokens for all four questions", () => {
    for (const q of FOUR_QUESTIONS) {
      expect(q.visual.hubHero).toMatch(/from-/);
      expect(q.visual.hubAnswer).toMatch(/border-l-/);
      expect(q.visual.navActive).toMatch(/shadow/);
      expect(q.visual.navIdle).toMatch(/from-/);
      expect(q.visual.hubPageWash).toMatch(/gradient/);
    }
    expect(types).toContain("hubHero");
    expect(types).toContain("navActive");
    expect(types).toContain("hubAnswer");
  });

  it("strengthens compact nav with per-question color, not white boxes", () => {
    expect(compact).toContain("navActive");
    expect(compact).toContain("navIdle");
    expect(compact).toContain("navLabelActive");
    expect(compact).not.toContain('"border-slate-200/80 bg-white/90');
    expect(compact).toContain('aria-current={isActive ? "page" : undefined}');
    expect(compact).toContain("Current question");
  });

  it("renders strong hero with T watermark and emphasized answer", () => {
    expect(hub).toContain("HubHero");
    expect(hub).toContain("TobaileyMarkWatermark");
    expect(hub).toContain("hubHero");
    expect(hub).toContain("hubAnswer");
    expect(hub).toContain("hubTintSection");
    expect(hub).toContain("hubPageWash");
    expect(watermark).toContain('data-testid="question-hub-t-watermark"');
    expect(watermark).toContain("pointer-events-none");
  });

  it("keeps one shared QuestionHubPage for all four hubs", () => {
    expect(read("components/fourQuestions/hubs/WhatHappenedHubPage.tsx")).toContain(
      "QuestionHubPage",
    );
    expect(read("components/fourQuestions/hubs/WhatMattersHubPage.tsx")).toContain(
      "QuestionHubPage",
    );
    expect(read("components/fourQuestions/hubs/OnTrackHubPage.tsx")).toContain(
      "QuestionHubPage",
    );
    expect(read("components/fourQuestions/hubs/WhatsAheadHubPage.tsx")).toContain(
      "QuestionHubPage",
    );
    expect(hub).toContain("buildFourQuestions");
    expect(hub).not.toContain("Stripe");
  });
});
