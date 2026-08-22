/**
 * Structural guard for a client-supplied canonical review.
 * Does not recalculate intelligence — only checks the shape the PDF can render.
 */

import type { PeriodIntelligenceReview } from "@/lib/services/periodIntelligence/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function isPeriodIntelligenceReview(
  value: unknown,
): value is PeriodIntelligenceReview {
  if (!isRecord(value)) return false;
  if (value.kind !== "weekly" && value.kind !== "monthly") return false;
  if (typeof value.ready !== "boolean") return false;
  if (typeof value.isDemo !== "boolean") return false;
  if (value.intelligenceDepth !== "free" && value.intelligenceDepth !== "complete") {
    return false;
  }
  if (!isRecord(value.period)) return false;
  if (typeof value.period.dateRangeLabel !== "string") return false;
  if (!Array.isArray(value.executiveSummary)) return false;
  if (!isRecord(value.confidence) || !Array.isArray(value.confidence.notes)) {
    return false;
  }
  return true;
}
