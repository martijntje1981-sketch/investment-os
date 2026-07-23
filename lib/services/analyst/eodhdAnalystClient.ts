/**
 * EODHD fundamentals adapter for analyst ratings and price targets.
 *
 * Licensing: data is fetched only via authorized EODHD API when EODHD_API_KEY is set.
 * AnalystRatings coverage is primarily available for US-listed equities.
 */

import { getEodhdApiKey } from "@/lib/services/instruments/eodhdClient";
import { executeEodhdApiCall } from "@/lib/services/marketData/eodhdApiCall";
import { markEodhdDailyQuotaExhausted } from "@/lib/services/marketData/eodhdDailyQuota";

export type EodhdAnalystRatings = {
  Rating?: number | null;
  TargetPrice?: number | null;
  StrongBuy?: number | null;
  Buy?: number | null;
  Hold?: number | null;
  Sell?: number | null;
  StrongSell?: number | null;
};

type FundamentalsResponse = {
  AnalystRatings?: EodhdAnalystRatings;
  Highlights?: {
    WallStreetTargetPrice?: number | null;
  };
  General?: {
    CurrencyCode?: string | null;
    Name?: string | null;
    Type?: string | null;
  };
};

export const EODHD_ANALYST_SOURCE = "EODHD Fundamentals";

export async function fetchEodhdAnalystFundamentals(
  providerSymbol: string,
  apiKey: string = getEodhdApiKey(),
): Promise<{
  ratings: EodhdAnalystRatings | null;
  wallStreetTargetPrice: number | null;
  currency: string | null;
  instrumentType: string | null;
}> {
  const url = new URL(
    `https://eodhd.com/api/fundamentals/${encodeURIComponent(providerSymbol)}`,
  );
  url.searchParams.set("api_token", apiKey);
  url.searchParams.set("fmt", "json");
  url.searchParams.set("filter", "AnalystRatings,Highlights,General");

  return executeEodhdApiCall(async () => {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (response.status === 404) {
      return {
        ratings: null,
        wallStreetTargetPrice: null,
        currency: null,
        instrumentType: null,
      };
    }

    if (!response.ok) {
      if (response.status === 402) {
        await markEodhdDailyQuotaExhausted();
      }
      const details = await response.text();
      throw new Error(
        `EODHD analyst fundamentals returned ${response.status}: ${details}`,
      );
    }

    const data = (await response.json()) as FundamentalsResponse;
    return {
      ratings: data.AnalystRatings ?? null,
      wallStreetTargetPrice:
        data.Highlights?.WallStreetTargetPrice ?? null,
      currency: data.General?.CurrencyCode ?? null,
      instrumentType: data.General?.Type ?? null,
    };
  });
}
