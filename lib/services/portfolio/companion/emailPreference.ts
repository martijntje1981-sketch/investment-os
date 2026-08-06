/**
 * Monthly review email preference — default OFF.
 * Stored in user_settings.preferences without overwriting unrelated keys.
 * Delivery is gated by Resend config in the cron job — not by saving this preference.
 */

import { MONTHLY_REVIEW_EMAIL_PREF_KEY } from "@/lib/services/portfolio/companion/snapshotTypes";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PreferencesClient = { from: (table: string) => any };

export function readMonthlyReviewEmailOptIn(
  preferences: Record<string, unknown> | null | undefined,
): boolean {
  return preferences?.[MONTHLY_REVIEW_EMAIL_PREF_KEY] === true;
}

export async function fetchMonthlyReviewEmailOptIn(
  client: PreferencesClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client
    .from("user_settings")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Could not load email preference.");
  }

  const preferences =
    data?.preferences && typeof data.preferences === "object"
      ? (data.preferences as Record<string, unknown>)
      : {};

  return readMonthlyReviewEmailOptIn(preferences);
}

/**
 * Merge-update preferences JSON so unrelated keys stay intact.
 * Creates a settings row when missing so opt-in is never blocked by orphan accounts.
 */
export async function updateMonthlyReviewEmailOptIn(
  client: PreferencesClient,
  userId: string,
  optIn: boolean,
): Promise<boolean> {
  const { data: existing, error: readError } = await client
    .from("user_settings")
    .select("preferences")
    .eq("user_id", userId)
    .maybeSingle();

  if (readError) {
    throw new Error(readError.message || "Could not load settings.");
  }

  const current =
    existing?.preferences && typeof existing.preferences === "object"
      ? { ...(existing.preferences as Record<string, unknown>) }
      : {};

  current[MONTHLY_REVIEW_EMAIL_PREF_KEY] = optIn;
  current[`${MONTHLY_REVIEW_EMAIL_PREF_KEY}_updated_at`] =
    new Date().toISOString();

  if (!existing) {
    const { error: insertError } = await client.from("user_settings").insert({
      user_id: userId,
      preferences: current,
    });
    if (insertError) {
      throw new Error(insertError.message || "Could not save email preference.");
    }
    return optIn;
  }

  const { error: writeError } = await client
    .from("user_settings")
    .update({ preferences: current })
    .eq("user_id", userId);

  if (writeError) {
    throw new Error(writeError.message || "Could not save email preference.");
  }

  return optIn;
}

/** Whether Resend can send today. Preference saving does not depend on this. */
export function isMonthlyReviewEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim(),
  );
}
