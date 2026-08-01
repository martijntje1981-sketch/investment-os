import type { PerspectiveCategoryId } from "@/lib/services/perspectives/creators";
import type { PerspectiveTopicTag } from "@/lib/services/perspectives/topicTags";

/**
 * Rule-based “Why it matters” copy for the featured perspective.
 * Max 2 short sentences. Neutral wording. No invented market facts.
 */
export function buildPerspectiveWhyItMatters(input: {
  title: string;
  category: PerspectiveCategoryId;
  tags: PerspectiveTopicTag[];
}): string {
  const tags = input.tags;
  const sentences: string[] = [];

  if (
    tags.includes("Interest Rates") ||
    tags.includes("Federal Reserve") ||
    tags.includes("ECB") ||
    tags.includes("Liquidity") ||
    tags.includes("Inflation")
  ) {
    sentences.push(
      "This perspective discusses interest rates and liquidity, themes that can influence equities, currencies and digital assets.",
    );
  } else if (tags.includes("Bitcoin") || tags.includes("Crypto")) {
    sentences.push(
      "This perspective focuses on digital assets, a theme that can affect crypto exposure and related market risk appetite.",
    );
  } else if (
    tags.includes("AI") ||
    tags.includes("NVIDIA") ||
    tags.includes("Technology")
  ) {
    sentences.push(
      "This perspective covers technology and AI themes that can influence growth-oriented equity exposure.",
    );
  } else if (
    tags.includes("Earnings") ||
    tags.includes("Valuation") ||
    tags.includes("Equities") ||
    tags.includes("ETFs")
  ) {
    sentences.push(
      "This perspective looks at equity-market themes such as earnings, valuation or market structure.",
    );
  } else if (tags.includes("Gold")) {
    sentences.push(
      "This perspective discusses gold, a theme often followed for macro and portfolio diversification context.",
    );
  } else {
    switch (input.category) {
      case "macro":
        sentences.push(
          "This macro perspective provides context on economy-wide themes that can shape market conditions.",
        );
        break;
      case "bitcoin":
        sentences.push(
          "This perspective provides digital-asset market context for investors following crypto themes.",
        );
        break;
      case "technology":
        sentences.push(
          "This perspective provides technology-market context relevant to innovation and growth themes.",
        );
        break;
      case "investing":
      default:
        sentences.push(
          "This perspective shares an independent market view that can help frame current investing discussions.",
        );
        break;
    }
  }

  if (
    sentences.length < 2 &&
    (tags.includes("Macro") || input.category === "macro") &&
    !sentences[0]?.toLowerCase().includes("macro")
  ) {
    sentences.push(
      "It is presented for informational context alongside your own research.",
    );
  }

  return sentences.slice(0, 2).join(" ");
}
