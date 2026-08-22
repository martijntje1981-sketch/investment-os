/**
 * UI helpers for listing-lookup messages after a purchase exchange is selected.
 * Does not change matching logic — only presentation.
 */

import { MANUAL_PRICING_SELECTION_TITLE } from "@/lib/client/holdingVenuePresentation";
import { humanizeInstrumentMatchMessage } from "@/lib/content/holdingIdentifierHelp";

const MULTIPLE_LISTING_PATTERN = /multiple listings/i;

export const PURCHASE_EXCHANGE_CONFIRMED_HELPER =
  `Purchase exchange confirmed. ${MANUAL_PRICING_SELECTION_TITLE}`;

export function isMultipleListingGuidanceMessage(
  message: string | null | undefined,
): boolean {
  if (!message?.trim()) return false;
  return MULTIPLE_LISTING_PATTERN.test(message);
}

/**
 * Maps engine multiple-listing warnings to neutral next-step copy so the
 * selected purchase exchange is not framed as an error.
 *
 * When a provider symbol is already resolved, skip selection guidance —
 * the live pricing source is shown as a read-only confirmation instead.
 */
export function formatListingLookupGuidance(
  messages: string[],
  options?: { hasResolvedProviderSymbol?: boolean },
): {
  guidance: string[];
  alerts: string[];
} {
  const guidance: string[] = [];
  const alerts: string[] = [];
  const skipSelectionGuidance = Boolean(options?.hasResolvedProviderSymbol);

  for (const message of messages) {
    if (isMultipleListingGuidanceMessage(message)) {
      if (
        !skipSelectionGuidance &&
        !guidance.includes(PURCHASE_EXCHANGE_CONFIRMED_HELPER)
      ) {
        guidance.push(PURCHASE_EXCHANGE_CONFIRMED_HELPER);
      }
      continue;
    }
    alerts.push(humanizeInstrumentMatchMessage(message));
  }

  return { guidance, alerts };
}
