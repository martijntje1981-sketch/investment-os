/**
 * Period review email preferences — default OFF.
 * Stored in user_settings.preferences without overwriting unrelated keys.
 * Delivery is gated by Resend + Complete eligibility in the cron job —
 * not by saving this preference.
 */

import { MONTHLY_REVIEW_EMAIL_PREF_KEY } from "@/lib/services/portfolio/companion/snapshotTypes";

export const WEEKLY_REVIEW_EMAIL_PREF_KEY = "weekly_review_email_opt_in" as const;

export { MONTHLY_REVIEW_EMAIL_PREF_KEY };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PreferencesClient = { from: (table: string) => any };

export type PeriodReviewEmailKind = "weekly" | "monthly";

export type PeriodReviewEmailPreferences = {
  weeklyOptIn: boolean;
  monthlyOptIn: boolean;
};

function prefKey(kind: PeriodReviewEmailKind): string {
  return kind === "weekly"
    ? WEEKLY_REVIEW_EMAIL_PREF_KEY
    : MONTHLY_REVIEW_EMAIL_PREF_KEY;
}

function asPreferences(
  value: unknown,
): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

export function readReviewEmailOptIn(
  preferences: Record<string, unknown> | null | undefined,
  kind: PeriodReviewEmailKind,
): boolean {
  return preferences?.[prefKey(kind)] === true;
}

export function readMonthlyReviewEmailOptIn(
  preferences: Record<string, unknown> | null | undefined,
): boolean {
  return readReviewEmailOptIn(preferences, "monthly");
}

export function readWeeklyReviewEmailOptIn(
  preferences: Record<string, unknown> | null | undefined,
): boolean {
  return readReviewEmailOptIn(preferences, "weekly");
}

export function readPeriodReviewEmailPreferences(
  preferences: Record<string, unknown> | null | undefined,
): PeriodReviewEmailPreferences {
  return {
    weeklyOptIn: readWeeklyReviewEmailOptIn(preferences),
    monthlyOptIn: readMonthlyReviewEmailOptIn(preferences),
  };
}

async function loadPreferences(
  client: PreferencesClient,
  userId: string,
): Promise<{ rowExists: boolean; preferences: Record<string, unknown> }> {
  const { data, error } = await client
    .from("user_settings")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load email preference.");
  }

  return {
    rowExists: Boolean(data),
    preferences: asPreferences(data?.preferences),
  };
}

export async function fetchPeriodReviewEmailPreferences(
  client: PreferencesClient,
  userId: string,
): Promise<PeriodReviewEmailPreferences> {
  const loaded = await loadPreferences(client, userId);
  return readPeriodReviewEmailPreferences(loaded.preferences);
}

export async function fetchMonthlyReviewEmailOptIn(
  client: PreferencesClient,
  userId: string,
): Promise<boolean> {
  const prefs = await fetchPeriodReviewEmailPreferences(client, userId);
  return prefs.monthlyOptIn;
}

async function writePreferences(
  client: PreferencesClient,
  userId: string,
  rowExists: boolean,
  preferences: Record<string, unknown>,
): Promise<void> {
  if (!rowExists) {
    const { error: insertError } = await client.from("user_settings").insert({
      user_id: userId,
      preferences,
    });
    if (insertError) {
      throw new Error(insertError.message || "Could not save email preference.");
    }
    return;
  }

  const { error: writeError } = await client
    .from("user_settings")
    .update({ preferences })
    .eq("user_id", userId);

  if (writeError) {
    throw new Error(writeError.message || "Could not save email preference.");
  }
}

export async function updatePeriodReviewEmailPreferences(
  client: PreferencesClient,
  userId: string,
  patch: { weeklyOptIn?: boolean; monthlyOptIn?: boolean },
): Promise<PeriodReviewEmailPreferences> {
  const loaded = await loadPreferences(client, userId);
  const current = { ...loaded.preferences };
  const now = new Date().toISOString();

  if (typeof patch.weeklyOptIn === "boolean") {
    current[WEEKLY_REVIEW_EMAIL_PREF_KEY] = patch.weeklyOptIn;
    current[`${WEEKLY_REVIEW_EMAIL_PREF_KEY}_updated_at`] = now;
  }
  if (typeof patch.monthlyOptIn === "boolean") {
    current[MONTHLY_REVIEW_EMAIL_PREF_KEY] = patch.monthlyOptIn;
    current[`${MONTHLY_REVIEW_EMAIL_PREF_KEY}_updated_at`] = now;
  }

  await writePreferences(client, userId, loaded.rowExists, current);
  return readPeriodReviewEmailPreferences(current);
}

export async function updateMonthlyReviewEmailOptIn(
  client: PreferencesClient,
  userId: string,
  optIn: boolean,
): Promise<boolean> {
  const next = await updatePeriodReviewEmailPreferences(client, userId, {
    monthlyOptIn: optIn,
  });
  return next.monthlyOptIn;
}

/** Whether Resend can send today. Preference saving does not depend on this. */
export function isMonthlyReviewEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
}

export const isReviewEmailConfigured = isMonthlyReviewEmailConfigured;
