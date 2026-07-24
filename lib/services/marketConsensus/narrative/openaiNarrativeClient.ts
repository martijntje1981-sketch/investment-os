import { extractResponseText } from "@/lib/services/extraction/visionExtract";
import type {
  MarketConsensusNarrative,
  MarketConsensusNarrativeInput,
} from "@/lib/services/marketConsensus/narrative/types";
import { MARKET_CONSENSUS_NARRATIVE_MODEL } from "@/lib/services/marketConsensus/narrative/types";

const NARRATIVE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    supportingFactors: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
    riskFactors: {
      type: "array",
      items: { type: "string" },
      maxItems: 3,
    },
  },
  required: ["summary", "supportingFactors", "riskFactors"],
} as const;

function buildPrompt(input: MarketConsensusNarrativeInput): string {
  return [
    "Write a neutral summary of third-party market consensus data.",
    "Rules:",
    "- Do not recommend buying, selling or holding.",
    "- Do not use phrases like 'we believe', 'you should', 'guaranteed', or 'Investment OS'.",
    "- Do not invent numbers, targets, analyst counts or facts not present in the input.",
    "- Use at most 3 concise sentences in the summary.",
    "- Provide up to 3 supporting factors and up to 3 key risks, each max 90 characters.",
    "- Mention uncertainty or limitations.",
    "- Include at least one counterpoint or risk in the summary.",
    "- Summarize third-party data only; this is not investment advice.",
    input.instrumentType === "crypto"
      ? "- Do not use Buy, Hold or Sell language."
      : "",
    JSON.stringify(input),
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateMarketConsensusNarrativeWithOpenAI(
  input: MarketConsensusNarrativeInput,
  apiKey: string,
): Promise<MarketConsensusNarrative> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MARKET_CONSENSUS_NARRATIVE_MODEL,
      store: false,
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: buildPrompt(input) }],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "market_consensus_narrative",
          strict: true,
          schema: NARRATIVE_JSON_SCHEMA,
        },
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "object" &&
      data.error !== null &&
      "message" in data.error
        ? String(data.error.message)
        : "OpenAI narrative generation failed.";
    throw new Error(message);
  }

  const parsed = JSON.parse(extractResponseText(data)) as {
    summary: string;
    supportingFactors: string[];
    riskFactors: string[];
  };

  return {
    summary: parsed.summary,
    supportingFactors: parsed.supportingFactors,
    riskFactors: parsed.riskFactors,
    generatedAt: new Date().toISOString(),
    model: MARKET_CONSENSUS_NARRATIVE_MODEL,
  };
}

export function getOpenAiApiKey(): string | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  return apiKey ? apiKey : null;
}
