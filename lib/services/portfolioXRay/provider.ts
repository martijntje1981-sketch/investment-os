/**
 * Look-through data provider contract.
 * Default implementation is not connected — never invents holdings.
 */

import type { FundLookThrough } from "@/lib/services/portfolioXRay/types";

export type LookThroughProviderId = "none" | "eodhd_etf_data";

export type LookThroughProviderStatus = {
  id: LookThroughProviderId;
  connected: boolean;
  detail: string;
};

export type LookThroughProviderRequest = {
  instrumentId: string;
  symbol: string;
  name: string;
  providerSymbol: string | null;
  isin: string | null;
};

/**
 * Fetch verified fund constituents for one instrument.
 * Must return unavailable — never synthesize weights from names.
 */
export interface LookThroughHoldingsProvider {
  status(): LookThroughProviderStatus;
  fetchFundLookThrough(
    request: LookThroughProviderRequest,
  ): Promise<FundLookThrough>;
}

/**
 * Default provider — honest unavailable until ETF holdings are connected.
 */
export class UnavailableLookThroughProvider
  implements LookThroughHoldingsProvider
{
  status(): LookThroughProviderStatus {
    return {
      id: "none",
      connected: false,
      detail:
        "ETF/fund constituent holdings are not connected in Tobailey yet. EODHD ETF_Data exists as a candidate source but is not wired or validated for this portfolio book.",
    };
  }

  async fetchFundLookThrough(
    request: LookThroughProviderRequest,
  ): Promise<FundLookThrough> {
    return {
      instrumentId: request.instrumentId,
      instrumentSymbol: request.symbol,
      instrumentName: request.name,
      providerSymbol: request.providerSymbol,
      asOfDate: null,
      dataQuality: "provider_not_connected",
      coveragePercent: null,
      holdingsCount: null,
      constituents: [],
      unavailableReason:
        "Look-through holdings are unavailable because no constituent data provider is connected.",
    };
  }
}
