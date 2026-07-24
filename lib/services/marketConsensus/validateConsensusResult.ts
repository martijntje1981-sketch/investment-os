import type {
  AnalystConsensusResult,
  ConsensusAgreementLevel,
  ConsensusClassification,
} from "@/lib/services/marketConsensus/types";

function isFinitePositive(value: number | undefined): value is number {
  return value != null && Number.isFinite(value) && value > 0;
}

export function deriveAgreementLevel(input: {
  analystCount: number;
  buyCount: number;
  holdCount: number;
  sellCount: number;
}): ConsensusAgreementLevel {
  const total = input.analystCount;
  if (total <= 0) {
    return "limited";
  }

  if (total < 3) {
    return "limited";
  }

  const buyShare = input.buyCount / total;
  const sellShare = input.sellCount / total;
  const maxShare = Math.max(buyShare, input.holdCount / total, sellShare);

  if (buyShare >= 0.25 && sellShare >= 0.25) {
    return "divided";
  }

  if (maxShare >= 0.6) {
    return "high";
  }

  if (maxShare >= 0.4) {
    return "moderate";
  }

  return "divided";
}

export function deriveClassification(input: {
  buyCount: number;
  holdCount: number;
  sellCount: number;
  analystCount: number;
}): ConsensusClassification {
  if (input.analystCount <= 0) {
    return "unavailable";
  }

  const total = input.buyCount + input.holdCount + input.sellCount;
  if (total <= 0) {
    return "unavailable";
  }

  const buyShare = input.buyCount / total;
  const sellShare = input.sellCount / total;
  const holdShare = input.holdCount / total;

  if (buyShare >= 0.25 && sellShare >= 0.25) {
    return "mixed";
  }

  if (sellShare >= 0.5) {
    return "negative";
  }

  if (buyShare >= 0.5) {
    return "positive";
  }

  if (holdShare >= 0.5) {
    return "neutral";
  }

  if (buyShare > sellShare) {
    return "positive";
  }

  if (sellShare > buyShare) {
    return "negative";
  }

  return "mixed";
}

export function hasConsistentDistribution(result: AnalystConsensusResult): boolean {
  if (result.analystCount == null || result.analystCount <= 0) {
    return false;
  }

  const buy = result.buyCount ?? 0;
  const hold = result.holdCount ?? 0;
  const sell = result.sellCount ?? 0;

  if (buy < 0 || hold < 0 || sell < 0) {
    return false;
  }

  return buy + hold + sell === result.analystCount;
}

export function hasValidPriceTargetFields(result: AnalystConsensusResult): boolean {
  return (
    isFinitePositive(result.currentPrice) &&
    isFinitePositive(result.averageTarget) &&
    result.impliedUpsidePercent != null &&
    Number.isFinite(result.impliedUpsidePercent)
  );
}

/** Downgrades incomplete or inconsistent provider payloads before UI exposure. */
export function validateAndSanitizeConsensusResult(
  result: AnalystConsensusResult,
): AnalystConsensusResult {
  if (result.coverageType !== "equity-analyst") {
    return {
      ...result,
      buyCount: undefined,
      holdCount: undefined,
      sellCount: undefined,
      averageTarget: undefined,
      highTarget: undefined,
      lowTarget: undefined,
      impliedUpsidePercent: undefined,
      positiveFactors: undefined,
      riskFactors: undefined,
    };
  }

  if (result.availability === "error") {
    return result;
  }

  if (
    result.availability === "unavailable" &&
    (result.analystCount == null || result.analystCount <= 0)
  ) {
    return {
      ...result,
      buyCount: undefined,
      holdCount: undefined,
      sellCount: undefined,
      averageTarget: undefined,
      highTarget: undefined,
      lowTarget: undefined,
      impliedUpsidePercent: undefined,
      positiveFactors: undefined,
      riskFactors: undefined,
    };
  }

  if (!hasConsistentDistribution(result)) {
    return {
      ...result,
      availability: "limited",
      classification: "unavailable",
      buyCount: undefined,
      holdCount: undefined,
      sellCount: undefined,
      averageTarget: undefined,
      highTarget: undefined,
      lowTarget: undefined,
      impliedUpsidePercent: undefined,
      agreementLevel: "limited",
      summary:
        result.summary ??
        "Analyst rating distribution was incomplete and could not be shown reliably.",
    };
  }

  const classification = deriveClassification({
    analystCount: result.analystCount ?? 0,
    buyCount: result.buyCount ?? 0,
    holdCount: result.holdCount ?? 0,
    sellCount: result.sellCount ?? 0,
  });

  const agreementLevel = deriveAgreementLevel({
    analystCount: result.analystCount ?? 0,
    buyCount: result.buyCount ?? 0,
    holdCount: result.holdCount ?? 0,
    sellCount: result.sellCount ?? 0,
  });

  const sanitized: AnalystConsensusResult = {
    ...result,
    classification,
    agreementLevel,
    highTarget: undefined,
    lowTarget: undefined,
  };

  if (!hasValidPriceTargetFields(sanitized)) {
    sanitized.averageTarget = undefined;
    sanitized.impliedUpsidePercent = undefined;
  }

  if (
    sanitized.availability === "available" &&
    (sanitized.analystCount ?? 0) <= 0
  ) {
    sanitized.availability = "limited";
    sanitized.classification = "unavailable";
  }

  return sanitized;
}

export function agreementLevelLabel(
  level: ConsensusAgreementLevel | undefined,
): string | null {
  switch (level) {
    case "high":
      return "High agreement";
    case "moderate":
      return "Moderate agreement";
    case "divided":
      return "Divided views";
    case "limited":
      return "Limited analyst sample";
    default:
      return null;
  }
}

export function classificationStatusLabel(
  classification: ConsensusClassification,
): "Positive consensus" | "Neutral consensus" | "Mixed consensus" | "Negative consensus" | null {
  switch (classification) {
    case "positive":
      return "Positive consensus";
    case "neutral":
      return "Neutral consensus";
    case "mixed":
      return "Mixed consensus";
    case "negative":
      return "Negative consensus";
    default:
      return null;
  }
}
