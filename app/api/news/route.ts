import { NextResponse } from "next/server";

import { buildNewsResponse } from "@/lib/services/news/newsService";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 45 * 60;

type NewsRequestBody = {
  holdings?: StoredPortfolioHolding[];
};

function normalizeHoldings(parsed: unknown): StoredPortfolioHolding[] {
  if (!Array.isArray(parsed)) return [];

  return parsed
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const holding = item as StoredPortfolioHolding;
      return {
        ...holding,
        symbol: String(holding.symbol ?? "")
          .trim()
          .toUpperCase(),
        assetType: holding.assetType === "cash" ? "cash" : "investment",
      };
    });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewsRequestBody;
    const holdings = normalizeHoldings(body.holdings);
    const payload = await buildNewsResponse(holdings);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": `private, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        items: [],
        forYou: [],
        markets: [],
        videos: [],
        sourceErrors: [],
        fetchedAt: new Date().toISOString(),
        error: "News could not be loaded.",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  const payload = await buildNewsResponse([]);

  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
    },
  });
}
