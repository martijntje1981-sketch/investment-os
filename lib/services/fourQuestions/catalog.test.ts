import { describe, expect, it } from "vitest";

import {
  FOUR_QUESTIONS,
  FOUR_QUESTION_HUB_PATHS,
  resolveFourQuestionsPagePlacement,
} from "@/lib/services/fourQuestions/catalog";

describe("Four Questions central catalog", () => {
  it("defines four questions with hub routes and visual identity", () => {
    expect(FOUR_QUESTIONS).toHaveLength(4);
    expect(FOUR_QUESTIONS.map((q) => q.id)).toEqual([
      "what_happened",
      "what_matters_now",
      "am_i_on_track",
      "whats_ahead",
    ]);
    expect(FOUR_QUESTION_HUB_PATHS.what_happened).toBe("/what-happened");
    expect(FOUR_QUESTION_HUB_PATHS.what_matters_now).toBe("/what-matters");
    expect(FOUR_QUESTION_HUB_PATHS.am_i_on_track).toBe("/on-track");
    expect(FOUR_QUESTION_HUB_PATHS.whats_ahead).toBe("/whats-ahead");
    for (const q of FOUR_QUESTIONS) {
      expect(q.visual.panel.length).toBeGreaterThan(0);
      expect(q.visual.onDark.length).toBeGreaterThan(0);
      expect(q.visual.hubHero).toMatch(/gradient/);
      expect(q.visual.hubAnswer).toMatch(/border-l/);
      expect(q.visual.navActive).toMatch(/gradient/);
      expect(q.visual.navIdle).not.toMatch(/bg-white(?![/\w])/);
      expect(q.hubPath).toBe(FOUR_QUESTION_HUB_PATHS[q.id]);
      expect(q.shortNavLabel.length).toBeGreaterThan(0);
      expect(q.humanQuestion.length).toBeGreaterThan(0);
      expect(q.publicPromise.length).toBeGreaterThan(0);
      expect(q.publicDetail.length).toBeGreaterThan(0);
    }
  });

  it("keeps public promise copy separate from personal dashboard answers", () => {
    for (const q of FOUR_QUESTIONS) {
      expect(q.publicPromise).not.toMatch(/€|%|your portfolio was/i);
    }
  });

  it("classifies authenticated routes for compact nav", () => {
    expect(resolveFourQuestionsPagePlacement("/dashboard")).toEqual({
      show: true,
      active: null,
      reason: "neutral_overview",
    });
    expect(resolveFourQuestionsPagePlacement("/portfolio")).toEqual({
      show: true,
      active: null,
      reason: "neutral_foundation",
    });
    expect(resolveFourQuestionsPagePlacement("/analysis")).toEqual({
      show: true,
      active: null,
      reason: "neutral_map",
    });

    function activeOf(path: string) {
      const placement = resolveFourQuestionsPagePlacement(path);
      return placement.show ? placement.active : null;
    }

    expect(activeOf("/news")).toBe("what_matters_now");
    expect(activeOf("/goals")).toBe("am_i_on_track");
    expect(activeOf("/portfolio-history")).toBe("what_happened");
    expect(activeOf("/events")).toBe("whats_ahead");
    expect(activeOf("/review")).toBe("what_happened");
    expect(activeOf("/portfolio-health")).toBe("am_i_on_track");
    expect(activeOf("/market-pulse")).toBe("what_matters_now");
    expect(resolveFourQuestionsPagePlacement("/settings").show).toBe(false);
    expect(resolveFourQuestionsPagePlacement("/upload").show).toBe(false);
    expect(activeOf("/what-happened")).toBe("what_happened");
  });
});
