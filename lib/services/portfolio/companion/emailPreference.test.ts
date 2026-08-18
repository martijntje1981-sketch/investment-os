import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  isMonthlyReviewEmailConfigured,
  readMonthlyReviewEmailOptIn,
  readWeeklyReviewEmailOptIn,
  updateMonthlyReviewEmailOptIn,
  updatePeriodReviewEmailPreferences,
  WEEKLY_REVIEW_EMAIL_PREF_KEY,
} from "@/lib/services/portfolio/companion/emailPreference";
import { MONTHLY_REVIEW_EMAIL_PREF_KEY } from "@/lib/services/portfolio/companion/snapshotTypes";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("period review email preferences", () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;

  afterEach(() => {
    process.env.RESEND_API_KEY = previousKey;
    process.env.EMAIL_FROM = previousFrom;
  });

  it("defaults weekly and monthly opt-in OFF", () => {
    expect(WEEKLY_REVIEW_EMAIL_PREF_KEY).toBe("weekly_review_email_opt_in");
    expect(MONTHLY_REVIEW_EMAIL_PREF_KEY).toBe("monthly_review_email_opt_in");
    expect(readWeeklyReviewEmailOptIn(null)).toBe(false);
    expect(readWeeklyReviewEmailOptIn({})).toBe(false);
    expect(readMonthlyReviewEmailOptIn(null)).toBe(false);
    expect(readMonthlyReviewEmailOptIn({})).toBe(false);
    expect(
      readWeeklyReviewEmailOptIn({ [WEEKLY_REVIEW_EMAIL_PREF_KEY]: true }),
    ).toBe(true);
    expect(
      readMonthlyReviewEmailOptIn({ [MONTHLY_REVIEW_EMAIL_PREF_KEY]: true }),
    ).toBe(true);
  });

  it("does not require Resend to save preference (API allows opt-in without config)", () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    expect(isMonthlyReviewEmailConfigured()).toBe(false);

    const route = read("app/api/review/email-preference/route.ts");
    expect(route).not.toContain("status: 503");
    expect(route).toContain("Preference may be saved even when Resend");
    expect(route).toContain("weeklyOptIn");
    expect(route).toContain("monthly_review_email_opt_in");
    expect(route).toContain("weekly_review_email_opt_in");
  });

  it("upserts settings when the row is missing", async () => {
    const insert = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: null, error: null }),
          }),
        }),
        insert,
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      })),
    };

    await expect(
      updateMonthlyReviewEmailOptIn(client, "user-1", true),
    ).resolves.toBe(true);
    const weekly = await updatePeriodReviewEmailPreferences(client, "user-1", {
      weeklyOptIn: true,
    });
    expect(weekly.weeklyOptIn).toBe(true);
    expect(insert).toHaveBeenCalled();
    const payload = insert.mock.calls[0]?.[0] as {
      preferences: Record<string, unknown>;
    };
    expect(payload.preferences[MONTHLY_REVIEW_EMAIL_PREF_KEY]).toBe(true);
  });

  it("keeps Settings toggles usable without Resend", () => {
    const prefs = read("components/companion/PeriodReviewEmailPreferences.tsx");
    expect(prefs).toContain("disabledForDemo");
    expect(prefs).toContain("deliveryReady");
    expect(prefs).toContain("Weekly personal review");
    expect(prefs).toContain("Monthly personal review");
    expect(prefs).toContain("You can change this anytime");
    expect(prefs).toContain("Personal review emails are included with Complete");
    expect(prefs).not.toContain("!configured");
  });

  it("Settings and Review share the same preference component", () => {
    const settings = read("app/settings/page.tsx");
    const review = read("components/companion/CompanionReviewPage.tsx");
    expect(settings).toContain("PeriodReviewEmailPreferences");
    expect(settings).toContain("disabledForDemo");
    expect(settings).toContain("PlanStatusCard");
    expect(review).toContain("PeriodReviewEmailPreferences");
  });
});
