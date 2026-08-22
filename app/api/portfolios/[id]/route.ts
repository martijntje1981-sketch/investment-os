import { NextResponse } from "next/server";

import { sanitizePortfolioOneName } from "@/lib/client/portfolioOne";
import { assertExamplePortfolioApiAccess } from "@/lib/services/examplePortfolio/accessGuard";
import {
  PortfolioAccessError,
  createPortfolioRepository,
} from "@/lib/services/portfolio/repository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = assertExamplePortfolioApiAccess(user);
    if (!access.ok) return access.response;

    const { id } = await context.params;
    const body = (await request.json()) as { name?: unknown };
    const name = sanitizePortfolioOneName(body.name);
    const repo = createPortfolioRepository(supabase);
    const renamed = await repo.renamePortfolio(access.user.id, id, name);

    return NextResponse.json({
      success: true,
      portfolioId: renamed.id,
      name: renamed.name,
    });
  } catch (error) {
    if (error instanceof PortfolioAccessError) {
      return NextResponse.json(
        { success: false, code: error.code, error: error.message },
        { status: error.status },
      );
    }
    console.error("[portfolios id PATCH]", error);
    return NextResponse.json(
      { success: false, error: "Could not save the portfolio name." },
      { status: 500 },
    );
  }
}
