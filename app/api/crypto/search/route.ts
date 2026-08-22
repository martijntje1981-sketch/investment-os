import { NextResponse } from "next/server";

import {
  fetchCryptoCatalog,
  searchCryptoCatalog,
} from "@/lib/services/portfolio/cryptoCatalog";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";
  const pairCurrency = searchParams.get("pairCurrency")?.trim().toUpperCase() ?? "EUR";

  if (!query) {
    return NextResponse.json({
      success: true,
      query,
      pairCurrency,
      results: [],
      source: "cache" as const,
      diagnostics: null,
    });
  }

  try {
    const catalog = await fetchCryptoCatalog();
    const results = searchCryptoCatalog(catalog.entries, query, pairCurrency);

    return NextResponse.json({
      success: true,
      query,
      pairCurrency,
      results,
      source: catalog.source,
      diagnostics: catalog.diagnostics,
      totalCatalogEntries: catalog.entries.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Crypto catalog is temporarily unavailable.";

    return NextResponse.json(
      {
        success: false,
        query,
        pairCurrency,
        results: [],
        error: "Crypto catalog is temporarily unavailable.",
        details: message,
      },
      { status: 503 },
    );
  }
}
