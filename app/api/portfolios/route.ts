import { NextResponse } from "next/server";

import { sanitizePortfolioOneName } from "@/lib/client/portfolioOne";
import { MULTI_PORTFOLIO_COPY } from "@/lib/content/multiPortfolioCopy";
import { assertExamplePortfolioApiAccess } from "@/lib/services/examplePortfolio/accessGuard";
import {
  annotatePortfolioAccess,
  canCreateAnotherPortfolio,
} from "@/lib/services/portfolios/access";
import { PortfolioAccessError } from "@/lib/services/portfolio/repository";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import { resolveProductAccessFromAuthUser } from "@/lib/services/productAccess";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = assertExamplePortfolioApiAccess(user);
    if (!access.ok) return access.response;

    const productAccess = await resolveProductAccessFromAuthUser(access.user);
    const repo = createPortfolioRepository(supabase);
    await repo.getPrimaryPortfolioId(access.user.id);
    const records = await repo.listPortfolios(access.user.id);
    const portfolios = annotatePortfolioAccess(
      records,
      productAccess.maxPortfolios,
    );

    return NextResponse.json({
      success: true,
      maxPortfolios: productAccess.maxPortfolios,
      canCreate: canCreateAnotherPortfolio(
        records.length,
        productAccess.maxPortfolios,
      ),
      portfolios,
    });
  } catch (error) {
    console.error("[portfolios GET]", error);
    return NextResponse.json(
      { success: false, error: "Could not load portfolios." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = assertExamplePortfolioApiAccess(user);
    if (!access.ok) return access.response;

    const productAccess = await resolveProductAccessFromAuthUser(access.user);
    const body = (await request.json().catch(() => ({}))) as { name?: unknown };
    const name = sanitizePortfolioOneName(body.name);
    const repo = createPortfolioRepository(supabase);
    await repo.getPrimaryPortfolioId(access.user.id);
    const created = await repo.createPortfolio(
      access.user.id,
      name,
      productAccess.maxPortfolios,
    );

    return NextResponse.json({
      success: true,
      portfolio: {
        id: created.id,
        name: created.name,
        isPrimary: created.isPrimary,
        accessible: true,
        locked: false,
      },
    });
  } catch (error) {
    if (error instanceof PortfolioAccessError) {
      return NextResponse.json(
        {
          success: false,
          code: error.code,
          error:
            error.code === "portfolio_limit" && error.status === 403
              ? error.message
              : MULTI_PORTFOLIO_COPY.completeIncludes,
        },
        { status: error.status },
      );
    }
    console.error("[portfolios POST]", error);
    return NextResponse.json(
      { success: false, error: "Could not create the portfolio." },
      { status: 500 },
    );
  }
}
