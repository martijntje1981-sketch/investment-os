/**
 * After a new confirmed listing is saved, fetch its quote through the existing
 * POST /api/prices path and merge price fields onto the saved holdings list.
 */

import { applyPricesOntoCurrentHoldings } from "@/lib/client/portfolioDeletePersistence";
import {
  countAppliedPriceUpdates,
  tryRefreshPortfolioPrices,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";

export type ConfirmedListingAfterSaveResult = {
  holdings: StoredPortfolioHolding[];
  quoteApplied: boolean;
};

let postSaveRefreshInFlight: Promise<ConfirmedListingAfterSaveResult> | null =
  null;

export function resetConfirmedListingAfterSaveForTests(): void {
  postSaveRefreshInFlight = null;
}

function confirmedProviderSymbol(
  holding: StoredPortfolioHolding,
): string | null {
  const symbol = holding.providerSymbol?.trim();
  if (!symbol) return null;
  if (holding.assetType === "cash") return null;
  return symbol;
}

/**
 * Live-quote a newly saved confirmed listing. Never unsaves the holding.
 * Does not overwrite quantity, purchase price, currency, or listing identity
 * when a quote is applied — those fields stay as saved.
 */
export async function refreshConfirmedListingAfterSave(input: {
  userSub: string;
  holdings: StoredPortfolioHolding[];
  savedHolding: StoredPortfolioHolding;
}): Promise<ConfirmedListingAfterSaveResult> {
  const providerSymbol = confirmedProviderSymbol(input.savedHolding);
  if (!providerSymbol) {
    return { holdings: input.holdings, quoteApplied: false };
  }

  if (postSaveRefreshInFlight) {
    await postSaveRefreshInFlight.catch(() => undefined);
    return { holdings: input.holdings, quoteApplied: false };
  }

  const run = (async (): Promise<ConfirmedListingAfterSaveResult> => {
    const result = await tryRefreshPortfolioPrices(
      input.userSub,
      [input.savedHolding],
      {
        forceRefresh: true,
        onlyProviderSymbols: [providerSymbol],
      },
    );

    const priced = result.holdings[0];
    const quoteApplied =
      result.updated &&
      priced != null &&
      countAppliedPriceUpdates([input.savedHolding], [priced]) > 0;

    if (!quoteApplied || !priced) {
      return { holdings: input.holdings, quoteApplied: false };
    }

    return {
      holdings: applyPricesOntoCurrentHoldings(input.holdings, [priced]),
      quoteApplied: true,
    };
  })();

  postSaveRefreshInFlight = run.finally(() => {
    postSaveRefreshInFlight = null;
  });

  return run;
}
