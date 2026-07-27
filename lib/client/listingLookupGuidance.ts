/**
 * UI helpers for listing-lookup messages after a purchase exchange is selected.
 * Does not change matching logic — only presentation.
 */

const MULTIPLE_LISTING_PATTERN = /multiple listings/i;

export const PURCHASE_EXCHANGE_CONFIRMED_HELPER =
  "Purchase exchange confirmed. Next, select the live pricing listing below.";

export function isMultipleListingGuidanceMessage(
  message: string | null | undefined,
): boolean {
  if (!message?.trim()) return false;
  return MULTIPLE_LISTING_PATTERN.test(message);
}

/**
 * Maps engine multiple-listing warnings to neutral next-step copy so the
 * selected purchase exchange is not framed as an error.
 */
export function formatListingLookupGuidance(
  messages: string[],
): {
  guidance: string[];
  alerts: string[];
} {
  const guidance: string[] = [];
  const alerts: string[] = [];

  for (const message of messages) {
    if (isMultipleListingGuidanceMessage(message)) {
      if (!guidance.includes(PURCHASE_EXCHANGE_CONFIRMED_HELPER)) {
        guidance.push(PURCHASE_EXCHANGE_CONFIRMED_HELPER);
      }
      continue;
    }
    alerts.push(message);
  }

  return { guidance, alerts };
}
