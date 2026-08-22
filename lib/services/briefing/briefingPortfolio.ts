/**
 * Briefing portfolio resolution — uses the Instrument Match Engine so briefing,
 * pricing, and imports share the same providerSymbol pipeline.
 */

import { matchInstruments } from "@/lib/services/instruments";
import { getDefaultPortfolioPriceSeed } from "@/lib/services/portfolio/priceSeed";
import type { PortfolioInstrumentPayload } from "@/lib/types/portfolioStorage";

export type BriefingHolding = {
  symbol: string;
  name: string;
  providerSymbol: string | null;
  instrumentName: string | null;
  isin: string | null;
};

function cleanSymbol(value: string | null | undefined): string {
  return value ? value.trim().toUpperCase() : "";
}

/** Resolves briefing holdings to providerSymbol via the Match Engine. */
export async function resolveBriefingPortfolio(
  inputs: PortfolioInstrumentPayload[],
): Promise<BriefingHolding[]> {
  const sourceInputs =
    inputs.length > 0
      ? inputs
      : getDefaultPortfolioPriceSeed().map((seed) => ({
          symbol: seed.ticker ?? "",
          name: seed.instrumentName ?? seed.ticker ?? "",
          isin: seed.isin ?? null,
          exchange: seed.exchange ?? null,
          providerSymbol: null,
          instrumentName: seed.instrumentName ?? null,
        }));

  const matchResults = await matchInstruments(
    sourceInputs.map((input) => ({
      ticker: cleanSymbol(input.symbol) || null,
      isin: input.isin ?? null,
      exchange: input.exchange ?? null,
      instrumentName: input.instrumentName ?? input.name ?? null,
      assetType: "investment" as const,
    })),
  );

  return matchResults.map(({ resolved }, index) => {
    const source = sourceInputs[index];
    const providerCode = resolved.providerSymbol?.split(".")[0] ?? "";

    return {
      symbol: cleanSymbol(source.symbol) || providerCode,
      name: source.name || resolved.instrumentName || source.symbol || providerCode,
      providerSymbol: source.providerSymbol ?? resolved.providerSymbol,
      instrumentName: resolved.instrumentName ?? source.instrumentName ?? null,
      isin: resolved.isin ?? source.isin ?? null,
    };
  });
}

/** Matches EODHD news items to portfolio holdings using providerSymbol and names. */
export function matchNewsToPortfolioHoldings(
  haystack: string,
  portfolio: BriefingHolding[],
): string[] {
  const text = haystack.toLowerCase();

  return portfolio
    .filter((holding) => {
      if (
        holding.providerSymbol &&
        text.includes(holding.providerSymbol.toLowerCase())
      ) {
        return true;
      }

      if (holding.symbol && text.includes(holding.symbol.toLowerCase())) {
        return true;
      }

      if (holding.isin && text.includes(holding.isin.toLowerCase())) {
        return true;
      }

      const label = (holding.instrumentName ?? holding.name).toLowerCase();
      const words = label
        .split(/\s+/)
        .filter((word) => word.length > 4);

      return words.some((word) => text.includes(word));
    })
    .map((holding) => holding.symbol);
}

export function portfolioSymbols(portfolio: BriefingHolding[]): string[] {
  return portfolio.map((holding) => holding.symbol);
}

export function providerSymbolsForNews(
  portfolio: BriefingHolding[],
): string[] {
  return Array.from(
    new Set(
      portfolio
        .map((holding) => holding.providerSymbol)
        .filter((symbol): symbol is string => Boolean(symbol)),
    ),
  );
}
