/**
 * Resolve product access from a trusted Auth user (session or admin.getUserById).
 * Entitlement wins when the admin client is available; otherwise metadata fallback.
 */

import type { User } from "@supabase/supabase-js";

import {
  findExampleEntitlementByEmail,
  findExampleEntitlementByUserId,
} from "@/lib/services/examplePortfolio/entitlements";
import { resolveExampleStatusForUser } from "@/lib/services/examplePortfolio/resolveExampleStatus";
import {
  getExampleDaysRemaining,
  normalizeExampleEmail,
  type ExamplePortfolioUserMetadata,
} from "@/lib/services/examplePortfolio/types";
import {
  resolveProductAccessFromMetadata,
  type ProductAccess,
} from "@/lib/services/productAccess/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function resolveProductAccessFromAuthUser(
  user: User,
): Promise<ProductAccess> {
  const metadata = (user.user_metadata ?? {}) as ExamplePortfolioUserMetadata;
  const admin = createAdminClient();
  let entitlement = null;
  if (admin) {
    const email = user.email ? normalizeExampleEmail(user.email) : "";
    entitlement =
      (await findExampleEntitlementByUserId(admin, user.id)) ??
      (email ? await findExampleEntitlementByEmail(admin, email) : null);
  }

  const resolved = resolveExampleStatusForUser({ user, entitlement });
  let exampleKind = resolved.kind;
  let expiresAt = resolved.expiresAt;
  let daysRemaining = resolved.daysRemaining;

  if (!entitlement && !admin) {
    if (metadata.example_converted_at) {
      exampleKind = "converted";
    } else if (
      metadata.example_expires_at &&
      getExampleDaysRemaining(metadata.example_expires_at) > 0
    ) {
      exampleKind = "active";
      expiresAt = metadata.example_expires_at;
      daysRemaining = getExampleDaysRemaining(metadata.example_expires_at);
    }
  }

  return resolveProductAccessFromMetadata({
    exampleKind,
    metadata,
    expiresAt,
    daysRemaining,
  });
}
