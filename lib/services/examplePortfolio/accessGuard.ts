/**
 * Central server-side entitlement guard for authenticated portfolio APIs.
 * Middleware still blocks pages; this is the sole API protection layer.
 */

import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";

import {
  isExampleExpired,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";

export const EXAMPLE_EXPIRED_API_CODE = "EXAMPLE_EXPIRED" as const;

export type ExampleAccessDecision =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

/**
 * Block expired example accounts from reading/mutating protected portfolio APIs.
 * Converted example users and normal users pass through unchanged.
 */
export function assertExamplePortfolioApiAccess(
  user: User | null | undefined,
  options?: { now?: Date },
): ExampleAccessDecision {
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          code: SYNC_ERROR_CODES.UNAUTHORIZED,
          error: "Unauthorized",
        },
        { status: 401 },
      ),
    };
  }

  const meta = (user.user_metadata ?? {}) as ExamplePortfolioUserMetadata;
  if (isExampleExpired(meta, options?.now)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          success: false,
          code: EXAMPLE_EXPIRED_API_CODE,
          error: "Your example portfolio has ended.",
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true, user };
}
