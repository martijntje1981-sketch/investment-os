import { NextRequest, NextResponse } from "next/server";

import { assertExamplePortfolioApiAccess } from "@/lib/services/examplePortfolio/accessGuard";
import { fetchHoldingPriceHistory } from "@/lib/services/holdings/fetchHoldingPriceHistory";
import { createPortfolioRepository } from "@/lib/services/portfolio/repository";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Price history for a portfolio holding, keyed by the user's holding symbol.
 * Uses stored providerSymbol (same identity as live quotes).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const access = assertExamplePortfolioApiAccess(user);
  if (!access.ok) return access.response;

  const symbol = (request.nextUrl.searchParams.get("symbol") ?? "")
    .trim()
    .toUpperCase();
  if (!symbol) {
    return NextResponse.json(
      { success: false, error: "Missing holding symbol." },
      { status: 400 },
    );
  }

  const repo = createPortfolioRepository(supabase);
  const snapshot = await repo.fetchSnapshot(access.user.id);
  const holding = snapshot.holdings.find(
    (item) => item.symbol.trim().toUpperCase() === symbol,
  );

  if (!holding) {
    return NextResponse.json(
      { success: false, error: "Holding not found." },
      { status: 404 },
    );
  }

  const history = await fetchHoldingPriceHistory({
    providerSymbol: holding.providerSymbol,
    assetType: holding.assetType,
  });

  return NextResponse.json({
    success: true,
    symbol: holding.symbol,
    history,
  });
}
