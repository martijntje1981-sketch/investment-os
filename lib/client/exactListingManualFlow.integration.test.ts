/**
 * End-to-end client flow: unavailable lookup → manual STRC.AS → confirm → save → refresh.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  applyManualExactListingToImportRow,
} from "@/lib/services/instruments/listingConfirmation";
import { parseProviderSymbolInput } from "@/lib/services/instruments/providerSymbolInput";
import { MATCHING_UNAVAILABLE_WARNING } from "@/lib/services/marketData/providerErrors";
import {
  isProviderCircuitOpen,
  recordProviderCircuitFailure,
  resetProviderCircuitForTests,
} from "@/lib/services/marketData/providerCircuitBreaker";
import { EODHD_QUOTE_PROVIDER_ID } from "@/lib/services/instruments/eodhdQuoteGuard";
import {
  fetchIdMapping,
  fetchSearch,
} from "@/lib/services/instruments/eodhdClient";
import { matchInstrument } from "@/lib/services/instruments/instrumentMatchEngine";
import {
  annotateImportRow,
  confirmImportRow,
  finalizeImportRowsForSave,
  rememberConfirmedImportMappings,
  readImportMappingsFromCache,
} from "@/lib/services/import";
import { portfolioStorageKey } from "@/lib/client/portfolioStorageKeys";
import { writePortfolioToStorage } from "@/lib/client/userPortfolioStorage";
import type { ImportRow } from "@/lib/services/import/types";

vi.mock("@/lib/services/instruments/eodhdClient", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/instruments/eodhdClient")
  >();
  return {
    ...actual,
    fetchIdMapping: vi.fn(),
    fetchSearch: vi.fn(),
  };
});

vi.mock("@/lib/services/instruments/instrumentMatchEngine", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("@/lib/services/instruments/instrumentMatchEngine")
  >();
  return {
    ...actual,
    matchInstrument: vi.fn(),
  };
});

const USER = "manual-flow-test-user";

function strcRowFromScreenshot(): ImportRow {
  return annotateImportRow({
    id: "import-strc-1",
    symbol: "STRC",
    name: "21Shares Staking Basket Index ETP",
    quantity: 10,
    purchasePrice: 12.5,
    currentPrice: 13.1,
    purchaseDate: "2026-01-15",
    assetType: "investment",
    isin: "CH1528107811",
    exchange: null,
    providerSymbol: null,
    matchMethod: "unresolved",
    matchConfidence: 0,
    matchWarnings: [MATCHING_UNAVAILABLE_WARNING],
  });
}

describe("STRC.AS manual listing flow (provider unavailable)", () => {
  beforeEach(() => {
    localStorage.clear();
    resetProviderCircuitForTests();
    vi.mocked(fetchIdMapping).mockReset();
    vi.mocked(fetchSearch).mockReset();
    vi.mocked(matchInstrument).mockReset();

    recordProviderCircuitFailure(
      EODHD_QUOTE_PROVIDER_ID,
      new Error("You exceeded your daily API requests limit."),
    );
    expect(isProviderCircuitOpen(EODHD_QUOTE_PROVIDER_ID)).toBe(true);
  });

  it("completes upload review with STRC.AS without EODHD lookup", () => {
    const eodhdCalls = {
      idMapping: 0,
      search: 0,
      match: 0,
    };

    vi.mocked(fetchIdMapping).mockImplementation(async () => {
      eodhdCalls.idMapping += 1;
      return [];
    });
    vi.mocked(fetchSearch).mockImplementation(async () => {
      eodhdCalls.search += 1;
      return [];
    });
    vi.mocked(matchInstrument).mockImplementation(async () => {
      eodhdCalls.match += 1;
      return {
        providerSymbol: null,
        instrumentName: null,
        exchange: null,
        isin: "CH1528107811",
        matchMethod: "unresolved",
        confidence: 0,
        requiresConfirmation: true,
        warnings: [MATCHING_UNAVAILABLE_WARNING],
      };
    });

    let row = strcRowFromScreenshot();
    expect(row.reviewReason).toMatch(/temporarily unavailable/i);
    expect(row.providerSymbol).toBeNull();

    const parsed = parseProviderSymbolInput("STRC.AS");
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;

    row = applyManualExactListingToImportRow(row, parsed);
    expect(row.providerSymbol).toBe("STRC.AS");
    expect(row.symbol).toBe("STRC");
    expect(row.exchange).toBe("AS");
    expect(row.confirmationSource).toBe("manual_exact_listing");
    expect(row.isin).toBe("CH1528107811");
    expect(row.quantity).toBe(10);
    expect(row.purchaseDate).toBe("2026-01-15");

    const confirmed = confirmImportRow(row);
    expect(confirmed.userConfirmed).toBe(true);

    const holdings = finalizeImportRowsForSave([confirmed]);
    expect(holdings).toHaveLength(1);
    expect(holdings[0]?.providerSymbol).toBe("STRC.AS");
    expect(holdings[0]?.confirmationSource).toBe("manual_exact_listing");
    expect(holdings[0]?.currentPrice).toBe(13.1);

    rememberConfirmedImportMappings(USER, [confirmed]);
    writePortfolioToStorage(USER, holdings);

    const mappings = readImportMappingsFromCache(USER);
    expect(mappings.some((item) => item.providerSymbol === "STRC.AS")).toBe(true);

    localStorage.removeItem(portfolioStorageKey(USER));
    const refreshedRaw = localStorage.getItem(portfolioStorageKey(USER));
    writePortfolioToStorage(USER, holdings);
    const afterRefresh = JSON.parse(
      localStorage.getItem(portfolioStorageKey(USER)) ?? "[]",
    ) as Array<{ providerSymbol?: string }>;

    expect(refreshedRaw).toBeNull();
    expect(afterRefresh[0]?.providerSymbol).toBe("STRC.AS");

    expect(eodhdCalls.idMapping).toBe(0);
    expect(eodhdCalls.search).toBe(0);
    expect(eodhdCalls.match).toBe(0);
  });
});
