import type { PriceApiQuote } from "@/lib/types/portfolioStorage";

type RawPriceResponse = PriceApiQuote & {
  crypto?: {
    normalizedPair?: string;
    pairPrice?: number | null;
    change24hPercent?: number | null;
    sourcePair?: string | null;
    conversionApplied?: boolean;
    conversionPath?: string | null;
    providerDisplayName?: string;
    fetchedAt?: string;
  };
  pairPrice?: number | null;
  change24hPercent?: number | null;
};

export function enrichPriceApiQuotes(
  quotes: RawPriceResponse[] | undefined,
): PriceApiQuote[] {
  return (quotes ?? []).map((quote) => ({
    ...quote,
    assetType: quote.assetType ?? (quote.crypto ? "crypto" : quote.assetType),
    pairPrice: quote.pairPrice ?? quote.crypto?.pairPrice ?? null,
    change24hPercent:
      quote.change24hPercent ?? quote.crypto?.change24hPercent ?? quote.changePercent ?? null,
    normalizedPair: quote.normalizedPair ?? quote.crypto?.normalizedPair ?? null,
    sourcePair: quote.sourcePair ?? quote.crypto?.sourcePair ?? null,
    conversionApplied:
      quote.conversionApplied ?? quote.crypto?.conversionApplied ?? false,
    conversionPath: quote.conversionPath ?? quote.crypto?.conversionPath ?? null,
    providerDisplayName:
      quote.providerDisplayName ?? quote.crypto?.providerDisplayName ?? quote.provider ?? null,
    fetchedAt: quote.fetchedAt ?? quote.crypto?.fetchedAt ?? null,
  }));
}
