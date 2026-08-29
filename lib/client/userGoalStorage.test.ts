import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  GOAL_UPDATED_EVENT,
  computeGoalProgress,
  isGoalAchieved,
  readSavedUserGoal,
  resolveGoalMissionTitle,
  resolveVisibleGoalState,
  saveUserGoal,
  shouldHandleGoalUpdatedEvent,
} from "@/lib/client/userGoalStorage";
import { goalStorageKey } from "@/lib/client/portfolioStorageKeys";
import type { GoalSettings } from "@/lib/types/portfolioStorage";

const USER = "auth-sub-goal-user";

const savedGoal: GoalSettings = {
  targetValue: 100_000,
  targetYear: 2036,
  monthlyContribution: 500,
  expectedAnnualReturn: 8,
};

describe("userGoalStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads and writes the saved goal for the current user", () => {
    saveUserGoal(USER, savedGoal);

    expect(readSavedUserGoal(USER)).toEqual(savedGoal);
    expect(localStorage.getItem(goalStorageKey(USER))).not.toBeNull();
  });

  it("returns no saved goal when none exists", () => {
    const state = resolveVisibleGoalState(USER, true);

    expect(state.hasSavedGoal).toBe(false);
    expect(state.goal).toBeNull();
    expect(resolveGoalMissionTitle(null, false)).toBe("Set your financial goal");
  });

  it("calculates progress and achieved state against the saved target", () => {
    expect(computeGoalProgress(50_000, savedGoal)).toBe(50);
    expect(isGoalAchieved(100_000, savedGoal)).toBe(true);
    expect(resolveGoalMissionTitle(savedGoal, true)).toBe(
      "Track your €100,000 goal",
    );
  });

  it("refreshes listeners when the goal-updated event fires", () => {
    let reloadCount = 0;
    const reload = () => {
      reloadCount += 1;
    };

    const handler = (event: Event) => {
      if (
        !shouldHandleGoalUpdatedEvent(
          (event as CustomEvent<{ userSub?: string }>).detail?.userSub,
          USER,
        )
      ) {
        return;
      }
      reload();
    };

    window.addEventListener(GOAL_UPDATED_EVENT, handler);
    saveUserGoal(USER, savedGoal);
    window.dispatchEvent(
      new CustomEvent(GOAL_UPDATED_EVENT, { detail: { userSub: USER } }),
    );
    window.removeEventListener(GOAL_UPDATED_EVENT, handler);

    expect(reloadCount).toBe(2);
  });
});
