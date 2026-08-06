import { describe, expect, it, vi, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  isMonthlyReviewEmailConfigured,
  readMonthlyReviewEmailOptIn,
  updateMonthlyReviewEmailOptIn,
} from "@/lib/services/portfolio/companion/emailPreference";
import { MONTHLY_REVIEW_EMAIL_PREF_KEY } from "@/lib/services/portfolio/companion/snapshotTypes";

function read(relativePath: string) {
  return readFileSync(path.resolve(process.cwd(), relativePath), "utf8");
}

describe("monthly review email preference", () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;

  afterEach(() => {
    process.env.RESEND_API_KEY = previousKey;
    process.env.EMAIL_FROM = previousFrom;
  });

  it("defaults OFF and uses the exact preference key", () => {
    expect(MONTHLY_REVIEW_EMAIL_PREF_KEY).toBe("monthly_review_email_opt_in");
    expect(readMonthlyReviewEmailOptIn(null)).toBe(false);
    expect(readMonthlyReviewEmailOptIn({})).toBe(false);
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
    expect(insert).toHaveBeenCalled();
    const payload = insert.mock.calls[0]?.[0] as {
      preferences: Record<string, unknown>;
    };
    expect(payload.preferences[MONTHLY_REVIEW_EMAIL_PREF_KEY]).toBe(true);
  });

  it("keeps toggle usable without Resend and rolls back on failure in UI", () => {
    const toggle = read("components/companion/MonthlyReviewEmailToggle.tsx");
    expect(toggle).toContain("setOptIn(previous)");
    expect(toggle).not.toContain("!configured");
    expect(toggle).toContain("disabledForDemo");
    expect(toggle).toContain("deliveryReady");
    expect(toggle).not.toMatch(/Weekly review email/i);
  });

  it("Settings and Review share the same toggle component and key", () => {
    const settings = read("app/settings/page.tsx");
    const review = read("components/companion/CompanionReviewPage.tsx");
    const route = read("app/api/review/email-preference/route.ts");
    expect(settings).toContain("MonthlyReviewEmailToggle");
    expect(settings).toContain("disabledForDemo");
    expect(review).toContain("MonthlyReviewEmailToggle");
    expect(route).toContain("monthly_review_email_opt_in");
  });
});
