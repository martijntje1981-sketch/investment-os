/**
 * OpenAI vision extraction for portfolio screenshots.
 */

import {
  PORTFOLIO_EXTRACTION_PROMPT,
  portfolioExtractionJsonSchema,
} from "@/lib/services/extraction/extractPrompt";
import { processRawPortfolioExtraction } from "@/lib/services/extraction";
import type {
  NormalizedPortfolioExtraction,
  RawPortfolioExtraction,
} from "@/lib/services/extraction/types";

export function extractResponseText(response: unknown): string {
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
        typeof item !== "object" ||
        item === null ||
        !("content" in item) ||
        !Array.isArray(item.content)
      ) {
        continue;
      }

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

  throw new Error("The analysis service returned no readable result.");
}

export async function extractPortfolioFromScreenshot(input: {
  apiKey: string;
  fileBytes: ArrayBuffer;
  mimeType: string;
}): Promise<NormalizedPortfolioExtraction> {
  const base64 = Buffer.from(input.fileBytes).toString("base64");
  const imageUrl = `data:${input.mimeType};base64,${base64}`;

  const openAIResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      store: false,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: PORTFOLIO_EXTRACTION_PROMPT },
            { type: "input_image", image_url: imageUrl, detail: "high" },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "portfolio_analysis",
          strict: true,
          schema: portfolioExtractionJsonSchema(),
        },
      },
    }),
  });

  const data = await openAIResponse.json();
  if (!openAIResponse.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error
        ? String(data.error.message)
        : "The screenshot could not be analysed.";
    throw new VisionExtractError(message, openAIResponse.status);
  }

  const raw = JSON.parse(extractResponseText(data)) as RawPortfolioExtraction;
  return processRawPortfolioExtraction(raw);
}

export class VisionExtractError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "VisionExtractError";
    this.status = status;
  }
}
