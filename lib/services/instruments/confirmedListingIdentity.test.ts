import { beforeEach, describe, expect, it } from "vitest";

import { classifyHoldingExposure } from "@/lib/services/classification";
import { buildPriceRequestPayload } from "@/lib/client/portfolioPricing";
import { importMappingStorageKey } from "@/lib/client/importMappingStorageKeys";
import {
  applySavedMappingsToRows,
  rememberConfirmedImportMappings,
} from "@/lib/services/import/mappingMemory";
import type { ImportRow } from "@/lib/services/import/types";
import {
  findHoldingByInsightSubject,
  findLocalListingCounterpart,
  lookupResearchProfileForHolding,
  mergeConfirmedListingIdentity,
  mergeRemoteListingIdentity,
  newsItemMatchesConfirmedHolding,
  resolveQuoteCurrencyForConfirmedListing,
} from "@/lib/services/instruments/confirmedListingIdentity";
import { resolveExchangeFallbackQuoteCurrency } from "@/lib/services/instruments/exchangeQuoteCurrencyFallback";
import { enrichHoldingWithVerifiedMapping } from "@/lib/services/portfolio/enrichHoldingsWithVerifiedMappings";
import { resolveQuotePriceTargets } from "@/lib/services/prices/resolvePriceTargets";
import { newsItemMatchesHolding } from "@/lib/services/holdingIntelligence/attachHoldingNews";
import { themeKeyForSymbol } from "@/lib/services/fourQuestions/briefingSelection";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

const USER = "listing-identity-user";

function holding(
  overrides: Partial<StoredPortfolioHolding> &
    Pick<StoredPortfolioHolding, "symbol">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? `${overrides.symbol}-id`,
    symbol: overrides.symbol,
    name: overrides.name ?? overrides.symbol,
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 110,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    providerSymbol: overrides.providerSymbol,
    exchange: overrides.exchange,
    isin: overrides.isin,
    quoteCurrency: overrides.quoteCurrency,
    pricingExchange: overrides.pricingExchange,
    confirmationSource: overrides.confirmationSource ?? "manual_exact_listing",
    requiresConfirmation: overrides.requiresConfirmation ?? false,
    instrumentName: overrides.instrumentName,
  };
}

function importRow(overrides: Partial<ImportRow> = {}): ImportRow {
  return {
    id: "row-1",
    symbol: "VUSA",
    name: "Vanguard S&P 500 UCITS ETF",
    quantity: 86,
    purchasePrice: 100,
    currentPrice: 120,
    purchaseDate: null,
    assetType: "investment",
    currency: "EUR",
    isin: "IE00B3XXRP09",
    exchange: "AS",
    reviewTier: "auto",
    userConfirmed: true,
    providerSymbol: "VUSA.AS",
    quoteCurrency: "EUR",
    matchMethod: "ticker_exchange",
    ...overrides,
  };
}

describe("confirmed listing identity", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("keeps the same ticker on two exchanges as distinct listings", () => {
    const amsterdam = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });
    const london = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.LSE",
      exchange: "LSE",
      isin: "IE00B3XXRP09",
      quoteCurrency: "GBP",
    });

    expect(lookupResearchProfileForHolding(amsterdam)?.providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(lookupResearchProfileForHolding(london)?.providerSymbol).toBe(
      "VUSA.LSE",
    );
    expect(classifyHoldingExposure(amsterdam).classificationSource).toBe(
      "research_profile",
    );
    expect(classifyHoldingExposure(london).classificationSource).toBe(
      "research_profile",
    );
  });

  it("does not convert a confirmed ISIN listing to another venue via the registry", () => {
    const london = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.LSE",
      exchange: "LSE",
      isin: "IE00B3XXRP09",
      quoteCurrency: "GBP",
    });

    const enriched = enrichHoldingWithVerifiedMapping(london);
    expect(enriched.providerSymbol).toBe("VUSA.LSE");
    expect(enriched.exchange).toBe("LSE");
    expect(enriched.quoteCurrency).toBe("GBP");
  });

  it("prices a confirmed listing that is absent from the verified registry", () => {
    const iwda = holding({
      symbol: "IWDA",
      name: "iShares Core MSCI World",
      providerSymbol: "IWDA.AS",
      exchange: "AS",
      isin: "IE00B4L5Y983",
      quoteCurrency: "EUR",
    });

    expect(lookupResearchProfileForHolding(iwda)).toBeNull();
    expect(classifyHoldingExposure(iwda).normalizedGroupId).toBe(
      "other_unclassified",
    );

    const { targets, errors, skipped } = resolveQuotePriceTargets([iwda]);
    expect(errors).toEqual([]);
    expect(skipped).toBe(0);
    expect(targets[0]?.providerSymbol).toBe("IWDA.AS");
    expect(targets[0]?.currency).toBe("EUR");
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();
  });

  it("does not borrow another venue's research profile for a confirmed missing listing", () => {
    const paris = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.PA",
      exchange: "PA",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });

    expect(lookupResearchProfileForHolding(paris)).toBeNull();
    expect(classifyHoldingExposure(paris).normalizedGroupId).toBe(
      "other_unclassified",
    );
  });

  it("enriches quote currency from the registry only for the same confirmed listing", () => {
    const vusa = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: null,
    });

    const enriched = enrichHoldingWithVerifiedMapping(vusa);
    expect(enriched.providerSymbol).toBe("VUSA.AS");
    expect(enriched.quoteCurrency).toBe("EUR");
  });

  it("keeps holding quote currency when the saved mapping quote is missing", () => {
    rememberConfirmedImportMappings(USER, [
      importRow({ quoteCurrency: null }),
    ]);

    const kids = holding({
      id: "kids-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });

    const [payload] = buildPriceRequestPayload([kids], USER);
    expect(payload?.providerSymbol).toBe("VUSA.AS");
    expect(payload?.quoteCurrency).toBe("EUR");
    expect(
      mergeConfirmedListingIdentity(kids, {
        providerSymbol: "VUSA.AS",
        quoteCurrency: null,
        exchange: "AS",
        isin: "IE00B3XXRP09",
        instrumentName: "Vanguard S&P 500 UCITS ETF",
      }).quoteCurrency,
    ).toBe("EUR");
  });

  it("ignores a saved mapping for a different listing of the same ISIN", () => {
    rememberConfirmedImportMappings(USER, [
      importRow({
        providerSymbol: "VUSA.LSE",
        exchange: "LSE",
        quoteCurrency: "GBP",
      }),
    ]);

    const kids = holding({
      id: "kids-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });

    const [payload] = buildPriceRequestPayload([kids], USER);
    expect(payload?.providerSymbol).toBe("VUSA.AS");
    expect(payload?.exchange).toBe("AS");
    expect(payload?.quoteCurrency).toBe("EUR");
  });

  it("does not apply a conflicting saved mapping onto an already confirmed import row", () => {
    rememberConfirmedImportMappings(USER, [
      importRow({
        providerSymbol: "VUSA.LSE",
        exchange: "LSE",
        quoteCurrency: "GBP",
      }),
    ]);

    const [row] = applySavedMappingsToRows(USER, [
      importRow({
        providerSymbol: "VUSA.AS",
        exchange: "AS",
        quoteCurrency: "EUR",
      }),
    ]);

    expect(row?.providerSymbol).toBe("VUSA.AS");
    expect(row?.quoteCurrency).toBe("EUR");
  });

  it("keeps books with different listings isolated when switching portfolios", () => {
    const kids = holding({
      id: "kids-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });
    const main = holding({
      id: "main-vwce",
      symbol: "VWCE",
      providerSymbol: "VWCE.XETRA",
      exchange: "XETRA",
      isin: "IE00BK5BQT80",
      quoteCurrency: "EUR",
    });

    const kidsPayload = buildPriceRequestPayload([kids], USER);
    const mainPayload = buildPriceRequestPayload([main], USER);

    expect(kidsPayload[0]?.providerSymbol).toBe("VUSA.AS");
    expect(mainPayload[0]?.providerSymbol).toBe("VWCE.XETRA");
    expect(lookupResearchProfileForHolding(kids)?.providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(lookupResearchProfileForHolding(main)?.providerSymbol).toBe(
      "VWCE.XETRA",
    );
  });

  it("keeps VUSA.AS as the production kids regression case", () => {
    const kidsVusa = holding({
      id: "885a0817-45ac-4107-a1fa-24e313555722",
      symbol: "VUSA",
      name: "Vanguard S&P 500 UCITS ETF",
      quantity: 86,
      purchasePrice: 100.69,
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });

    expect(enrichHoldingWithVerifiedMapping(kidsVusa).providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(lookupResearchProfileForHolding(kidsVusa)?.providerSymbol).toBe(
      "VUSA.AS",
    );
    expect(classifyHoldingExposure(kidsVusa).normalizedGroupId).toBe(
      "diversified_equity",
    );

    const { targets } = resolveQuotePriceTargets([kidsVusa]);
    expect(targets[0]?.providerSymbol).toBe("VUSA.AS");
    expect(targets[0]?.currency).toBe("EUR");
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();
  });

  it("still allows ticker-only research fallback when the listing is unresolved", () => {
    const unresolved = holding({
      symbol: "VUSA",
      providerSymbol: null,
      exchange: null,
    });

    expect(lookupResearchProfileForHolding(unresolved)?.providerSymbol).toBe(
      "VUSA.LSE",
    );
    expect(classifyHoldingExposure(unresolved).normalizedGroupId).toBe(
      "diversified_equity",
    );
  });

  it("uses a same-listing saved mapping quote when the holding quote is missing", () => {
    const resolution = resolveQuoteCurrencyForConfirmedListing({
      persistedQuoteCurrency: null,
      providerSymbol: "IWDA.AS",
      exchange: "AS",
      savedMapping: {
        providerSymbol: "IWDA.AS",
        quoteCurrency: "EUR",
        exchange: "AS",
        isin: "IE00B4L5Y983",
        instrumentName: "iShares Core MSCI World",
      },
    });

    expect(resolution.currency).toBe("EUR");
    expect(resolution.source).toBe("persisted_listing");
  });

  it("does not invent quote currency from the Amsterdam exchange suffix", () => {
    const resolution = resolveQuoteCurrencyForConfirmedListing({
      persistedQuoteCurrency: null,
      providerSymbol: "FOO.AS",
      exchange: "AS",
    });

    expect(resolution.currency).toBeNull();
    expect(resolution.requiresReview).toBe(true);
    expect(resolveExchangeFallbackQuoteCurrency("AS")).toBeNull();
  });

  it("selects the confirmed listing for insight, news, and Four Questions subjects", () => {
    const amsterdam = holding({
      id: "kids-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });
    const london = holding({
      id: "main-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.LSE",
      exchange: "LSE",
      isin: "IE00B3XXRP09",
      quoteCurrency: "GBP",
    });
    const both = [amsterdam, london];

    expect(findHoldingByInsightSubject("VUSA.AS", both)?.id).toBe("kids-vusa");
    expect(findHoldingByInsightSubject("VUSA.LSE", both)?.id).toBe("main-vusa");
    expect(findHoldingByInsightSubject("VUSA", both)).toBeNull();
    expect(themeKeyForSymbol("VUSA.AS", both)).not.toBeNull();
    expect(themeKeyForSymbol("VUSA.LSE", both)).not.toBeNull();
    expect(themeKeyForSymbol("VUSA", both)).toBeNull();

    const londonNews = {
      matchedHoldingIds: ["main-vusa"],
      matchedSymbols: ["VUSA"],
      matchedHoldings: [
        {
          id: "main-vusa",
          symbol: "VUSA",
          providerSymbol: "VUSA.LSE",
        },
      ],
    };
    expect(newsItemMatchesConfirmedHolding(londonNews, london)).toBe(true);
    expect(newsItemMatchesConfirmedHolding(londonNews, amsterdam)).toBe(false);
    expect(newsItemMatchesHolding(londonNews, amsterdam)).toBe(false);
  });

  it("preserves confirmed identity across a sync merge when remote omits listing fields", () => {
    const local = holding({
      id: "kids-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      pricingExchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
      confirmationSource: "manual_exact_listing",
    });
    const remote = {
      ...holding({
        id: "kids-vusa",
        symbol: "VUSA",
        providerSymbol: "VUSA.AS",
        exchange: "AS",
      }),
      quoteCurrency: null,
      confirmationSource: undefined,
      pricingExchange: undefined,
      isin: null,
    };

    const merged = mergeRemoteListingIdentity(remote, local);
    expect(merged.quoteCurrency).toBe("EUR");
    expect(merged.confirmationSource).toBe("manual_exact_listing");
    expect(merged.pricingExchange).toBe("AS");
    expect(merged.providerSymbol).toBe("VUSA.AS");
    expect(merged.isin).toBe("IE00B3XXRP09");
  });

  it("does not merge two confirmed venues of the same ticker during sync counterpart lookup", () => {
    const amsterdam = holding({
      id: "kids-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      quoteCurrency: "EUR",
    });
    const london = holding({
      id: "other-vusa",
      symbol: "VUSA",
      providerSymbol: "VUSA.LSE",
      exchange: "LSE",
      quoteCurrency: "GBP",
    });

    expect(
      findLocalListingCounterpart(
        holding({
          id: "new-lse",
          symbol: "VUSA",
          providerSymbol: "VUSA.LSE",
          exchange: "LSE",
        }),
        [amsterdam],
      ),
    ).toBeUndefined();
    expect(
      findLocalListingCounterpart(
        holding({
          id: "new-lse",
          symbol: "VUSA",
          providerSymbol: "VUSA.LSE",
        }),
        [amsterdam, london],
      )?.id,
    ).toBe("other-vusa");
  });

  it("keeps same-ISIN listings in different currencies isolated", () => {
    const eur = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.AS",
      exchange: "AS",
      isin: "IE00B3XXRP09",
      quoteCurrency: "EUR",
    });
    const gbp = holding({
      symbol: "VUSA",
      providerSymbol: "VUSA.LSE",
      exchange: "LSE",
      isin: "IE00B3XXRP09",
      quoteCurrency: "GBP",
    });

    const { targets } = resolveQuotePriceTargets([eur, gbp]);
    expect(targets.map((row) => row.providerSymbol).sort()).toEqual([
      "VUSA.AS",
      "VUSA.LSE",
    ]);
    expect(targets.find((row) => row.providerSymbol === "VUSA.AS")?.currency).toBe(
      "EUR",
    );
    expect(targets.find((row) => row.providerSymbol === "VUSA.LSE")?.currency).toBe(
      "GBP",
    );
  });
});
