import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeLocalHoldings } from "@/lib/services/portfolio/mappers";
import { portfolioFingerprint } from "@/lib/services/portfolio/idempotency";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import {
  PortfolioSyncError,
  buildMigrationPreview,
  migrateLocalPortfolio,
} from "@/lib/services/portfolio/syncService";
import type { PortfolioMigrateRequest } from "@/lib/services/portfolio/types";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { success: false, code: SYNC_ERROR_CODES.UNAUTHORIZED, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = (await request.json()) as PortfolioMigrateRequest & {
      goal?: GoalSettings | null;
      importMappings?: SavedImportMapping[];
    };

    const holdings = sanitizeLocalHoldings(body.holdings);
    const localFingerprint =
      body.localFingerprint || portfolioFingerprint(holdings, user.id);

    if (!body.idempotencyKey) {
      return NextResponse.json(
        {
          success: false,
          code: SYNC_ERROR_CODES.VALIDATION,
          error: "idempotencyKey is required.",
        },
        { status: 400 },
      );
    }

    const preview = buildMigrationPreview(
      holdings,
      body.goal ?? null,
      body.importMappings ?? [],
      user.id,
    );

    const repo = createPortfolioRepository(supabase);
    const snapshot = await migrateLocalPortfolio(
      repo,
      user.id,
      {
        ...body,
        holdings,
        localFingerprint,
      },
      body.goal ?? null,
      body.importMappings ?? [],
    );

    return NextResponse.json({
      success: true,
      snapshot,
      preview,
      verified: true,
    });
  } catch (error) {
    if (error instanceof PortfolioSyncError) {
      const status =
        error.code === SYNC_ERROR_CODES.CONFLICT
          ? 409
          : error.code === SYNC_ERROR_CODES.VALIDATION
            ? 400
            : 500;

      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status },
      );
    }

    console.error("[portfolio migrate POST]", error);
    return NextResponse.json(
      {
        success: false,
        code: SYNC_ERROR_CODES.PROVIDER_FAILURE,
        error: "Migration failed. Your local portfolio was not changed.",
      },
      { status: 500 },
    );
  }
}
