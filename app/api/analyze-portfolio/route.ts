/**
 * POST /api/analyze-portfolio
 *
 * WHY THIS FILE CHANGES:
 * - OCR already extracts ticker, ISIN, exchange, and name without inventing data.
 * - After extraction, holdings are passed through the Instrument Match Engine so
 *   screenshot imports arrive pre-matched for user review.
 * - Tickers are never synthesized — provider codes are only applied when EODHD
 *   returns a verified match.
 */

import { NextResponse } from "next/server";
import { matchInstrument } from "@/lib/services/instruments";
import { applyResolvedToHolding } from "@/lib/services/instruments/applyResolved";
import { isValidIsin } from "@/lib/services/instruments/validation";
import type { ResolvedInstrument } from "@/lib/types/instrument";

export const runtime = "nodejs";
export const maxDuration = 60;

type Holding = {
  name: string;
  ticker: string;
  isin: string | null;
  exchange: string | null;
  assetType: "investment" | "cash";
  quantity: number;
  price: number | null;
  value: number | null;
  currency: string;
  confidence: number;
  warnings: string[];
};

type EnrichedHolding = Holding & {
  providerSymbol: string | null;
  instrumentName: string | null;
  matchMethod: ResolvedInstrument["matchMethod"];
  matchConfidence: number;
  requiresConfirmation: boolean;
  matchWarnings: string[];
};

type PortfolioAnalysis = {
  broker: string;
  holdings: Holding[];
};

function responseText(response: unknown) {
  if (typeof response === "object" && response !== null && "output_text" in response && typeof response.output_text === "string") {
    return response.output_text;
  }
  if (typeof response === "object" && response !== null && "output" in response && Array.isArray(response.output)) {
    for (const item of response.output) {
      if (typeof item !== "object" || item === null || !("content" in item) || !Array.isArray(item.content)) continue;
      for (const content of item.content) {
        if (typeof content === "object" && content !== null && "text" in content && typeof content.text === "string") return content.text;
      }
    }
  }
  throw new Error("The analysis service returned no readable result.");
}

function cleanNumber(value: unknown) {
  if (value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function cleanHolding(raw: Holding): Holding {
  const assetType = raw.assetType === "cash" ? "cash" : "investment";
  const quantity = cleanNumber(raw.quantity) ?? 0;
  let ticker = String(raw.ticker || "").trim().toUpperCase();
  let isin = raw.isin ? String(raw.isin).trim().toUpperCase() : null;

  // Never treat an ISIN as a ticker — relocate to the ISIN field.
  if (!isin && isValidIsin(ticker)) {
    isin = ticker;
    ticker = "";
  }

  return {
    name: String(raw.name || (assetType === "cash" ? "Cash" : "Unknown holding")).trim(),
    ticker,
    isin,
    exchange: raw.exchange ? String(raw.exchange).trim().toUpperCase() : null,
    assetType,
    quantity,
    price: assetType === "cash" ? 1 : cleanNumber(raw.price),
    value: cleanNumber(raw.value),
    currency: String(raw.currency || "EUR").trim().toUpperCase(),
    confidence: Math.min(1, Math.max(0, cleanNumber(raw.confidence) ?? 0)),
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(String).filter(Boolean) : [],
  };
}

async function enrichWithMatch(holding: Holding): Promise<EnrichedHolding> {
  if (holding.assetType === "cash") {
    return {
      ...holding,
      providerSymbol: null,
      instrumentName: null,
      matchMethod: "unresolved",
      matchConfidence: 0,
      requiresConfirmation: false,
      matchWarnings: [],
    };
  }

  const resolved = await matchInstrument({
    ticker: holding.ticker || null,
    isin: holding.isin,
    exchange: holding.exchange,
    instrumentName: holding.name,
    assetType: holding.assetType,
  });

  const enriched = applyResolvedToHolding(
    {
      ...holding,
      symbol: holding.ticker,
      instrumentName: null as string | null,
      providerSymbol: null as string | null,
    },
    resolved,
  );

  return {
    ...holding,
    ticker: enriched.symbol,
    isin: enriched.isin ?? holding.isin,
    exchange: enriched.exchange ?? holding.exchange,
    warnings: [...holding.warnings, ...(resolved.warnings ?? [])].filter(Boolean),
    providerSymbol: resolved.providerSymbol,
    instrumentName: resolved.instrumentName,
    matchMethod: resolved.matchMethod,
    matchConfidence: resolved.confidence,
    requiresConfirmation: resolved.requiresConfirmation,
    matchWarnings: resolved.warnings,
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "The portfolio analysis service is not configured." }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, message: "No screenshot was received." }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, message: "Only JPG, PNG and WEBP images are supported." }, { status: 400 });
    }
    if (file.size === 0 || file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ success: false, message: "The screenshot must be between 1 byte and 10 MB." }, { status: 400 });
    }

    const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
    const imageUrl = `data:${file.type};base64,${base64}`;

    const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gpt-5.4-mini",
        store: false,
        input: [{
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Read this portfolio screenshot as a careful data-extraction task.

Extract only positions and cash balances that are genuinely visible. Never identify a fund from appearance, portfolio context or memory. Copy names, ticker/product codes, ISINs, exchanges, quantities, prices, values and currencies exactly when visible.

Rules:
- Include investments and cash balances. Use assetType "cash" for cash, available cash or currency balances.
- Do not include portfolio totals, daily P/L totals, account totals, menus, buttons or navigation text.
- Do not convert currencies and do not calculate a missing ticker, ISIN or exchange.
- If a ticker is not visible, return an empty ticker. If ISIN or exchange is not visible, return null.
- For cash: quantity is the visible cash amount, price is 1, value is the visible amount and ticker is the visible currency code when available.
- Distinguish quantity, average purchase price, current price and total value. The field "price" must contain the current/unit price, never the total value.
- European numbers may use a period for thousands and a comma for decimals. Interpret separators using the surrounding currency and column context.
- Keep separate share classes, currencies or exchanges as separate rows.
- confidence measures extraction certainty, not investment quality.
- Add a short warning when a field is unclear, derived from value/quantity, truncated, or when multiple instrument matches may exist.
- Never silently guess. A lower confidence and warning are preferred to invented data.

Return every visible row once.`
            },
            { type: "input_image", image_url: imageUrl, detail: "high" },
          ],
        }],
        text: {
          format: {
            type: "json_schema",
            name: "portfolio_analysis",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              required: ["broker", "holdings"],
              properties: {
                broker: { type: "string" },
                holdings: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["name", "ticker", "isin", "exchange", "assetType", "quantity", "price", "value", "currency", "confidence", "warnings"],
                    properties: {
                      name: { type: "string" },
                      ticker: { type: "string" },
                      isin: { anyOf: [{ type: "string" }, { type: "null" }] },
                      exchange: { anyOf: [{ type: "string" }, { type: "null" }] },
                      assetType: { type: "string", enum: ["investment", "cash"] },
                      quantity: { type: "number" },
                      price: { anyOf: [{ type: "number" }, { type: "null" }] },
                      value: { anyOf: [{ type: "number" }, { type: "null" }] },
                      currency: { type: "string" },
                      confidence: { type: "number", minimum: 0, maximum: 1 },
                      warnings: { type: "array", items: { type: "string" } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    });

    const data = await openAIResponse.json();
    if (!openAIResponse.ok) {
      console.error("Portfolio analysis provider error:", data);
      return NextResponse.json({ success: false, message: data?.error?.message ?? "The screenshot could not be analysed." }, { status: openAIResponse.status });
    }

    const analysis = JSON.parse(responseText(data)) as PortfolioAnalysis;
    const cleaned = Array.isArray(analysis.holdings)
      ? analysis.holdings.map(cleanHolding).filter((holding) => holding.quantity > 0 && (holding.assetType === "cash" || holding.name.length > 0))
      : [];

    if (!cleaned.length) {
      return NextResponse.json({ success: false, message: "No clear positions were found. Use a sharper screenshot showing the complete portfolio table." }, { status: 422 });
    }

    const holdings = await Promise.all(cleaned.map(enrichWithMatch));

    return NextResponse.json({
      success: true,
      broker: String(analysis.broker || "Unknown broker"),
      holdings,
      requiresReview: true,
    });
  } catch (error) {
    console.error("Portfolio analysis failed:", error);
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Something went wrong while analysing the screenshot." }, { status: 500 });
  }
}
