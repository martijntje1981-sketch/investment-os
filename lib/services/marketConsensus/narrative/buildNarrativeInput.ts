import type { AnalystConsensusResult } from "@/lib/services/marketConsensus/types";
import type { MarketConsensusNarrativeInput } from "@/lib/services/marketConsensus/narrative/types";

function resolveInstrumentType(
  result: AnalystConsensusResult,
): MarketConsensusNarrativeInput["instrumentType"] {
  if (result.coverageType === "crypto-market-outlook") {
    return "crypto";
  }

  if (result.coverageType === "underlying-market") {
    return "etf";
  }

  if (result.coverageType === "equity-analyst") {
    return "equity";
  }

  return "unknown";
}

export function buildMarketConsensusNarrativeInput(
  result: AnalystConsensusResult,
  instrumentName: string,
): MarketConsensusNarrativeInput {
  const input: MarketConsensusNarrativeInput = {
    instrumentName,
    symbol: result.symbol,
    instrumentType: resolveInstrumentType(result),
    coverageType: result.coverageType,
    availability: result.availability,
    classification: result.classification,
  };

  if (result.analystCount != null && result.analystCount > 0) {
    input.analystCount = result.analystCount;
  }

  if (result.buyCount != null && result.buyCount >= 0) {
    input.buyCount = result.buyCount;
  }

  if (result.holdCount != null && result.holdCount >= 0) {
    input.holdCount = result.holdCount;
  }

  if (result.sellCount != null && result.sellCount >= 0) {
    input.sellCount = result.sellCount;
  }

  if (result.averageTarget != null && Number.isFinite(result.averageTarget)) {
    input.averageTarget = Number(result.averageTarget.toFixed(2));
  }

  if (
    result.impliedUpsidePercent != null &&
    Number.isFinite(result.impliedUpsidePercent)
  ) {
    input.impliedUpsidePercent = Number(result.impliedUpsidePercent.toFixed(1));
  }

  if (result.agreementLevel) {
    input.agreementLevel = result.agreementLevel;
  }

  if (result.sourceName) {
    input.sourceName = result.sourceName;
  }

  if (result.updatedAt) {
    input.updatedAt = result.updatedAt;
  }

  return input;
}

export function shouldAttemptAiNarrative(
  input: MarketConsensusNarrativeInput,
): boolean {
  return (
    input.instrumentType === "equity" &&
    input.coverageType === "equity-analyst" &&
    input.availability === "available" &&
    (input.analystCount ?? 0) > 0
  );
}

export function shouldEnrichResultWithNarrative(
  result: AnalystConsensusResult,
): boolean {
  if (result.availability === "error") {
    return false;
  }

  if (
    result.coverageType === "unavailable" &&
    result.availability === "unavailable"
  ) {
    return false;
  }

  return true;
}
