import { NextResponse } from "next/server";

import {
  findExampleEntitlementByEmail,
  findExampleEntitlementByUserId,
} from "@/lib/services/examplePortfolio/entitlements";
import {
  resolveExampleStatusForUser,
  shouldShowExampleBanner,
} from "@/lib/services/examplePortfolio/resolveExampleStatus";
import { normalizeExampleEmail } from "@/lib/services/examplePortfolio/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Canonical Example Portfolio status for the banner / clients.
 * Prefers DB entitlement over stale user_metadata and heals metadata when needed.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({
      success: true,
      status: {
        kind: "none",
        template: null,
        expiresAt: null,
        startedAt: null,
        daysRemaining: 0,
        bannerLabel: null,
        showBanner: false,
        staleMetadata: false,
      },
    });
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({
      success: true,
      status: {
        kind: "none",
        template: null,
        expiresAt: null,
        startedAt: null,
        daysRemaining: 0,
        bannerLabel: null,
        showBanner: false,
        staleMetadata: false,
      },
    });
  }

  const email = user.email ? normalizeExampleEmail(user.email) : "";
  const entitlement =
    (await findExampleEntitlementByUserId(admin, user.id)) ??
    (email ? await findExampleEntitlementByEmail(admin, email) : null);

  const resolved = resolveExampleStatusForUser({ user, entitlement });

  if (resolved.metadataPatch) {
    try {
      const { data } = await admin.auth.admin.getUserById(user.id);
      const existing = (data.user?.user_metadata ?? {}) as Record<
        string,
        unknown
      >;
      const nextMeta: Record<string, unknown> = {
        ...existing,
        ...resolved.metadataPatch,
      };
      // Clear keys explicitly set to undefined so stale expiry cannot linger.
      for (const key of Object.keys(resolved.metadataPatch)) {
        const value =
          resolved.metadataPatch[key as keyof typeof resolved.metadataPatch];
        if (value === undefined) {
          delete nextMeta[key];
        }
      }
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: nextMeta,
      });
    } catch {
      // Banner still returns DB truth; metadata heal is best-effort.
    }
  }

  return NextResponse.json({
    success: true,
    status: {
      kind: resolved.kind,
      template: resolved.template,
      expiresAt: resolved.expiresAt,
      startedAt: resolved.startedAt,
      daysRemaining: resolved.daysRemaining,
      bannerLabel: resolved.bannerLabel,
      showBanner: shouldShowExampleBanner(resolved),
      staleMetadata: resolved.staleMetadata,
    },
  });
}
