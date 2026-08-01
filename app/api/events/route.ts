import { NextResponse } from "next/server";

import { buildCalendarEventsPayload } from "@/lib/services/events";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

export const runtime = "nodejs";

type EventsRequestBody = {
  holdings?: StoredPortfolioHolding[];
  dividendQuotes?: DividendApiQuote[];
};

async function handleEventsRequest(body: EventsRequestBody) {
  try {
    const payload = await buildCalendarEventsPayload({
      holdings: Array.isArray(body.holdings) ? body.holdings : [],
      dividendQuotes: Array.isArray(body.dividendQuotes)
        ? body.dividendQuotes
        : [],
    });

    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unable to load calendar events.";
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/events]", message, error);
    }
    return NextResponse.json(
      {
        success: false,
        error: message,
        events: [],
        grouped: { today: [], thisWeek: [], later: [] },
        state: "provider_unavailable",
        source: null,
        unavailableCategories: ["crypto"],
        diagnostics: {
          source: null,
          requestedFrom: null,
          requestedTo: null,
          providerHttpStatus: null,
          providerRowCount: 0,
          mappedEventCount: 0,
          economicEventCount: 0,
          dividendEventCount: 0,
          warnings: [message],
          unavailableCategories: ["crypto"],
        },
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  let body: EventsRequestBody = {};
  try {
    body = (await request.json()) as EventsRequestBody;
  } catch {
    body = {};
  }

  return handleEventsRequest(body);
}

export async function GET() {
  return handleEventsRequest({});
}
