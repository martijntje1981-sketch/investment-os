import { createEodhdMarketDataProvider } from "@/lib/services/prices/providers/eodhdMarketDataProvider";
import type { MarketDataProvider } from "@/lib/services/prices/types";

/**
 * Selects the active market-data provider for a symbol.
 * EODHD is the only registered provider today; additional providers can be
 * appended to the registry later without changing PriceService consumers.
 */
export function createProviderRouter(
  providers: MarketDataProvider[] = [createEodhdMarketDataProvider()],
): {
  selectProvider: (providerSymbol: string) => MarketDataProvider | null;
} {
  return {
    selectProvider(providerSymbol: string) {
      for (const provider of providers) {
        if (provider.supports(providerSymbol)) {
          return provider;
        }
      }
      return null;
    },
  };
}
