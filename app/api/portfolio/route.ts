import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeLocalHoldings } from "@/lib/services/portfolio/mappers";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import {
  formatSupabaseError,
  supabaseErrorCode,
} from "@/lib/services/portfolio/supabaseErrors";
import {
  PortfolioSyncError,
  syncPortfolioSnapshot,
} from "@/lib/services/portfolio/syncService";
import type { PortfolioSyncRequest } from "@/lib/services/portfolio/types";
import { SYNC_ERROR_CODES } from "@/lib/services/portfolio/types";
import type { GoalSettings } from "@/lib/types/portfolioStorage";
import type { SavedImportMapping } from "@/lib/services/import/mappingMemory";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: SYNC_ERROR_CODES.UNAUTHORIZED,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const repo = createPortfolioRepository(supabase);
    const snapshot = await repo.fetchSnapshot(user.id);

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    console.error("[portfolio GET]", error);
    return NextResponse.json(
      {
        success: false,
        code: SYNC_ERROR_CODES.PROVIDER_FAILURE,
        error: "Failed to load remote portfolio.",
      },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          code: SYNC_ERROR_CODES.UNAUTHORIZED,
          error: "Unauthorized",
        },
        { status: 401 },
      );
    }

    const body = (await request.json()) as PortfolioSyncRequest & {
      goal?: GoalSettings | null;
      importMappings?: SavedImportMapping[];
    };

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

    const repo = createPortfolioRepository(supabase);
    const snapshot = await syncPortfolioSnapshot(
      repo,
      user.id,
      {
        idempotencyKey: body.idempotencyKey,
        holdings: sanitizeLocalHoldings(body.holdings),
        goal: body.goal,
        importMappings: body.importMappings,
      },
      body.goal,
      body.importMappings,
    );

    return NextResponse.json({ success: true, snapshot });
  } catch (error) {
    if (error instanceof PortfolioSyncError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.code === SYNC_ERROR_CODES.CONFLICT ? 409 : 400 },
      );
    }

    console.error("[portfolio PUT]", error);
    return NextResponse.json(
      {
        success: false,
        code: supabaseErrorCode(error) ?? SYNC_ERROR_CODES.PROVIDER_FAILURE,
        error: formatSupabaseError(error),
      },
      { status: 500 },
    );
  }
}
