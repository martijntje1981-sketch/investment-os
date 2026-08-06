import { describe, expect, it } from "vitest";

import {
  buildGoalHeroProgressState,
  formatGoalHeroProgressPercent,
} from "@/lib/client/goalHeroProgress";

describe("buildGoalHeroProgressState", () => {
  it("returns 0% fill for an empty portfolio with a saved goal", () => {
    const state = buildGoalHeroProgressState({
      hasSavedGoal: true,
      progress: {
        hasGoal: true,
        goalReached: false,
        currentValue: 0,
        targetValue: 1_000_000,
      },
    });

    expect(state.status).toBe("ready");
    expect(state.fillPercent).toBe(0);
    expect(state.displayPercent).toBe(0);
  });

  it("fills approximately halfway at 50% completion", () => {
    const state = buildGoalHeroProgressState({
      hasSavedGoal: true,
      progress: {
        hasGoal: true,
        goalReached: false,
        currentValue: 500_000,
        targetValue: 1_000_000,
      },
    });

    expect(state.fillPercent).toBe(50);
    expect(state.displayPercent).toBe(50);
  });

  it("caps the visual fill at 100% while preserving above-target text", () => {
    const state = buildGoalHeroProgressState({
      hasSavedGoal: true,
      progress: {
        hasGoal: true,
        goalReached: true,
        currentValue: 1_250_000,
        targetValue: 1_000_000,
      },
    });

    expect(state.fillPercent).toBe(100);
    expect(state.displayPercent).toBe(125);
    expect(formatGoalHeroProgressPercent(state.displayPercent)).toBe("125.0%");
  });

  it("handles missing saved goals safely", () => {
    const state = buildGoalHeroProgressState({
      hasSavedGoal: false,
      progress: {
        hasGoal: false,
        goalReached: false,
        currentValue: 250_000,
        targetValue: 0,
      },
    });

    expect(state.status).toBe("unconfigured");
    expect(state.fillPercent).toBe(0);
  });

  it("handles zero or invalid targets safely", () => {
    const state = buildGoalHeroProgressState({
      hasSavedGoal: true,
      progress: {
        hasGoal: true,
        goalReached: false,
        currentValue: 100_000,
        targetValue: 0,
      },
    });

    expect(state.status).toBe("invalid-target");
  });
});
