import { NextResponse } from "next/server";

import { createDegradedNewsResponse } from "@/lib/services/news/newsResponseFactory";
import { safeBuildNewsResponse } from "@/lib/services/news/newsService";
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

function jsonNewsResponse(payload: ReturnType<typeof createDegradedNewsResponse>) {
  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": `private, max-age=0, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NewsRequestBody;
    const holdings = normalizeHoldings(body.holdings);
    const payload = await safeBuildNewsResponse(holdings);
    return jsonNewsResponse(payload);
  } catch (error) {
    console.error("[news POST]", error);
    return jsonNewsResponse(
      createDegradedNewsResponse({
        recoveryMessage: "News request could not be processed.",
      }),
    );
  }
}

export async function GET() {
  try {
    const payload = await safeBuildNewsResponse([]);
    return NextResponse.json(payload, {
      status: 200,
      headers: {
        "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
      },
    });
  } catch (error) {
    console.error("[news GET]", error);
    return NextResponse.json(
      createDegradedNewsResponse({
        recoveryMessage: "News request could not be processed.",
      }),
      {
        status: 200,
        headers: {
          "Cache-Control": `public, s-maxage=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS}`,
        },
      },
    );
  }
}
