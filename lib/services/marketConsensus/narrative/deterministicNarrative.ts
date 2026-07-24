import type {
  MarketConsensusNarrative,
  MarketConsensusNarrativeInput,
} from "@/lib/services/marketConsensus/narrative/types";

function classificationPhrase(classification: MarketConsensusNarrativeInput["classification"]): string {
  switch (classification) {
    case "positive":
      return "currently positive";
    case "neutral":
      return "broadly neutral";
    case "mixed":
      return "mixed";
    case "negative":
      return "currently cautious";
    default:
      return "limited";
  }
}

function agreementPhrase(
  agreementLevel: MarketConsensusNarrativeInput["agreementLevel"],
): string {
  switch (agreementLevel) {
    case "high":
      return "relatively high agreement across available coverage";
    case "moderate":
      return "moderate agreement across available coverage";
    case "divided":
      return "divided views among available contributors";
    default:
      return "a limited analyst sample";
  }
}

function trimFactor(value: string): string {
  return value.length > 90 ? `${value.slice(0, 87).trim()}…` : value;
}

export function buildDeterministicMarketConsensusNarrative(
  input: MarketConsensusNarrativeInput,
): MarketConsensusNarrative {
  const generatedAt = new Date().toISOString();

  if (input.instrumentType === "crypto") {
    return {
      summary:
        "Published crypto market views remain mixed and less standardized than equity analyst coverage. Available third-party context should be interpreted cautiously, with volatility and regulatory uncertainty remaining relevant.",
      supportingFactors: [
        trimFactor("Institutional adoption trends may support the broader outlook"),
      ],
      riskFactors: [
        trimFactor("Market volatility can change quickly"),
        trimFactor("Regulatory developments remain a material uncertainty"),
      ],
      generatedAt,
    };
  }

  if (input.instrumentType === "etf") {
    return {
      summary:
        "Available third-party research for this ETF focuses on underlying market conditions rather than a single-instrument analyst rating. The outlook should be interpreted through broader market and sector context, with diversification limits not removing market-wide risks.",
      supportingFactors: [
        trimFactor("Underlying market exposure spans multiple holdings"),
      ],
      riskFactors: [
        trimFactor("Broader market conditions can still affect returns"),
        trimFactor("Sector and regional exposures may diverge"),
      ],
      generatedAt,
    };
  }

  if (
    input.availability !== "available" ||
    input.classification === "unavailable" ||
    (input.analystCount ?? 0) <= 0
  ) {
    return {
      summary:
        "Available third-party coverage is limited, so the current outlook should be interpreted cautiously. Market drivers remain relevant, but there is not enough standardized analyst data for a strong consensus conclusion.",
      supportingFactors: [
        trimFactor("Limited third-party coverage reduces consensus visibility"),
      ],
      riskFactors: [
        trimFactor("Incomplete analyst data may miss emerging risks"),
        trimFactor("Market conditions can change before coverage improves"),
      ],
      generatedAt,
    };
  }

  const direction = classificationPhrase(input.classification);
  const agreement = agreementPhrase(input.agreementLevel);
  const upsideLine =
    input.impliedUpsidePercent != null
      ? ` Available third-party targets imply ${input.impliedUpsidePercent >= 0 ? "upside" : "downside"} of roughly ${Math.abs(input.impliedUpsidePercent).toFixed(1)}%, though targets are not guarantees.`
      : "";

  const summary = `Third-party analyst sentiment for ${input.instrumentName} is ${direction}, with ${agreement} among the available ratings.${upsideLine} Valuation, earnings uncertainty and broader market conditions remain important considerations.`.replace(
    /\s+/g,
    " ",
  );

  const supportingFactors = [
    input.agreementLevel === "high" || input.agreementLevel === "moderate"
      ? trimFactor("Analyst views show a relatively aligned direction")
      : trimFactor("Available ratings provide a directional third-party view"),
    input.buyCount != null &&
    input.analystCount != null &&
    input.sellCount != null &&
    input.buyCount > input.sellCount
      ? trimFactor("Positive ratings outweigh negative ratings in the sample")
      : trimFactor("Coverage reflects current third-party expectations"),
  ].slice(0, 3);

  const riskFactors = [
    input.agreementLevel === "divided" || input.agreementLevel === "limited"
      ? trimFactor("Analyst views remain divided or based on a small sample")
      : trimFactor("Consensus views can shift as new data emerges"),
    input.impliedUpsidePercent != null && input.impliedUpsidePercent > 0
      ? trimFactor("Elevated expectations may leave less room for disappointment")
      : trimFactor("Earnings and macro uncertainty can alter the outlook"),
    trimFactor("Third-party targets and ratings may be incomplete or delayed"),
  ].slice(0, 3);

  return {
    summary,
    supportingFactors,
    riskFactors,
    generatedAt,
  };
}
