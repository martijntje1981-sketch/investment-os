/**
 * OpenAI client for portfolio insight — interprets a Scorecard; never calculates scores.
 */

import { extractResponseText } from "@/lib/services/extraction/visionExtract";
import type { PortfolioInsightResult } from "@/lib/services/portfolio/healthScore/deterministicInsight";
import { PORTFOLIO_INSIGHT_DISCLAIMER } from "@/lib/services/portfolio/healthScore/deterministicInsight";
import {
  buildScorecardInsightContext,
  type PortfolioScorecardResult,
} from "@/lib/services/portfolio/scorecard";

export const PORTFOLIO_INSIGHT_MODEL =
  process.env.PORTFOLIO_INSIGHT_MODEL ??
  process.env.MARKET_CONSENSUS_NARRATIVE_MODEL ??
  "gpt-4o-mini";

const INSIGHT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    headline: { type: "string" },
    scoreLines: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          scoreId: {
            type: "string",
            enum: ["health", "goal", "momentum", "readiness"],
          },
          text: { type: "string" },
        },
        required: ["scoreId", "text"],
      },
      maxItems: 4,
    },
    watchItem: { type: ["string", "null"] },
  },
  required: ["headline", "scoreLines", "watchItem"],
} as const;

export function buildPortfolioInsightPromptFromScorecard(
  scorecard: PortfolioScorecardResult,
): string {
  const context = buildScorecardInsightContext(scorecard);
  return [
    "You write a concise Portfolio Scorecard insight for an investor monitoring app.",
    "Rules:",
    "- Use ONLY the provided JSON. Do not invent scores, holdings, or forecasts.",
    "- Do not recalculate scores.",
    "- Do not recommend buying, selling, or holding any asset.",
    "- Do not say guaranteed, chance of success, outperform, or give personal advice.",
    "- One short headline (max 90 chars) capturing the main cross-score conclusion.",
    "- One short line per AVAILABLE score (max 120 chars each). Skip unavailable scores.",
    "- Optional watchItem only when useful; otherwise null.",
    "- Mention structure, goal tracking, recent momentum, or data readiness — not expected returns.",
    JSON.stringify(context),
  ].join("\n");
}

export function validatePortfolioInsightAiPayloadFromScorecard(
  payload: unknown,
  scorecard: PortfolioScorecardResult,
): PortfolioInsightResult | null {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as Record<string, unknown>;
  const headline =
    typeof data.headline === "string" ? data.headline.trim() : "";
  const watchItem =
    data.watchItem === null
      ? null
      : typeof data.watchItem === "string"
        ? data.watchItem.trim() || null
        : null;
  if (!headline) return null;

  const banned =
    /\b(buy|sell|guaranteed|outperform|you should|must buy|must sell|chance of)\b/i;
  if (banned.test(headline) || (watchItem && banned.test(watchItem))) {
    return null;
  }

  const availableIds = new Set(
    (["health", "goal", "momentum", "readiness"] as const).filter(
      (id) => scorecard.scores[id].available,
    ),
  );

  const rawLines = Array.isArray(data.scoreLines) ? data.scoreLines : [];
  const scoreLines: PortfolioInsightResult["scoreLines"] = [];
  for (const item of rawLines) {
    if (!item || typeof item !== "object") continue;
    const row = item as { scoreId?: string; text?: string };
    const scoreId = row.scoreId;
    const text = typeof row.text === "string" ? row.text.trim() : "";
    if (
      scoreId !== "health" &&
      scoreId !== "goal" &&
      scoreId !== "momentum" &&
      scoreId !== "readiness"
    ) {
      continue;
    }
    if (!availableIds.has(scoreId) || !text || banned.test(text)) continue;
    scoreLines.push({
      scoreId,
      label: scorecard.scores[scoreId].shortLabel,
      value: scorecard.scores[scoreId].value,
      text: text.slice(0, 160),
      tone: scorecard.scores[scoreId].band?.tone ?? null,
    });
  }

  if (scoreLines.length === 0) return null;

  const contextBlob = JSON.stringify(buildScorecardInsightContext(scorecard));
  const percentClaims = [
    ...headline.matchAll(/\d+(?:\.\d+)?%/g),
    ...scoreLines.flatMap((line) => [...line.text.matchAll(/\d+(?:\.\d+)?%/g)]),
  ].map((m) => m[0]);
  if (percentClaims.some((claim) => !contextBlob.includes(claim))) {
    return null;
  }

  const displayLines = scoreLines.map((line) =>
    line.value != null
      ? `${line.label} ${line.value} — ${line.text}`
      : `${line.label} — ${line.text}`,
  );

  return {
    headline: headline.slice(0, 120),
    leadInsight: displayLines[0] ?? headline.slice(0, 120),
    whyItMatters:
      "These scores summarise structure, plan tracking, recent movement and data readiness — not expected returns.",
    supportingEvidence: displayLines,
    scoreLines,
    watchItem: watchItem ? watchItem.slice(0, 160) : null,
    resilienceNote: null,
    source: "ai",
    confidenceLabel: scorecard.scores.health.confidence.label,
    generatedAt: new Date().toISOString(),
    fingerprint: scorecard.portfolioFingerprint,
    scoreVersion: scorecard.scorecardVersion,
    disclaimer: PORTFOLIO_INSIGHT_DISCLAIMER,
  };
}

export async function generatePortfolioInsightWithOpenAI(
  scorecard: PortfolioScorecardResult,
  apiKey: string,
): Promise<PortfolioInsightResult> {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: PORTFOLIO_INSIGHT_MODEL,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: buildPortfolioInsightPromptFromScorecard(scorecard),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "portfolio_scorecard_insight",
          schema: INSIGHT_JSON_SCHEMA,
          strict: true,
        },
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `OpenAI portfolio insight failed (${response.status}): ${detail.slice(0, 240)}`,
    );
  }

  const payload = (await response.json()) as unknown;
  const text = extractResponseText(payload);
  if (!text) throw new Error("OpenAI portfolio insight returned empty text.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("OpenAI portfolio insight returned invalid JSON.");
  }

  const validated = validatePortfolioInsightAiPayloadFromScorecard(
    parsed,
    scorecard,
  );
  if (!validated) {
    throw new Error("OpenAI portfolio insight failed validation.");
  }
  return validated;
}

export function getOpenAiApiKeyForInsight(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();
  return key || null;
}
