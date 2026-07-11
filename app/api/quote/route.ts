import { NextResponse } from "next/server";
import { getMarketQuote } from "@/lib/services/market/priceService";

export async function GET() {
  try {
    const quote = await getMarketQuote("BTC/USD");

    return NextResponse.json(quote);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown market-data error";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}