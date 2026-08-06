import { describe, expect, it } from "vitest";

import {
  buildDistributionPolicyViewModel,
  policyStatusLabel,
} from "@/lib/client/dividendPolicy/buildDividendPolicyViewModel";
import { mapConsensusResultToCard } from "@/lib/client/marketConsensus/mapConsensusResultToCard";
import {
  classifyDistributionPolicy,
  buildPortfolioDistributionPolicySnapshot,
} from "@/lib/services/dividends/classifyDistributionPolicy";
import { detectNameMarkerPolicy } from "@/lib/services/dividends/distributionPolicyNameMarkers";
import {
  isEligibleForPassiveIncomeEstimation,
  passiveIncomeIneligibilityReason,
} from "@/lib/services/dividends/passiveIncomeEligibility";
import {
  listReviewedDistributionPolicies,
  lookupReviewedDistributionPolicy,
} from "@/lib/services/dividends/reviewedDistributionPolicyRegistry";
import {
  applyInvestmentMetadataToStoredHolding,
  buildInvestmentHoldingMetadata,
  parseInvestmentHoldingMetadata,
} from "@/lib/services/portfolio/investmentHoldingMetadata";
import type { DividendApiQuote } from "@/lib/types/dividends";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

function holding(
  overrides: Partial<StoredPortfolioHolding> & Pick<StoredPortfolioHolding, "symbol" | "name">,
): StoredPortfolioHolding {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    quantity: overrides.quantity ?? 10,
    purchasePrice: overrides.purchasePrice ?? 100,
    currentPrice: overrides.currentPrice ?? 100,
    currency: "EUR",
    assetType: overrides.assetType ?? "investment",
    ...overrides,
  };
}

function quote(
  overrides: Partial<DividendApiQuote> & Pick<DividendApiQuote, "symbol">,
): DividendApiQuote {
  return {
    providerSymbol: `${overrides.symbol}.XETRA`,
    paysDividends: false,
    dividendYield: null,
    forwardAnnualDividendRate: null,
    estimatedAnnualDividendEur: null,
    estimatedNextPaymentEur: null,
    nextExDate: null,
    nextPaymentDate: null,
    frequency: "unknown",
    currency: "EUR",
    updatedAt: "2026-07-25T00:00:00.000Z",
    verifiedCashDistributionEvent: null,
    providerUnavailable: false,
    ...overrides,
  };
}

/** Synthetic test-only ISINs — never added to the production reviewed registry. */
const SYNTHETIC_ACC_ISIN = "IE00TESTACC001";
const SYNTHETIC_DIST_ISIN = "IE00TESTDIST01";

describe("distribution policy classification", () => {
  it("classifies exact verified accumulating fund share class by ISIN", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard FTSE All-World UCITS ETF",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
      }),
    });

    expect(result.policy).toBe("accumulating");
    expect(result.classificationConfidence).toBe("reviewed");
    expect(result.isReviewedOverride).toBe(true);
    expect(result.sourceUrl).toBe(
      "https://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating",
    );
  });

  it("classifies IE00B5BMR087 as accumulating (Acc), never distributing", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "CSPX",
        name: "iShares Core S&P 500 UCITS ETF USD (Acc)",
        isin: "IE00B5BMR087",
        providerSymbol: "CSPX.LSE",
      }),
    });

    expect(result.policy).toBe("accumulating");
    expect(result.policy).not.toBe("distributing");
    expect(result.classificationConfidence).toBe("reviewed");
    expect(result.instrumentIdentity).toBe("isin:IE00B5BMR087");
    expect(result.sourceUrl).toBe(
      "https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund",
    );
  });

  it("keeps different synthetic share classes on different policies without production registry entries", () => {
    const accumulating = classifyDistributionPolicy({
      holding: holding({
        symbol: "SYN-ACC",
        name: "Synthetic Global Acc UCITS ETF",
        isin: SYNTHETIC_ACC_ISIN,
        providerSymbol: "SYNACC.XETRA",
      }),
    });
    const distributing = classifyDistributionPolicy({
      holding: holding({
        symbol: "SYN-DIST",
        name: "Synthetic Global Dist UCITS ETF",
        isin: SYNTHETIC_DIST_ISIN,
        providerSymbol: "SYNDIST.XETRA",
      }),
      dividendQuote: quote({
        symbol: "SYN-DIST",
        providerSymbol: "SYNDIST.XETRA",
        verifiedCashDistributionEvent: {
          date: "2026-06-01",
          amount: 0.42,
          currency: "EUR",
        },
      }),
    });

    expect(accumulating.policy).toBe("unknown");
    expect(distributing.policy).toBe("distributing");
  });

  it("defaults unknown fund to unknown without events", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "UNKNOWN",
        name: "Unknown UCITS ETF",
        isin: "IE00BBBBBBBB",
        providerSymbol: "UNKN.XETRA",
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("does not infer accumulating from absence of dividend events", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "MYFUND",
        name: "Mystery Fund UCITS ETF",
        providerSymbol: "MYFUND.XETRA",
      }),
      dividendQuote: quote({
        symbol: "MYFUND",
        dividendYield: null,
        verifiedCashDistributionEvent: null,
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("does not infer distributing from yield alone", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "MYFUND",
        name: "Mystery Fund UCITS ETF",
        providerSymbol: "MYFUND.XETRA",
      }),
      dividendQuote: quote({
        symbol: "MYFUND",
        dividendYield: 3.2,
        forwardAnnualDividendRate: 1.5,
        verifiedCashDistributionEvent: null,
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("confirms distributing from verified positive cash distribution event", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      dividendQuote: quote({
        symbol: "ASML",
        providerSymbol: "ASML.AS",
        verifiedCashDistributionEvent: {
          date: "2026-05-01",
          amount: 1.52,
          currency: "EUR",
        },
      }),
    });

    expect(result.policy).toBe("distributing");
    expect(result.evidenceType).toBe("cash_distribution_history");
  });

  it("rejects malformed or zero cash events", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "TEST",
        name: "Test Equity",
        providerSymbol: "TEST.US",
      }),
      dividendQuote: quote({
        symbol: "TEST",
        verifiedCashDistributionEvent: {
          date: "2026-05-01",
          amount: 0,
          currency: "USD",
        },
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("does not classify from Acc name marker without exact ISIN", () => {
    expect(detectNameMarkerPolicy("Vanguard All-World Acc ETF")).toBe("accumulating");
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "FAKE",
        name: "Fake Acc ETF",
        providerSymbol: "FAKE.XETRA",
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("does not infer cash distribution from Yield in product name", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        isin: "NL0015001K93",
        providerSymbol: "STRC.AS",
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("classifies individual equity with verified event as distributing", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      dividendQuote: quote({
        symbol: "ASML",
        providerSymbol: "ASML.AS",
        verifiedCashDistributionEvent: {
          date: "2026-04-15",
          amount: 3.4,
          currency: "EUR",
        },
      }),
    });

    expect(result.policy).toBe("distributing");
  });

  it("never classifies individual equity as accumulating", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
    });

    expect(result.policy).not.toBe("accumulating");
  });

  it("classifies spot crypto as not applicable without staking inference", () => {
    const btc = classifyDistributionPolicy({
      holding: holding({
        symbol: "BTC",
        name: "Bitcoin",
        assetType: "crypto",
        providerSymbol: "BTC-USD.CC",
      }),
    });
    const eth = classifyDistributionPolicy({
      holding: holding({
        symbol: "ETH",
        name: "Ethereum",
        assetType: "crypto",
        providerSymbol: "ETH-USD.CC",
      }),
    });
    const sol = classifyDistributionPolicy({
      holding: holding({
        symbol: "SOL",
        name: "Solana",
        assetType: "crypto",
        providerSymbol: "SOL-USD.CC",
      }),
    });

    expect(btc.policy).toBe("not_applicable");
    expect(eth.policy).toBe("not_applicable");
    expect(sol.policy).toBe("not_applicable");
    expect(btc.evidenceSummary).toMatch(/Spot crypto does not pay cash distributions/i);
    expect(btc.evidenceSummary).toMatch(/Staking rewards are not included/i);
    expect(eth.evidenceSummary).not.toMatch(/staking reward estimated/i);
    expect(sol.evidenceSummary).not.toMatch(/staking reward estimated/i);
  });

  it("classifies cash as not applicable", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "EUR",
        name: "Cash",
        assetType: "cash",
      }),
    });

    expect(result.policy).toBe("not_applicable");
  });

  it("does not classify crypto ETP from underlying crypto", () => {
    const ib1t = classifyDistributionPolicy({
      holding: holding({
        symbol: "IB1T",
        name: "iShares Bitcoin ETP",
        providerSymbol: "IB1T.XETRA",
        assetType: "investment",
      }),
    });
    const strc = classifyDistributionPolicy({
      holding: holding({
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        providerSymbol: "STRC.AS",
        assetType: "investment",
      }),
    });

    expect(ib1t.policy).not.toBe("unknown");
    expect(ib1t.evidenceSummary).not.toMatch(/Spot crypto/i);
    expect(strc.policy).toBe("unknown");
    expect(strc.evidenceSummary).not.toMatch(/Spot crypto/i);
  });

  it("classifies unknown asset as unknown", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "ZZZZ",
        name: "Unknown Company",
      }),
    });

    expect(result.policy).toBe("unknown");
  });

  it("keeps ETC/ETN unknown without explicit metadata", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        isin: "NL0015001K93",
        providerSymbol: "STRC.AS",
      }),
    });

    expect(result.policy).toBe("unknown");
  });
});

describe("IE00B5BMR087 reviewed registry regression", () => {
  it("lookup returns accumulating for exact ISIN", () => {
    const entry = lookupReviewedDistributionPolicy({ isin: "IE00B5BMR087" });
    expect(entry?.policy).toBe("accumulating");
    expect(entry?.instrumentName).toContain("(Acc)");
    expect(entry?.instrumentName).not.toContain("Dist");
  });

  it("never classifies IE00B5BMR087 as distributing even with misleading Dist label", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "CSPX",
        name: "iShares Core S&P 500 UCITS ETF USD (Dist)",
        isin: "IE00B5BMR087",
        providerSymbol: "CSPX.LSE",
      }),
    });

    expect(result.policy).toBe("accumulating");
    expect(result.policy).not.toBe("distributing");
  });

  it("classifies SXR8 listing alias as accumulating when ISIN matches", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "SXR8",
        name: "iShares Core S&P 500 UCITS ETF USD (Acc)",
        isin: "IE00B5BMR087",
        providerSymbol: "SXR8.XETRA",
      }),
    });

    expect(result.policy).toBe("accumulating");
    expect(result.instrumentIdentity).toBe("isin:IE00B5BMR087");
  });

  it("does not let CSPX ticker with unrelated ISIN inherit distributing policy", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "CSPX",
        name: "Wrong ISIN CSPX holding",
        isin: "IE00WRONG0001",
        providerSymbol: "CSPX.LSE",
      }),
    });

    expect(result.policy).not.toBe("distributing");
  });
});

describe("distribution policy identity and priority", () => {
  it("keys reviewed lookup by exact ISIN", () => {
    expect(
      lookupReviewedDistributionPolicy({ isin: "IE00BK5BQT80" })?.policy,
    ).toBe("accumulating");
  });

  it("avoids ticker-only reviewed collisions", () => {
    const vwce = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard All-World",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
      }),
    });
    const other = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Different listing",
        isin: "IE00BBBBBBBB",
        providerSymbol: "VWCE.LSE",
      }),
    });

    expect(vwce.policy).toBe("accumulating");
    expect(other.policy).toBe("unknown");
  });

  it("prioritises user confirmation over automatic evidence", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard All-World",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
        distributionPolicyUserOverride: "distributing",
      }),
    });

    expect(result.policy).toBe("distributing");
    expect(result.isUserConfirmed).toBe(true);
    expect(result.conflictDetected).toBe(true);
  });

  it("represents STRC as user-confirmed reinvesting when set by user", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        isin: "NL0015001K93",
        providerSymbol: "STRC.AS",
        distributionPolicyUserOverride: "accumulating",
      }),
    });

    expect(result.policy).toBe("accumulating");
    expect(result.isUserConfirmed).toBe(true);
    expect(result.isReviewedOverride).toBe(false);
    expect(result.sourceUrl).toBeNull();
    expect(result.classificationSource).toBe("User confirmed");
  });

  it("resets to automatic classification when user override is cleared", () => {
    const automatic = classifyDistributionPolicy({
      holding: holding({
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        providerSymbol: "STRC.AS",
        distributionPolicyUserOverride: null,
      }),
    });

    expect(automatic.isUserConfirmed).toBe(false);
    expect(automatic.policy).toBe("unknown");
  });

  it("marks provider unavailable separately from unknown policy", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      dividendQuote: quote({
        symbol: "ASML",
        providerUnavailable: true,
      }),
    });

    expect(result.policy).toBe("unknown");
    expect(result.providerUnavailable).toBe(true);
    expect(result.classificationSource).toContain("unavailable");
  });
});

describe("passive income eligibility boundary", () => {
  it("allows verified distributing classifications from cash events, not registry mislabels", () => {
    const classification = classifyDistributionPolicy({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      dividendQuote: quote({
        symbol: "ASML",
        providerSymbol: "ASML.AS",
        verifiedCashDistributionEvent: {
          date: "2026-05-01",
          amount: 1.52,
          currency: "EUR",
        },
      }),
    });

    expect(isEligibleForPassiveIncomeEstimation(classification)).toBe(true);
  });

  it("blocks accumulating, unknown, not applicable and conflicted policies", () => {
    const accumulating = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard All-World",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
      }),
    });
    const cspxAccumulating = classifyDistributionPolicy({
      holding: holding({
        symbol: "CSPX",
        name: "iShares Core S&P 500 UCITS ETF USD (Acc)",
        isin: "IE00B5BMR087",
        providerSymbol: "CSPX.LSE",
      }),
    });
    const unknown = classifyDistributionPolicy({
      holding: holding({
        symbol: "STRC",
        name: "21Shares Strategy Yield ETP",
        providerSymbol: "STRC.AS",
      }),
    });
    const cash = classifyDistributionPolicy({
      holding: holding({ symbol: "EUR", name: "Cash", assetType: "cash" }),
    });
    const conflicted = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard All-World",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
        distributionPolicyUserOverride: "distributing",
      }),
    });

    expect(isEligibleForPassiveIncomeEstimation(accumulating)).toBe(false);
    expect(isEligibleForPassiveIncomeEstimation(cspxAccumulating)).toBe(false);
    expect(isEligibleForPassiveIncomeEstimation(unknown)).toBe(false);
    expect(isEligibleForPassiveIncomeEstimation(cash)).toBe(false);
    expect(isEligibleForPassiveIncomeEstimation(conflicted)).toBe(false);
    expect(passiveIncomeIneligibilityReason(conflicted)).toMatch(/Conflicting/i);
  });
});

describe("distribution policy persistence", () => {
  it("round-trips user override through investment metadata", () => {
    const parsed = parseInvestmentHoldingMetadata({
      distributionPolicyUserOverride: "accumulating",
    });
    const merged = applyInvestmentMetadataToStoredHolding(
      holding({ symbol: "STRC", name: "STRC", providerSymbol: "STRC.AS" }),
      parsed ?? {},
    );

    expect(merged.distributionPolicyUserOverride).toBe("accumulating");
  });

  it("round-trips non_distributing override through investment metadata", () => {
    const parsed = parseInvestmentHoldingMetadata({
      distributionPolicyUserOverride: "non_distributing",
    });
    const built = buildInvestmentHoldingMetadata(
      holding({
        symbol: "SYN-ND",
        name: "Synthetic Non Dist",
        distributionPolicyUserOverride: "non_distributing",
      }),
    );

    expect(parsed?.distributionPolicyUserOverride).toBe("non_distributing");
    expect(built).toEqual({ distributionPolicyUserOverride: "non_distributing" });
  });

  it("preserves existing distributing and accumulating overrides unchanged", () => {
    expect(
      parseInvestmentHoldingMetadata({
        distributionPolicyUserOverride: "distributing",
      })?.distributionPolicyUserOverride,
    ).toBe("distributing");
    expect(
      parseInvestmentHoldingMetadata({
        distributionPolicyUserOverride: "accumulating",
      })?.distributionPolicyUserOverride,
    ).toBe("accumulating");
  });

  it("clears override metadata when reset to Not sure", () => {
    const cleared = buildInvestmentHoldingMetadata(
      holding({
        symbol: "SYN-ND",
        name: "Synthetic Non Dist",
        distributionPolicyUserOverride: null,
      }),
    );
    const merged = applyInvestmentMetadataToStoredHolding(
      holding({
        symbol: "SYN-ND",
        name: "Synthetic Non Dist",
        distributionPolicyUserOverride: "non_distributing",
      }),
      parseInvestmentHoldingMetadata(cleared) ?? {},
    );

    expect(cleared).toEqual({});
    expect(merged.distributionPolicyUserOverride).toBeUndefined();
  });

  it("keeps portfolios without override fields compatible", () => {
    const merged = applyInvestmentMetadataToStoredHolding(
      holding({ symbol: "VWCE", name: "VWCE" }),
      parseInvestmentHoldingMetadata({}) ?? {},
    );

    expect(merged.distributionPolicyUserOverride).toBeUndefined();
  });

  it("round-trips passive income user estimates through investment metadata", () => {
    const estimate = {
      mode: "annual_yield" as const,
      annualYieldPercent: 4.5,
      updatedAt: "2026-07-26T10:00:00.000Z",
    };
    const built = buildInvestmentHoldingMetadata(
      holding({
        symbol: "CUSTOM",
        name: "Custom Dist",
        distributionPolicyUserOverride: "distributing",
        passiveIncomeUserEstimate: estimate,
      }),
    );
    const parsed = parseInvestmentHoldingMetadata(built);
    const merged = applyInvestmentMetadataToStoredHolding(
      holding({ symbol: "CUSTOM", name: "Custom Dist" }),
      parsed ?? {},
    );

    expect(built.passiveIncomeUserEstimate).toEqual(estimate);
    expect(built.distributionPolicyUserOverride).toBe("distributing");
    expect(merged.passiveIncomeUserEstimate).toEqual(estimate);
    expect(merged.distributionPolicyUserOverride).toBe("distributing");
  });

  it("stores only one estimate mode and supports removal", () => {
    const cashEstimate = {
      mode: "annual_cash_amount" as const,
      annualCashAmountEur: 1200,
      updatedAt: "2026-07-26T10:00:00.000Z",
    };
    const withCash = buildInvestmentHoldingMetadata(
      holding({
        symbol: "CUSTOM",
        name: "Custom Dist",
        passiveIncomeUserEstimate: cashEstimate,
      }),
    );
    expect(withCash.passiveIncomeUserEstimate).toEqual(cashEstimate);
    expect(
      (withCash.passiveIncomeUserEstimate as { annualYieldPercent?: number })
        .annualYieldPercent,
    ).toBeUndefined();

    const removed = applyInvestmentMetadataToStoredHolding(
      holding({
        symbol: "CUSTOM",
        name: "Custom Dist",
        passiveIncomeUserEstimate: cashEstimate,
      }),
      parseInvestmentHoldingMetadata({ passiveIncomeUserEstimate: null }) ?? {
        passiveIncomeUserEstimate: null,
      },
    );
    expect(removed.passiveIncomeUserEstimate).toBeUndefined();
  });

  it("preserves an existing estimate when only policy override metadata is applied", () => {
    const estimate = {
      mode: "annual_cash_amount" as const,
      annualCashAmountEur: 200,
      updatedAt: "2026-07-26T10:00:00.000Z",
    };
    const merged = applyInvestmentMetadataToStoredHolding(
      holding({
        symbol: "CUSTOM",
        name: "Custom Dist",
        passiveIncomeUserEstimate: estimate,
      }),
      parseInvestmentHoldingMetadata({
        distributionPolicyUserOverride: "distributing",
      }) ?? {},
    );

    expect(merged.distributionPolicyUserOverride).toBe("distributing");
    expect(merged.passiveIncomeUserEstimate).toEqual(estimate);
  });
});

describe("non_distributing classification", () => {
  it("applies user-confirmed no current cash distributions without treating it as accumulating", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "SYN-ND",
        name: "Synthetic Growth Share",
        providerSymbol: "SYNND.XETRA",
        distributionPolicyUserOverride: "non_distributing",
      }),
    });

    expect(result.policy).toBe("non_distributing");
    expect(result.policy).not.toBe("accumulating");
    expect(result.policy).not.toBe("unknown");
    expect(result.isUserConfirmed).toBe(true);
    expect(isEligibleForPassiveIncomeEstimation(result)).toBe(false);
    expect(passiveIncomeIneligibilityReason(result)).toMatch(/No current cash distributions/i);
  });

  it("marks conflict when user confirms non_distributing against reviewed accumulating evidence", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "VWCE",
        name: "Vanguard All-World",
        isin: "IE00BK5BQT80",
        providerSymbol: "VWCE.XETRA",
        distributionPolicyUserOverride: "non_distributing",
      }),
    });

    expect(result.policy).toBe("non_distributing");
    expect(result.conflictDetected).toBe(true);
    expect(isEligibleForPassiveIncomeEstimation(result)).toBe(false);
  });

  it("marks conflict when user confirms non_distributing against a verified cash event", () => {
    const result = classifyDistributionPolicy({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
        distributionPolicyUserOverride: "non_distributing",
      }),
      dividendQuote: quote({
        symbol: "ASML",
        providerSymbol: "ASML.AS",
        verifiedCashDistributionEvent: {
          date: "2026-05-01",
          amount: 1.52,
          currency: "EUR",
        },
      }),
    });

    expect(result.policy).toBe("non_distributing");
    expect(result.conflictDetected).toBe(true);
    expect(isEligibleForPassiveIncomeEstimation(result)).toBe(false);
  });

  it("counts non_distributing separately in portfolio summary", () => {
    const snapshot = buildPortfolioDistributionPolicySnapshot(
      [
        holding({
          symbol: "SYN-ND",
          name: "Synthetic Non Dist",
          providerSymbol: "SYNND.XETRA",
          distributionPolicyUserOverride: "non_distributing",
        }),
        holding({
          symbol: "VWCE",
          name: "VWCE",
          isin: "IE00BK5BQT80",
          providerSymbol: "VWCE.XETRA",
        }),
        holding({
          symbol: "BTC",
          name: "Bitcoin",
          assetType: "crypto",
          providerSymbol: "BTC-USD.CC",
        }),
      ],
      [],
    );

    expect(snapshot.summary.nonDistributing).toBe(1);
    expect(snapshot.summary.accumulating).toBe(1);
    expect(snapshot.summary.notApplicable).toBe(1);
  });
});

describe("distribution policy view model", () => {
  it("renders all five primary statuses with text labels", () => {
    expect(policyStatusLabel("distributing")).toBe("Distributing");
    expect(policyStatusLabel("accumulating")).toBe("Accumulating");
    expect(policyStatusLabel("non_distributing")).toBe("No current distributions");
    expect(policyStatusLabel("unknown")).toBe("Unknown");
    expect(policyStatusLabel("not_applicable")).toBe("Not applicable");
  });

  it("builds correct summary counts for reviewed accumulating entries", () => {
    const snapshot = buildPortfolioDistributionPolicySnapshot(
      [
        holding({
          symbol: "VWCE",
          name: "VWCE",
          isin: "IE00BK5BQT80",
          providerSymbol: "VWCE.XETRA",
        }),
        holding({
          symbol: "CSPX",
          name: "CSPX",
          isin: "IE00B5BMR087",
          providerSymbol: "CSPX.LSE",
        }),
        holding({ symbol: "EUR", name: "Cash", assetType: "cash" }),
      ],
      [],
    );

    expect(snapshot.summary.accumulating).toBe(2);
    expect(snapshot.summary.distributing).toBe(0);
    expect(snapshot.summary.totalInvestments).toBe(2);
  });

  it("builds mobile-friendly holding rows without fixed-width assumptions", () => {
    const viewModel = buildDistributionPolicyViewModel({
      holdings: [
        holding({
          symbol: "VWCE",
          name: "Vanguard FTSE All-World UCITS ETF",
          isin: "IE00BK5BQT80",
          providerSymbol: "VWCE.XETRA",
        }),
      ],
      quotes: [],
    });

    expect(viewModel.holdings).toHaveLength(1);
    expect(viewModel.holdings[0]?.classification.policy).toBe("accumulating");
  });
});

describe("reviewed production registry audit", () => {
  it("contains only independently verified real instruments", () => {
    const entries = listReviewedDistributionPolicies();
    expect(entries).toHaveLength(2);
    expect(entries.every((entry) => entry.instrumentName.length > 0)).toBe(true);
    expect(entries.every((entry) => entry.issuer.length > 0)).toBe(true);
    expect(entries.every((entry) => entry.policy === "accumulating")).toBe(true);
    expect(entries.some((entry) => entry.policy === "distributing")).toBe(false);
  });

  it("includes official issuer source URLs for both reviewed entries", () => {
    const entries = listReviewedDistributionPolicies();
    const vanguard = entries.find((entry) => entry.isin === "IE00BK5BQT80");
    const ishares = entries.find((entry) => entry.isin === "IE00B5BMR087");

    expect(vanguard?.sourceUrl).toBe(
      "https://www.vanguard.co.uk/professional/product/etf/equity/9679/ftse-all-world-ucits-etf-usd-accumulating",
    );
    expect(ishares?.sourceUrl).toBe(
      "https://www.ishares.com/uk/individual/en/products/253743/ishares-sp-500-b-ucits-etf-acc-fund",
    );
  });
});

describe("regression guards", () => {
  it("does not change market consensus mapping", () => {
    const card = mapConsensusResultToCard({
      holding: holding({
        symbol: "ASML",
        name: "ASML Holding",
        providerSymbol: "ASML.AS",
      }),
      result: {
        instrumentId: holding({ symbol: "ASML", name: "ASML" }).id,
        coverageType: "equity-analyst",
        availability: "available",
        classification: "positive",
        analystCount: 10,
        buyCount: 7,
        holdCount: 2,
        sellCount: 1,
      },
      isLoading: false,
    });

    expect(card.state).toBe("equity_coverage");
  });
});
