import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Holding = {
  name: string;
  ticker: string;
  quantity: number;
  price?: number;
  value?: number;
  currency?: string;
  confidence?: number;
};

type PortfolioAnalysis = {
  broker: string;
  holdings: Holding[];
};

function getResponseText(response: unknown): string {
  if (
    typeof response === "object" &&
    response !== null &&
    "output_text" in response &&
    typeof response.output_text === "string"
  ) {
    return response.output_text;
  }

  if (
    typeof response === "object" &&
    response !== null &&
    "output" in response &&
    Array.isArray(response.output)
  ) {
    for (const item of response.output) {
      if (
        typeof item === "object" &&
        item !== null &&
        "content" in item &&
        Array.isArray(item.content)
      ) {
        for (const content of item.content) {
          if (
            typeof content === "object" &&
            content !== null &&
            "text" in content &&
            typeof content.text === "string"
          ) {
            return content.text;
          }
        }
      }
    }
  }

  throw new Error("OpenAI gaf geen leesbaar resultaat terug.");
}

function cleanHolding(holding: Holding): Holding {
  return {
    name: String(holding.name || "Unknown holding").trim(),
    ticker: String(holding.ticker || "").trim().toUpperCase(),
    quantity: Number(holding.quantity) || 0,
    price:
      holding.price === undefined || holding.price === null
        ? undefined
        : Number(holding.price),
    value:
      holding.value === undefined || holding.value === null
        ? undefined
        : Number(holding.value),
    currency: String(holding.currency || "EUR").trim().toUpperCase(),
    confidence:
      holding.confidence === undefined || holding.confidence === null
        ? undefined
        : Math.min(1, Math.max(0, Number(holding.confidence))),
  };
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          message:
            "OPENAI_API_KEY ontbreekt in de environment variables van Vercel.",
        },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Er is geen screenshot ontvangen.",
        },
        { status: 400 }
      );
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Alleen JPG-, PNG- en WEBP-bestanden worden ondersteund.",
        },
        { status: 400 }
      );
    }

    const maximumFileSize = 10 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      return NextResponse.json(
        {
          success: false,
          message: "De screenshot is groter dan 10 MB.",
        },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const base64Image = Buffer.from(bytes).toString("base64");
    const imageDataUrl = `data:${file.type};base64,${base64Image}`;

    const openAIResponse = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-5.4-mini",
          input: [
            {
              role: "user",
              content: [
                {
                  type: "input_text",
                  text: `
Analyseer deze screenshot van een beleggingsportefeuille.

Lees uitsluitend posities die werkelijk zichtbaar zijn.
Verzin geen ontbrekende informatie.

Herken per positie waar mogelijk:
- volledige naam
- ticker of herkenbare productcode
- aantal stukken
- huidige koers
- totale marktwaarde
- valuta

Belangrijke regels:
- Europese getallen zoals 11.269,00 betekenen elfduizend tweehonderdnegenenzestig.
- Een komma kan een decimaalteken zijn.
- Een punt kan een duizendtalscheiding zijn.
- Neem geen totalen, cashposities, menu-items of navigatietekst als holding op.
- Gebruik een confidence tussen 0 en 1.
- Als ticker, koers of waarde niet leesbaar is, gebruik dan een lege ticker of laat het optionele getal weg.
- quantity moet altijd een getal zijn.
                  `.trim(),
                },
                {
                  type: "input_image",
                  image_url: imageDataUrl,
                  detail: "high",
                },
              ],
            },
          ],
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
                  broker: {
                    type: "string",
                  },
                  holdings: {
                    type: "array",
                    items: {
                      type: "object",
                      additionalProperties: false,
                      required: [
                        "name",
                        "ticker",
                        "quantity",
                        "price",
                        "value",
                        "currency",
                        "confidence",
                      ],
                      properties: {
                        name: {
                          type: "string",
                        },
                        ticker: {
                          type: "string",
                        },
                        quantity: {
                          type: "number",
                        },
                        price: {
                          anyOf: [
                            {
                              type: "number",
                            },
                            {
                              type: "null",
                            },
                          ],
                        },
                        value: {
                          anyOf: [
                            {
                              type: "number",
                            },
                            {
                              type: "null",
                            },
                          ],
                        },
                        currency: {
                          type: "string",
                        },
                        confidence: {
                          type: "number",
                          minimum: 0,
                          maximum: 1,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        }),
      }
    );

    const responseData = await openAIResponse.json();

    if (!openAIResponse.ok) {
      console.error("OpenAI error:", responseData);

      const errorMessage =
        responseData?.error?.message ||
        "OpenAI kon de screenshot niet analyseren.";

      return NextResponse.json(
        {
          success: false,
          message: errorMessage,
        },
        { status: openAIResponse.status }
      );
    }

    const responseText = getResponseText(responseData);
    const analysis = JSON.parse(responseText) as PortfolioAnalysis;

    const holdings = Array.isArray(analysis.holdings)
      ? analysis.holdings
          .map(cleanHolding)
          .filter(
            (holding) =>
              holding.name.length > 0 &&
              holding.quantity > 0
          )
      : [];

    if (holdings.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Er zijn geen duidelijke holdings gevonden. Gebruik een scherpere screenshot waarop de volledige portefeuille zichtbaar is.",
        },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      broker: analysis.broker || "Unknown broker",
      holdings,
    });
  } catch (error) {
    console.error("Portfolio analysis failed:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Er ging iets mis tijdens het analyseren van de screenshot.",
      },
      { status: 500 }
    );
  }
}