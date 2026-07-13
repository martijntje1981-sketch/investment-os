import { NextRequest, NextResponse } from "next/server";
import { getQuotes } from "@/lib/services/market/priceService";

type RequestedInstrument = {
  symbol: string;
  name?: string;
};

function normaliseSymbols(value: string | null) {
  if (!value) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .split(",")
        .map((symbol) => symbol.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function normaliseNames(value: string | null) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function buildInstruments(
  symbols: string[],
  names: string[]
): RequestedInstrument[] {
  return symbols.map((symbol, index) => ({
    symbol,
    name: names[index] || undefined,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const symbols = normaliseSymbols(
      request.nextUrl.searchParams.get("symbols")
    );

    const names = normaliseNames(
      request.nextUrl.searchParams.get("names")
    );

    if (symbols.length === 0) {
      return NextResponse.json(
        {
          error:
            "Add at least one symbol. Example: /api/quotes?symbols=AAPL,VWCE",
        },
        {
          status: 400,
        }
      );
    }

    const instruments = buildInstruments(symbols, names);

    const result = await getQuotes(instruments);

    return NextResponse.json(
      {
        quotes: result.quotes,
        errors: result.errors,
        requestedInstruments: instruments,
        fetchedAt: result.fetchedAt,
      },
      {
        status: 200,
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Quote API error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown quote API error.",
      },
      {
        status: 500,
      }
    );
  }
}