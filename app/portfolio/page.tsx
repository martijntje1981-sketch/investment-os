"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  BarChart3,
  BriefcaseBusiness,
  ChevronRight,
  CircleDollarSign,
  Loader2,
  Pencil,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import BottomNavigation from "@/components/home/BottomNav";
import NumericInput from "@/components/NumericInput";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import {
  ListingCandidatePicker,
  SelectedListingSummary,
} from "@/components/instruments/ListingCandidatePicker";
import {
  HoldingDividendMeta,
} from "@/components/analysis/DividendIntelligenceSection";
import { HoldingAnalystMeta } from "@/components/analysis/AnalystIntelligenceSection";
import { ExchangeFieldEditor } from "@/components/import/ExchangeFieldEditor";
import {
  getHoldingMarketValue,
  buildPortfolioAnalysis,
} from "@/lib/client/portfolioAnalysis";
import { isEstimatedHoldingPrice } from "@/lib/client/holdingDisplayPrice";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import {
  applyManualListingSelection,
  lookupManualHoldingListing,
} from "@/lib/client/manualHoldingMatch";
import {
  countQuotablePriceHoldings,
  normalizeHoldingForSave,
  tryRefreshPortfolioPrices,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { NO_QUOTABLE_HOLDINGS_MESSAGE } from "@/lib/services/prices/types";
import { findDividendQuoteForHolding } from "@/lib/client/portfolioDividends";
import { findAnalystQuoteForHolding } from "@/lib/client/portfolioAnalyst";
import {
  calculateImpliedUpsidePercent,
} from "@/lib/services/analyst/analystCalculations";
import { formatDividendFrequency } from "@/lib/services/dividends";
import { rememberConfirmedHolding } from "@/lib/services/import/mappingMemory";
import { describePricingSource } from "@/lib/services/instruments/listingConfirmation";
import {
  holdingMatchStatusLabel,
  resolveHoldingMatchStatus,
  validateManualHoldingForSave,
} from "@/lib/services/portfolio/holdingValidation";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";

type AssetType = "investment" | "cash";
type Holding = StoredPortfolioHolding;

const emptyDraft: Holding = {
  id: "",
  symbol: "",
  name: "",
  quantity: 0,
  purchasePrice: 0,
  currentPrice: 0,
  currency: "EUR",
  assetType: "investment",
};

function money(value: number, decimals = 0) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function costOf(holding: Holding) {
  return holding.quantity * holding.purchasePrice;
}

export default function PortfolioPage() {
  const {
    userSub,
    holdings,
    portfolioReady,
    recoveryOffer,
    syncState,
    migrationPreview,
    saveHoldings,
    migratePortfolio,
    retrySync,
    useRemotePortfolio,
    keepLocalPortfolio,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();
  const [isMigrating, setIsMigrating] = useState(false);
  const { quotes: dividendQuotes } = usePortfolioDividends(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const { quotes: analystQuotes } = usePortfolioAnalyst(
    holdings,
    userSub,
    holdings.length > 0,
  );
  const [draft, setDraft] = useState<Holding>(emptyDraft);
  const [editorOpen, setEditorOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [message, setMessage] = useState("Portfolio prices use the latest available market data.");
  const [listingCandidates, setListingCandidates] = useState<ResolvedInstrument[]>([]);
  const [listingWarnings, setListingWarnings] = useState<string[]>([]);
  const [listingLookupPending, setListingLookupPending] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const refreshPrices = useCallback(async (options?: { forceRefresh?: boolean }) => {
    if (!userSub) return;
    setIsRefreshing(true);
    try {
      const quotableCount = countQuotablePriceHoldings(holdings, userSub);
      const result = await tryRefreshPortfolioPrices(userSub, holdings, {
        skipIfCacheFresh: !options?.forceRefresh,
        forceRefresh: options?.forceRefresh ?? false,
      });
      if (result.message === NO_QUOTABLE_HOLDINGS_MESSAGE) {
        setMessage(
          quotableCount === 0
            ? "No holdings are eligible for live pricing yet. Add a matched listing or provider symbol, then refresh again."
            : result.message,
        );
        return;
      }
      if (result.updated) {
        saveHoldings(result.holdings);
        const updatedCount = result.holdings.filter(
          (holding, index) =>
            holding.assetType !== "cash" &&
            holding.currentPrice !== holdings[index]?.currentPrice,
        ).length;
        setMessage(
          updatedCount > 0
            ? `${updatedCount} market prices updated via providerSymbol. Cash remains fixed at its entered value.`
            : "Market prices refreshed. Cash remains fixed at its entered value.",
        );
      } else if (result.rateLimited && quotableCount > 0) {
        setMessage(
          "Market data is temporarily rate-limited. Your holdings remain saved and unvalued positions stay excluded from totals.",
        );
      } else {
        setMessage(
          result.message ??
            "Market data unavailable. Stored values remain visible.",
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [holdings, saveHoldings, userSub]);

  const portfolioAnalysis = useMemo(
    () => buildPortfolioAnalysis(holdings),
    [holdings],
  );
  const performance = useMemo(
    () => buildPortfolioPerformance(holdings),
    [holdings],
  );
  const totalValue = portfolioAnalysis.totalValue;
  const totalReturn = performance.totalReturn;
  const totalReturnPercent = performance.totalReturnPercent;
  const cashValue = performance.cashValue;
  const largest = portfolioAnalysis.largestPosition?.holding ?? null;
  const largestWeightPercent =
    portfolioAnalysis.largestPosition?.weightPercent ?? 0;

  if (!portfolioReady) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-950" />
          <p className="mt-4 text-sm font-semibold text-slate-500">Loading portfolio…</p>
        </div>
      </main>
    );
  }

  function resetListingState() {
    setListingCandidates([]);
    setListingWarnings([]);
    setListingLookupPending(false);
    setLookupUnavailable(false);
    setEditorError(null);
  }

  function openAdd(assetType: AssetType) {
    setDraft({
      ...emptyDraft,
      id: crypto.randomUUID(),
      assetType,
      symbol: assetType === "cash" ? "EUR" : "",
      name: assetType === "cash" ? "EUR Cash" : "",
      purchasePrice: assetType === "cash" ? 1 : 0,
      currentPrice: assetType === "cash" ? 1 : 0,
    });
    resetListingState();
    setEditorOpen(true);
  }

  function openEdit(holding: Holding) {
    setDraft({ ...holding });
    resetListingState();
    setEditorOpen(true);
  }

  async function lookupListing() {
    if (draft.assetType === "cash") return;

    setListingLookupPending(true);
    setEditorError(null);
    setListingWarnings([]);
    setLookupUnavailable(false);

    try {
      const result = await lookupManualHoldingListing(draft);
      setDraft(result.holding);
      setListingCandidates(result.candidates);
      setListingWarnings(result.warnings);
      setLookupUnavailable(result.quotaUnavailable);

      if (result.quotaUnavailable || result.candidates.length === 0) {
        setEditorError(null);
      }
    } catch {
      setLookupUnavailable(true);
      setListingWarnings([
        "Instrument lookup is temporarily unavailable. You can continue manually and save your holding.",
      ]);
      setEditorError(null);
    } finally {
      setListingLookupPending(false);
    }
  }

  function selectListing(candidate: ResolvedInstrument) {
    const next = applyManualListingSelection(draft, candidate);
    setDraft(next);
    setEditorError(null);
    setLookupUnavailable(false);
  }

  function submitHolding(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validation = validateManualHoldingForSave(draft);
    if (!validation.ok) {
      setEditorError(validation.message);
      return;
    }

    const cleaned = normalizeHoldingForSave(draft);
    const exists = holdings.some((holding) => holding.id === cleaned.id);
    const next = exists
      ? holdings.map((holding) => (holding.id === cleaned.id ? cleaned : holding))
      : [...holdings, cleaned];

    if (userSub && cleaned.providerSymbol) {
      rememberConfirmedHolding(userSub, cleaned);
    }

    saveHoldings(next);

    if (
      userSub &&
      cleaned.assetType !== "cash" &&
      cleaned.providerSymbol &&
      cleaned.currentPrice <= 0
    ) {
      void tryRefreshPortfolioPrices(userSub, next, {
        onlyProviderSymbols: [cleaned.providerSymbol],
        skipIfCacheFresh: true,
      }).then((result) => {
        if (result.updated) {
          saveHoldings(result.holdings);
        }
      });
    }

    if (cleaned.assetType !== "cash" && isEstimatedHoldingPrice(cleaned)) {
      setMessage(
        "Holding saved with an estimated price until live market data is available.",
      );
    } else if (cleaned.assetType !== "cash" && cleaned.currentPrice <= 0) {
      setMessage(
        "Holding saved. Current price is temporarily unavailable and will be refreshed later.",
      );
    }
    setEditorOpen(false);
  }

  function removeHolding(holding: Holding) {
    if (!window.confirm(`Remove ${holding.name} from your portfolio?`)) return;
    saveHoldings(holdings.filter((item) => item.id !== holding.id));
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-slate-50 px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-12">
        <div className="mx-auto w-full max-w-6xl">
          <header className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">Portfolio</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">Your investments</h1>
              <p className="mt-4 max-w-2xl leading-7 text-slate-600">Manage investments and cash from one clear overview.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => void refreshPrices()} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh prices
              </button>
              <button onClick={() => void refreshPrices({ forceRefresh: true })} disabled={isRefreshing} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 disabled:opacity-50">
                Hard refresh
              </button>
              <button onClick={() => openAdd("cash")} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold">
                <Banknote className="h-4 w-4" /> Add cash
              </button>
              <button onClick={() => openAdd("investment")} className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white">
                <Plus className="h-4 w-4" /> Add investment
              </button>
            </div>
          </header>

          <PortfolioSyncBanner
            syncState={syncState}
            migrationPreview={migrationPreview}
            migrating={isMigrating}
            onMigrate={async () => {
              setIsMigrating(true);
              try {
                await migratePortfolio();
              } finally {
                setIsMigrating(false);
              }
            }}
            onRetry={() => void retrySync()}
            onUseRemote={useRemotePortfolio}
            onKeepLocal={keepLocalPortfolio}
          />

          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={() => {
              if (recoverPortfolio()) {
                setMessage("Portfolio recovered from this browser.");
              }
            }}
            onDismiss={dismissRecovery}
          />

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">{message}</div>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<CircleDollarSign className="h-5 w-5" />} label="Total value" value={money(totalValue)} />
            <Metric icon={<BarChart3 className="h-5 w-5" />} label="Since purchase" value={performance.canShowPerformance ? `${totalReturn >= 0 ? "+" : ""}${money(totalReturn)}` : "Unavailable"} detail={performance.canShowPerformance ? percent(totalReturnPercent) : "Price data required"} tone={performance.canShowPerformance ? (totalReturn >= 0 ? "positive" : "negative") : "neutral"} />
            <Metric icon={<Banknote className="h-5 w-5" />} label="Cash" value={money(cashValue)} detail={totalValue > 0 ? `${(cashValue / totalValue * 100).toFixed(1)}% of portfolio` : "0.0% of portfolio"} />
            <Metric icon={<PieChart className="h-5 w-5" />} label="Largest position" value={largest?.symbol ?? "—"} detail={largest && totalValue > 0 ? `${largestWeightPercent.toFixed(1)}% of portfolio` : holdings.length > 0 ? "Awaiting price data" : "No holdings"} />
          </section>

          <section className="mt-7 overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <h2 className="text-xl font-black">Holdings</h2>
                <p className="mt-1 text-sm text-slate-500">{holdings.length} positions</p>
              </div>
              <Link href="/upload" className="inline-flex items-center gap-2 text-sm font-bold text-blue-700"><Upload className="h-4 w-4" /> Import</Link>
            </div>

            {holdings.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <BriefcaseBusiness className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 text-xl font-black">No holdings yet</h3>
                <p className="mt-2 text-sm text-slate-500">Add an investment, cash position or import your portfolio.</p>
                <button onClick={() => openAdd("investment")} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white">Add first holding</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {holdings.map((holding) => {
                  const holdingValue = getHoldingMarketValue(holding);
                  const estimatedPrice = isEstimatedHoldingPrice(holding);
                  const matchStatus = resolveHoldingMatchStatus(holding);
                  const holdingReturn =
                    holdingValue === null
                      ? null
                      : holdingValue - costOf(holding);
                  const allocation =
                    totalValue > 0 && holdingValue !== null
                      ? (holdingValue / totalValue) * 100
                      : 0;
                  const dividendQuote =
                    holding.assetType === "investment"
                      ? findDividendQuoteForHolding(holding, dividendQuotes)
                      : null;
                  const analystQuote =
                    holding.assetType === "investment"
                      ? findAnalystQuoteForHolding(holding, analystQuotes)
                      : null;
                  const impliedUpsidePercent =
                    analystQuote && holding.currentPrice > 0
                      ? calculateImpliedUpsidePercent(
                          holding.currentPrice,
                          analystQuote.averagePriceTarget,
                        )
                      : null;
                  return (
                    <article key={holding.id} className="space-y-3 px-5 py-5 lg:px-7">
                    <div className="grid gap-4 lg:grid-cols-[0.65fr_1.5fr_1fr_0.8fr_1fr_auto] lg:items-center">
                      <div><span className={`inline-flex rounded-xl px-3 py-2 text-sm font-black ${holding.assetType === "cash" ? "bg-emerald-100 text-emerald-800" : "bg-slate-950 text-white"}`}>{holding.symbol}</span></div>
                      <div>
                        <p className="font-black">{holding.name}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {holding.assetType === "cash"
                            ? "Cash holding"
                            : `${holding.quantity.toLocaleString("en-GB")} units · ${holdingMatchStatusLabel(matchStatus)}`}
                        </p>
                        {holding.pricingExchange && holding.providerSymbol ? (
                          <p className="mt-1 text-xs font-semibold text-slate-600">
                            {describePricingSource({
                              exchange: holding.exchange ?? null,
                              pricingExchange: holding.pricingExchange,
                              providerSymbol: holding.providerSymbol,
                            })}
                          </p>
                        ) : null}
                      </div>
                      <div><p className="text-xs font-bold uppercase text-slate-400 lg:hidden">Value</p><p className="font-black">{holdingValue === null ? "Price pending" : money(holdingValue)}{estimatedPrice && holdingValue !== null ? <span className="ml-1 text-xs font-semibold text-amber-700">est.</span> : null}</p></div>
                      <div><p className="text-xs font-bold uppercase text-slate-400 lg:hidden">Allocation</p><p className="font-bold">{holdingValue === null ? "—" : `${allocation.toFixed(1)}%`}</p></div>
                      <div>
                        <p className="text-xs font-bold uppercase text-slate-400 lg:hidden">Return</p>
                        <p className={`font-bold ${holdingReturn === null ? "text-slate-500" : holdingReturn >= 0 ? "text-emerald-700" : "text-red-700"}`}>{holding.assetType === "cash" ? "Stable" : holdingReturn === null ? "Price pending" : `${holdingReturn >= 0 ? "+" : ""}${money(holdingReturn)}`}</p>
                      </div>
                      <div className="flex items-center justify-end gap-1">
                        {holding.assetType === "investment" && <Link href={`/holding/${holding.symbol}`} aria-label={`View ${holding.name}`} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><ChevronRight className="h-5 w-5" /></Link>}
                        <button onClick={() => openEdit(holding)} aria-label={`Edit ${holding.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => removeHolding(holding)} aria-label={`Remove ${holding.name}`} className="rounded-lg p-2 text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    </div>
                      {dividendQuote?.paysDividends ? (
                          <HoldingDividendMeta
                            yieldPercent={dividendQuote.dividendYield}
                            annualIncomeEur={dividendQuote.estimatedAnnualDividendEur}
                            nextPaymentEur={dividendQuote.estimatedNextPaymentEur}
                            nextExDate={dividendQuote.nextExDate}
                            nextPaymentDate={dividendQuote.nextPaymentDate}
                            frequency={formatDividendFrequency(dividendQuote.frequency)}
                          />
                      ) : null}
                      {analystQuote ? (
                        <HoldingAnalystMeta
                          quote={analystQuote}
                          currentPriceEur={
                            holding.currentPrice > 0 ? holding.currentPrice : null
                          }
                          impliedUpsidePercent={impliedUpsidePercent}
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="mt-7 rounded-[28px] bg-slate-950 p-6 text-white sm:p-8">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-violet-500/20 p-3 text-violet-300"><Sparkles className="h-5 w-5" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Portfolio insight</p>
                <p className="mt-3 max-w-3xl leading-7 text-slate-200">
                  {largest && totalValue > 0 ? `${largest.symbol} is your largest position at ${largestWeightPercent.toFixed(1)}%. ` : performance.hasUnvaluedInvestments ? "Some holdings are excluded until market prices are available. " : ""}
                  {cashValue > 0 && totalValue > 0 ? `Cash represents ${(cashValue / totalValue * 100).toFixed(1)}% of total portfolio value.` : "No cash holding is currently recorded."}
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
      <BottomNavigation />

      {editorOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <form onSubmit={submitHolding} className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]">
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.14em] text-blue-700">{draft.assetType === "cash" ? "Cash" : "Investment"}</p><h2 className="mt-2 text-2xl font-black">{holdings.some((item) => item.id === draft.id) ? "Edit holding" : "Add holding"}</h2></div>
              <button type="button" onClick={() => setEditorOpen(false)} className="rounded-xl p-2 hover:bg-slate-100"><X className="h-5 w-5" /></button>
            </div>

            {draft.assetType === "cash" ? (
              <div className="mt-7 space-y-5">
                <Field label="Cash name" value={draft.name} onChange={(value) => setDraft({ ...draft, name: value })} />
                <Field label="Amount" type="number" prefix="€" min="0" step="0.01" value={draft.quantity} onChange={(value) => setDraft({ ...draft, quantity: Number(value) })} />
              </div>
            ) : (
              <div className="mt-7 space-y-5">
                <Field
                  label="Ticker, ISIN, or provider symbol"
                  required={false}
                  value={draft.symbol}
                  onChange={(value) => {
                    setDraft({ ...draft, symbol: value, providerSymbol: null });
                  }}
                />
                <Field
                  label="ISIN (optional)"
                  required={false}
                  value={draft.isin ?? ""}
                  onChange={(value) => {
                    setDraft({ ...draft, isin: value || null, providerSymbol: null });
                  }}
                />
                <Field
                  label="Instrument name (optional)"
                  required={false}
                  value={draft.name}
                  onChange={(value) => {
                    setDraft({ ...draft, name: value, providerSymbol: null });
                  }}
                />
                <ExchangeFieldEditor
                  exchange={draft.exchange}
                  providerSymbol={draft.providerSymbol}
                  allowFreeText
                  onCommit={(exchangeCode) => {
                    setDraft({
                      ...draft,
                      exchange: exchangeCode,
                      providerSymbol: null,
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={() => void lookupListing()}
                  disabled={listingLookupPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold disabled:opacity-50"
                >
                  {listingLookupPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Find listing
                </button>

                {listingWarnings.length > 0 ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    {listingWarnings.map((warning) => (
                      <p key={warning}>{warning}</p>
                    ))}
                    {lookupUnavailable ? (
                      <p className="mt-2 font-semibold">
                        Your entries are kept. You can save without finding a listing.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {listingCandidates.length > 0 ? (
                  <ListingCandidatePicker
                    source={{
                      providerSymbol: draft.providerSymbol,
                      instrumentName: draft.instrumentName ?? draft.name,
                      exchange: draft.exchange,
                      isin: draft.isin,
                      matchMethod: draft.matchMethod as ResolvedInstrument["matchMethod"] | undefined,
                      matchConfidence: draft.matchConfidence,
                      candidates: listingCandidates,
                    }}
                    selectedProviderSymbol={draft.providerSymbol}
                    onSelect={selectListing}
                  />
                ) : null}

                {draft.providerSymbol ? (
                  <SelectedListingSummary
                    listing={{
                      providerSymbol: draft.providerSymbol,
                      instrumentName: draft.instrumentName ?? draft.name,
                      exchange: draft.exchange ?? null,
                      isin: draft.isin ?? null,
                      pricingExchange: draft.pricingExchange ?? null,
                      matchMethod:
                        (draft.matchMethod as ResolvedInstrument["matchMethod"]) ??
                        "ticker_exchange",
                      confidence: draft.matchConfidence ?? 1,
                      requiresConfirmation: false,
                      warnings: [],
                    }}
                  />
                ) : null}

                <Field label="Quantity" type="number" min="0" step="any" value={draft.quantity} onChange={(value) => setDraft({ ...draft, quantity: Number(value) })} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Average purchase price" type="number" prefix="€" min="0" step="any" required={false} value={draft.purchasePrice} onChange={(value) => setDraft({ ...draft, purchasePrice: Number(value) })} />
                  <Field label="Current price" type="number" prefix="€" min="0" step="any" required={false} value={draft.currentPrice} onChange={(value) => setDraft({ ...draft, currentPrice: Number(value) })} />
                </div>

                {editorError ? (
                  <p className="text-sm font-semibold text-red-700">{editorError}</p>
                ) : null}
              </div>
            )}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
            <button
              type="submit"
              className="w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-bold text-white"
            >
              Save holding
            </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Metric({ icon, label, value, detail, tone = "neutral" }: { icon: React.ReactNode; label: string; value: string; detail?: string; tone?: "neutral" | "positive" | "negative" }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">{icon}</div><p className="mt-4 text-xs font-black uppercase tracking-[0.12em] text-slate-400">{label}</p><p className={`mt-2 text-2xl font-black ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-950"}`}>{value}</p>{detail && <p className="mt-1 text-sm text-slate-500">{detail}</p>}</article>;
}

function Field({ label, value, onChange, type = "text", prefix, min, step, required = type === "number" }: { label: string; value: string | number; onChange: (value: string) => void; type?: string; prefix?: string; min?: string; step?: string; required?: boolean }) {
  if (type === "number") {
    return (
      <label className="block">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
          {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
          <NumericInput
            required={required}
            value={Number(value)}
            min={min ? Number(min) : undefined}
            placeholder={step === "0.01" ? "0.00" : "0"}
            onChange={(next) => onChange(String(next))}
            className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none"
          />
        </span>
      </label>
    );
  }

  return <label className="block"><span className="text-sm font-bold text-slate-700">{label}</span><span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">{prefix && <span className="font-bold text-slate-400">{prefix}</span>}<input required={required} type={type} min={min} step={step} value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none" /></span></label>;
}