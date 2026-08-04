import { NextResponse } from "next/server";

import {
  findExampleEntitlementByEmail,
  findExampleEntitlementByUserId,
} from "@/lib/services/examplePortfolio/entitlements";
import {
  resolveExampleStatusForUser,
  shouldShowExampleBanner,
} from "@/lib/services/examplePortfolio/resolveExampleStatus";
import { repairFalseExampleActivation } from "@/lib/services/examplePortfolio/repairFalseExample";
import { normalizeExampleEmail } from "@/lib/services/examplePortfolio/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status ?? 200,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    },
  });
}

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
    return noStoreJson({
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
    return noStoreJson({
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
  let entitlement =
    (await findExampleEntitlementByUserId(admin, user.id)) ??
    (email ? await findExampleEntitlementByEmail(admin, email) : null);

  if (entitlement) {
    try {
      const repair = await repairFalseExampleActivation({
        admin,
        userClient: supabase,
        user,
        entitlement,
      });
      if (repair.repaired) {
        console.info("[example-status]", {
          reason: "repaired_false_activation",
          repairReason: repair.reason,
          email,
          kind: "none",
          showBanner: false,
        });
        entitlement = null;
      }
    } catch {
      // Banner still resolves from current entitlement when repair fails.
    }
  }

  const resolved = resolveExampleStatusForUser({ user, entitlement });
  const showBanner = shouldShowExampleBanner(resolved);

  console.info("[example-status]", {
    reason: "resolved",
    kind: resolved.kind,
    showBanner,
    daysRemaining: resolved.daysRemaining,
    started_at: resolved.startedAt,
    expires_at: resolved.expiresAt,
    seeded_at: entitlement?.seeded_at ?? null,
    converted_at: entitlement?.converted_at ?? null,
    entitlementPresent: Boolean(entitlement),
    bannerLabel: resolved.bannerLabel,
  });

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
      // Explicit nulls clear stale keys under Supabase metadata merge.
      for (const key of Object.keys(resolved.metadataPatch) as Array<
        keyof typeof resolved.metadataPatch
      >) {
        const value = resolved.metadataPatch[key];
        if (value === undefined) {
          nextMeta[key as string] = null;
        }
      }
      await admin.auth.admin.updateUserById(user.id, {
        user_metadata: nextMeta,
      });
    } catch {
      // Banner still returns DB truth; metadata heal is best-effort.
    }
  }

  return noStoreJson({
    success: true,
    status: {
      kind: resolved.kind,
      template: resolved.template,
      expiresAt: resolved.expiresAt,
      startedAt: resolved.startedAt,
      daysRemaining: resolved.daysRemaining,
      bannerLabel: resolved.bannerLabel,
      showBanner,
      staleMetadata: resolved.staleMetadata,
    },
  });
}
