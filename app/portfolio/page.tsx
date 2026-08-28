"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";
import { PortfolioFundingSection } from "@/components/contributions/PortfolioFundingSection";
import { formatListingLookupGuidance } from "@/lib/client/listingLookupGuidance";
import { needsManualPricingSelection } from "@/lib/client/holdingVenuePresentation";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import {
  firstIntelligenceDashboardHref,
  markFirstIntelligencePending,
} from "@/lib/client/firstIntelligence";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { buildPortfolioExposureAllocation } from "@/lib/services/classification";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
import { formatPortfolioMixCue } from "@/lib/client/portfolioMixCue";
import { buildPortfolioTimeline } from "@/lib/services/portfolio/timeline";
import { PortfolioIntro } from "@/components/portfolio/glance/PortfolioIntro";
import { PortfolioGlance } from "@/components/portfolio/glance/PortfolioGlance";
import { PortfolioHoldingsList } from "@/components/portfolio/glance/PortfolioHoldingsList";
import { PortfolioActivity } from "@/components/portfolio/glance/PortfolioActivity";
import { PortfolioExploreNav } from "@/components/portfolio/glance/PortfolioExploreNav";
import { ConfirmedListingIdentity } from "@/components/instruments/ConfirmedListingIdentity";
import {
  MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS,
  resolveAutoListingDecision,
  shouldTriggerManualListingAutoLookup,
} from "@/lib/client/manualHoldingAutoLookup";
import { appDarkCardClass, appSectionLabelClass, appSectionTitleClass } from "@/components/layout/appSurface";
import {
  convertHoldingBaseDraftToEur,
  convertHoldingEurToBaseDraft,
  FX_UNAVAILABLE_EDIT_MESSAGE,
  FX_UNAVAILABLE_SAVE_MESSAGE,
  canPersistBaseCurrencyAmounts,
} from "@/lib/client/baseCurrencyInput";
import type { BaseCurrencyFxSnapshot } from "@/lib/services/prices/baseCurrencyFxSnapshot";
import { IDENTITY_EUR_FX_SNAPSHOT } from "@/lib/services/prices/baseCurrencyFxSnapshot";
import { portfolioBaseCurrencySymbol } from "@/lib/types/portfolioBaseCurrency";
import NumericInput from "@/components/NumericInput";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import CryptoRefreshTechnicalDetails from "@/components/portfolio/CryptoRefreshTechnicalDetails";
import { ListingCandidatePicker } from "@/components/instruments/ListingCandidatePicker";
import { ExchangeFieldEditor } from "@/components/import/ExchangeFieldEditor";
import { HoldingIdentifierLabel } from "@/components/import/HoldingIdentifierHelp";
import { AddCryptoHoldingForm } from "@/components/portfolio/AddCryptoHoldingForm";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import { isEstimatedHoldingPrice } from "@/lib/client/holdingDisplayPrice";
import {
  resolveCryptoDraftSearchQuery,
  searchCryptoCatalogForPair,
} from "@/lib/client/cryptoCatalogSearch";
import { buildPortfolioPerformance } from "@/lib/client/portfolioPerformance";
import {
  applyManualListingSelection,
  lookupManualHoldingListing,
} from "@/lib/client/manualHoldingMatch";
import { useLivePortfolioPriceRefresh } from "@/lib/client/useLivePortfolioPriceRefresh";
import {
  normalizeHoldingForSave,
  type StoredPortfolioHolding,
} from "@/lib/client/portfolioPricing";
import { rememberConfirmedHolding } from "@/lib/services/import/mappingMemory";
import { validateManualHoldingForSave } from "@/lib/services/portfolio/holdingValidation";
import {
  createEmptyCryptoDraft,
  isCryptoHolding,
  mergeHoldingOnSave,
} from "@/lib/services/portfolio/cryptoHolding";
import { applyCryptoSearchResultToHolding } from "@/lib/services/portfolio/cryptoCatalog";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { useActivePortfolioOptional } from "@/lib/client/useActivePortfolio";
import { resolvePortfolioDisplayFreshness } from "@/lib/client/portfolioDisplayFreshness";

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

export default function PortfolioPage() {
  const router = useRouter();
  const {
    formatEur,
    snapshot,
    baseCurrency,
    canPersistMonetary,
    refreshFx,
    convertEur,
  } = useBaseCurrencyDisplay();
  const editorSessionRef = useRef<BaseCurrencyFxSnapshot | null>(null);
  const [editorCurrencyLocked, setEditorCurrencyLocked] =
    useState(baseCurrency);
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
  const activePortfolioName =
    useActivePortfolioOptional()?.activePortfolio?.name ?? null;
  const addParamHandledRef = useRef(false);
  const [isMigrating, setIsMigrating] = useState(false);
  const {
    refreshPrices,
    isRefreshing,
    status: refreshStatus,
    message,
    setMessage,
    liveRefreshAt,
    displayFreshnessAt,
    refreshDiagnostics,
    showRefreshDiagnostics,
    disabled: refreshDisabled,
  } = useLivePortfolioPriceRefresh({
    userSub,
    holdings,
    saveHoldings,
    ready: portfolioReady,
  });

  const heroFreshness = useMemo(
    () =>
      resolvePortfolioDisplayFreshness({
        displayFreshnessAt,
        legacyLiveRefreshAt: liveRefreshAt,
      }),
    [displayFreshnessAt, liveRefreshAt],
  );
  const [draft, setDraft] = useState<Holding>(emptyDraft);
  const [cryptoDraft, setCryptoDraft] = useState<Holding>(
    createEmptyCryptoDraft(),
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [cryptoEditorOpen, setCryptoEditorOpen] = useState(false);
  const [isSavingCrypto, setIsSavingCrypto] = useState(false);
  const [listingCandidates, setListingCandidates] = useState<
    ResolvedInstrument[]
  >([]);
  const [listingWarnings, setListingWarnings] = useState<string[]>([]);
  const [listingLookupPending, setListingLookupPending] = useState(false);
  const [lookupUnavailable, setLookupUnavailable] = useState(false);
  const [editorError, setEditorError] = useState<string | null>(null);

  const portfolioAnalysis = useMemo(
    () => buildPortfolioAnalysis(holdings),
    [holdings],
  );
  const performance = useMemo(
    () => buildPortfolioPerformance(holdings),
    [holdings],
  );
  const totalValue = portfolioAnalysis.totalValue;
  const contributionHoldings = useMemo(
    () =>
      holdings.map((holding) => ({
        id: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
      })),
    [holdings],
  );
  const { entries: contributionEntries, summary: contributionSummary } =
    usePortfolioContributions(
    totalValue,
    performance.totalValueAvailable,
    holdings.length > 0,
    contributionHoldings,
  );
  const totalReturn = performance.totalReturn;
  const totalReturnPercent = performance.totalReturnPercent;
  const cashValue = performance.cashValue;
  const listingLookupMessages = useMemo(
    () =>
      formatListingLookupGuidance(listingWarnings, {
        hasResolvedProviderSymbol: Boolean(draft.providerSymbol?.trim()),
      }),
    [draft.providerSymbol, listingWarnings],
  );
  const showPricingListingPicker = needsManualPricingSelection({
    providerSymbol: draft.providerSymbol,
    candidates: listingCandidates,
  });
  const mixCue = useMemo(() => {
    if (!performance.totalValueAvailable || holdings.length === 0) return null;
    return formatPortfolioMixCue(buildPortfolioExposureAllocation(holdings));
  }, [holdings, performance.totalValueAvailable]);
  const activityEvents = useMemo(
    () =>
      buildPortfolioTimeline({
        entries: contributionEntries,
        contributionSummary,
        currentPortfolioValue: performance.totalValueAvailable
          ? totalValue
          : null,
        portfolioValueAvailable: performance.totalValueAvailable,
      }).events,
    [
      contributionEntries,
      contributionSummary,
      performance.totalValueAvailable,
      totalValue,
    ],
  );

  useEffect(() => {
    if (!portfolioReady || addParamHandledRef.current) return;
    const add = new URLSearchParams(window.location.search).get("add");
    if (add !== "investment" && add !== "cash" && add !== "crypto") return;
    addParamHandledRef.current = true;

    if (add === "crypto") {
      setCryptoDraft(createEmptyCryptoDraft());
      setCryptoEditorOpen(true);
      return;
    }

    const assetType: AssetType = add === "cash" ? "cash" : "investment";
    const sessionSnapshot = canPersistBaseCurrencyAmounts(snapshot)
      ? snapshot
      : IDENTITY_EUR_FX_SNAPSHOT;
    editorSessionRef.current = sessionSnapshot;
    setEditorCurrencyLocked(sessionSnapshot.baseCurrency);
    setDraft({
      ...emptyDraft,
      id: crypto.randomUUID(),
      assetType,
      symbol: assetType === "cash" ? "EUR" : "",
      name: assetType === "cash" ? "EUR Cash" : "",
      purchasePrice: assetType === "cash" ? 1 : 0,
      currentPrice: assetType === "cash" ? 1 : 0,
    });
    setListingCandidates([]);
    setListingWarnings([]);
    setListingLookupPending(false);
    setLookupUnavailable(false);
    if (!canPersistBaseCurrencyAmounts(snapshot) && baseCurrency !== "EUR") {
      setEditorError(FX_UNAVAILABLE_EDIT_MESSAGE);
    } else {
      setEditorError(null);
    }
    setEditorOpen(true);
  }, [baseCurrency, portfolioReady, snapshot]);

  useEffect(() => {
    if (!portfolioReady || !editorOpen || draft.assetType === "cash") return;
    if (
      !shouldTriggerManualListingAutoLookup({
        assetType: draft.assetType,
        symbol: draft.symbol,
        name: draft.name,
        isin: draft.isin,
        providerSymbol: draft.providerSymbol,
      })
    ) {
      return;
    }

    const controller = new AbortController();
    const draftSnapshot = draft;
    const timer = window.setTimeout(() => {
      void (async () => {
        setListingLookupPending(true);
        setEditorError(null);
        try {
          const result = await lookupManualHoldingListing(draftSnapshot, {
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          const decision = resolveAutoListingDecision(
            result,
            draftSnapshot.isin,
          );
          if (decision.kind === "preselect") {
            setDraft(decision.holding);
          }
          setListingCandidates(decision.candidates);
          setListingWarnings(decision.warnings);
          setLookupUnavailable(result.quotaUnavailable);
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            return;
          }
          if (controller.signal.aborted) return;
          setLookupUnavailable(true);
          setListingWarnings([
            "Instrument lookup is temporarily unavailable. You can continue manually and save your holding.",
          ]);
        } finally {
          if (!controller.signal.aborted) {
            setListingLookupPending(false);
          }
        }
      })();
    }, MANUAL_HOLDING_AUTO_LOOKUP_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
    // Identity fields only — quantity/price edits must not retrigger listing search.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    portfolioReady,
    editorOpen,
    draft.assetType,
    draft.symbol,
    draft.name,
    draft.isin,
    draft.exchange,
    draft.providerSymbol,
  ]);

  if (!portfolioReady) {
    return <AppPageLoading canvas="portfolio" />;
  }

  function resetListingState() {
    setListingCandidates([]);
    setListingWarnings([]);
    setListingLookupPending(false);
    setLookupUnavailable(false);
    setEditorError(null);
  }

  function beginEditorSession(
    sessionSnapshot: BaseCurrencyFxSnapshot = snapshot,
  ) {
    editorSessionRef.current = sessionSnapshot;
    setEditorCurrencyLocked(sessionSnapshot.baseCurrency);
  }

  function openAdd(assetType: AssetType) {
    const sessionSnapshot = canPersistBaseCurrencyAmounts(snapshot)
      ? snapshot
      : IDENTITY_EUR_FX_SNAPSHOT;
    beginEditorSession(sessionSnapshot);
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
    if (!canPersistBaseCurrencyAmounts(snapshot) && baseCurrency !== "EUR") {
      setEditorError(FX_UNAVAILABLE_EDIT_MESSAGE);
    } else {
      setEditorError(null);
    }
    setEditorOpen(true);
  }

  function openAddCrypto() {
    setCryptoDraft(createEmptyCryptoDraft());
    setCryptoEditorOpen(true);
  }

  function openEdit(holding: Holding) {
    if (isCryptoHolding(holding)) {
      setCryptoDraft({ ...holding });
      setCryptoEditorOpen(true);
      return;
    }

    const converted = convertHoldingEurToBaseDraft(holding, snapshot);
    if (!converted.ok) {
      // Never place $ / £ beside unconverted EUR amounts.
      beginEditorSession(IDENTITY_EUR_FX_SNAPSHOT);
      setDraft({ ...holding });
      resetListingState();
      setEditorError(FX_UNAVAILABLE_EDIT_MESSAGE);
      setEditorOpen(true);
      return;
    }

    beginEditorSession(snapshot);
    setDraft(converted.value);
    resetListingState();
    setEditorError(null);
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
      const decision = resolveAutoListingDecision(result, draft.isin);
      setDraft(decision.holding);
      setListingCandidates(decision.candidates);
      setListingWarnings(decision.warnings);
      setLookupUnavailable(result.quotaUnavailable);

      if (result.quotaUnavailable || decision.candidates.length === 0) {
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

    const sessionSnapshot = editorSessionRef.current ?? snapshot;
    if (!canPersistBaseCurrencyAmounts(sessionSnapshot)) {
      setEditorError(FX_UNAVAILABLE_SAVE_MESSAGE);
      return;
    }

    if (
      editorCurrencyLocked !== "EUR" &&
      baseCurrency !== editorCurrencyLocked
    ) {
      setEditorError(
        "Your portfolio base currency changed while this form was open. Close and reopen the holding to continue.",
      );
      return;
    }

    const converted = convertHoldingBaseDraftToEur(draft, sessionSnapshot);
    if (!converted.ok) {
      setEditorError(converted.message);
      return;
    }

    const validation = validateManualHoldingForSave(converted.value);
    if (!validation.ok) {
      setEditorError(validation.message);
      return;
    }

    const cleaned = normalizeHoldingForSave(converted.value);
    const exists = holdings.some((holding) => holding.id === cleaned.id);
    const next = exists
      ? holdings.map((holding) =>
          holding.id === cleaned.id ? cleaned : holding,
        )
      : [...holdings, cleaned];

    if (userSub && cleaned.providerSymbol) {
      rememberConfirmedHolding(userSub, cleaned);
    }

    saveHoldings(next);

    const isFirstSetup = holdings.length === 0 && next.length > 0;
    if (isFirstSetup) {
      markFirstIntelligencePending(userSub);
      setEditorOpen(false);
      router.push(firstIntelligenceDashboardHref());
      return;
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

  async function resolveCryptoDraftForSave(
    nextDraft: Holding,
  ): Promise<Holding> {
    const query = resolveCryptoDraftSearchQuery(nextDraft);
    if (!query.trim()) {
      return nextDraft;
    }

    try {
      const response = await searchCryptoCatalogForPair({
        query,
        pairCurrency: nextDraft.pairCurrency ?? "EUR",
      });
      if (!response.success || response.results.length === 0) {
        return nextDraft;
      }

      const normalizedSymbol = nextDraft.symbol.trim().toUpperCase();
      const normalizedName = nextDraft.name.trim().toUpperCase();
      const normalizedProviderSymbol =
        nextDraft.providerSymbol?.trim().toUpperCase() ?? "";
      const normalizedTradingPair =
        nextDraft.tradingPair?.trim().toUpperCase() ?? "";

      const exactMatch =
        response.results.find(
          (result) =>
            (normalizedProviderSymbol &&
              result.providerSymbol === normalizedProviderSymbol) ||
            (normalizedTradingPair &&
              result.requestedDisplayPair === normalizedTradingPair) ||
            (normalizedSymbol && result.baseAsset === normalizedSymbol) ||
            (normalizedName &&
              (result.name?.trim().toUpperCase() ?? "") === normalizedName),
        ) ??
        response.results.find((result) => result.score >= 900) ??
        null;

      return exactMatch
        ? applyCryptoSearchResultToHolding(nextDraft, exactMatch)
        : nextDraft;
    } catch {
      return nextDraft;
    }
  }

  async function submitCryptoHolding(nextDraft: Holding) {
    if (isSavingCrypto) return;

    const validation = validateManualHoldingForSave(nextDraft);
    if (!validation.ok) {
      throw new Error(validation.message);
    }

    setIsSavingCrypto(true);
    try {
      const resolvedDraft = await resolveCryptoDraftForSave(nextDraft);
      const cleaned = normalizeHoldingForSave(resolvedDraft);
      saveHoldings(mergeHoldingOnSave(holdings, cleaned));
      const isFirstSetup = holdings.length === 0;
      if (isFirstSetup) {
        markFirstIntelligencePending(userSub);
        setCryptoEditorOpen(false);
        router.push(firstIntelligenceDashboardHref());
        return;
      }
      setMessage(
        cleaned.pricingStatus === "needs_review"
          ? "Crypto holding saved. Live pricing is not available for this pair yet."
          : "Crypto holding saved. Live pricing will refresh from EODHD.",
      );
      setCryptoEditorOpen(false);
    } finally {
      setIsSavingCrypto(false);
    }
  }

  function removeHolding(holding: Holding) {
    if (!window.confirm(`Remove ${holding.name} from your portfolio?`)) return;
    saveHoldings((current) =>
      current.filter((item) => item.id !== holding.id),
    );
  }

  return (
    <>
      <PageContainer canvas="portfolio">
        <PortfolioIntro
          freshnessLabel={heroFreshness.label}
          onRefreshPrices={() => void refreshPrices()}
          isRefreshing={isRefreshing}
          refreshDisabled={refreshDisabled}
          refreshStatus={refreshStatus}
        />

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

        {message ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white/80">
            <p>{message}</p>
            {showRefreshDiagnostics && refreshDiagnostics ? (
              <CryptoRefreshTechnicalDetails diagnostics={refreshDiagnostics} />
            ) : null}
          </div>
        ) : null}

        <PortfolioGlance
          valueLabel={formatEur(totalValue)}
          valueAvailable={performance.totalValueAvailable}
          coverageMessage={performance.totalValueCoverageMessage}
          resultLabel={`${totalReturn >= 0 ? "+" : ""}${formatEur(totalReturn)}`}
          resultAvailable={performance.canShowPerformance}
          resultTone={
            performance.canShowPerformance
              ? totalReturn >= 0
                ? "positive"
                : "negative"
              : "neutral"
          }
          resultDetail={
            performance.canShowPerformance
              ? `${totalReturnPercent >= 0 ? "+" : ""}${totalReturnPercent.toFixed(1)}%`
              : "Price data required"
          }
          cashLabel={
            cashValue > 0
              ? `${formatEur(cashValue)}${
                  performance.totalValueAvailable && totalValue > 0
                    ? ` · ${((cashValue / totalValue) * 100).toFixed(1)}%`
                    : ""
                }`
              : null
          }
          mixCue={mixCue}
        />

        <PortfolioHoldingsList
          holdings={holdings}
          totalValue={totalValue}
          formatEur={formatEur}
          onAddInvestment={() => openAdd("investment")}
          onAddCrypto={openAddCrypto}
          onAddCash={() => openAdd("cash")}
          onEdit={openEdit}
          onRemove={removeHolding}
        />

        <PortfolioActivity events={activityEvents} formatEur={formatEur} />

        <PortfolioExploreNav
          tools={
            <ExportPortfolioButton
              variant="onDark"
              label="Export"
              onExport={() =>
                runPortfolioExport({
                  holdings,
                  entries: contributionEntries,
                  portfolioValueEur: totalValue,
                  portfolioValueAvailable: performance.totalValueAvailable,
                  baseCurrency,
                  convertEur,
                  portfolioName: activePortfolioName,
                })
              }
            />
          }
        />

        <section
          id="money-in-out"
          className={`${appDarkCardClass} p-3.5 sm:p-4`}
        >
          <div className="rounded-xl bg-white p-4 text-slate-950">
            <PortfolioFundingSection
              portfolioValueEur={totalValue}
              portfolioValueAvailable={performance.totalValueAvailable}
              holdings={holdings.map((holding) => ({
                id: holding.id,
                symbol: holding.symbol,
                name: holding.name,
                assetType: holding.assetType,
              }))}
            />
          </div>
        </section>
      </PageContainer>

      {cryptoEditorOpen ? (
        <AddCryptoHoldingForm
          draft={cryptoDraft}
          isEditing={holdings.some((item) => item.id === cryptoDraft.id)}
          isSaving={isSavingCrypto}
          onDraftChange={setCryptoDraft}
          onClose={() => setCryptoEditorOpen(false)}
          onSubmit={submitCryptoHolding}
        />
      ) : null}

      {editorOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-navy-hero/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <form
            onSubmit={submitHolding}
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
          >
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className={appSectionLabelClass}>
                    {draft.assetType === "cash" ? "Cash" : "Investment"}
                  </p>
                  <h2 className={`mt-2 ${appSectionTitleClass}`}>
                    {holdings.some((item) => item.id === draft.id)
                      ? "Edit holding"
                      : "Add holding"}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="rounded-xl p-2 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {draft.assetType === "cash" ? (
                <div className="mt-7 space-y-5">
                  <Field
                    label="Cash name"
                    value={draft.name}
                    onChange={(value) => setDraft({ ...draft, name: value })}
                  />
                  <Field
                    label={`Amount (${editorCurrencyLocked})`}
                    type="number"
                    prefix={portfolioBaseCurrencySymbol(editorCurrencyLocked)}
                    min="0"
                    step="0.01"
                    value={draft.quantity}
                    onChange={(value) =>
                      setDraft({ ...draft, quantity: Number(value) })
                    }
                  />
                </div>
              ) : (
                <div className="mt-7 space-y-5">
                  <p className="text-[16px] leading-relaxed text-slate-600">
                    Search by name, ticker or ISIN, select the listing, then
                    enter quantity. Tobailey infers the instrument type for you.
                    Matching listings appear automatically after you pause
                    typing. ISIN is optional if several listings appear.
                  </p>
                  <Field
                    label="Search instrument"
                    helpTerm="ticker"
                    required={false}
                    value={draft.symbol}
                    onChange={(value) => {
                      setDraft({
                        ...draft,
                        symbol: value,
                        providerSymbol: null,
                      });
                    }}
                  />
                  <Field
                    label="ISIN (optional)"
                    helpTerm="isin"
                    required={false}
                    value={draft.isin ?? ""}
                    onChange={(value) => {
                      setDraft({
                        ...draft,
                        isin: value || null,
                        providerSymbol: null,
                      });
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
                  <p className="text-[14px] leading-relaxed text-slate-500">
                    Exchange is optional unless several listings appear.
                  </p>
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
                  <p className="text-[15px] leading-relaxed text-slate-600">
                    Bond ETFs and individual bonds use this same flow. Prefer
                    ISIN or ticker plus exchange (for example EUNA), then
                    Find listing.
                  </p>

                  {listingWarnings.length > 0 ? (
                    <div className="space-y-3">
                      {listingLookupMessages.guidance.length > 0 ? (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                          {listingLookupMessages.guidance.map((message) => (
                            <p key={message}>{message}</p>
                          ))}
                        </div>
                      ) : null}
                      {listingLookupMessages.alerts.length > 0 ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          {listingLookupMessages.alerts.map((warning) => (
                            <p key={warning}>{warning}</p>
                          ))}
                          {lookupUnavailable ? (
                            <p className="mt-2 font-semibold">
                              Your entries are kept. You can save without
                              finding a listing.
                            </p>
                          ) : null}
                        </div>
                      ) : lookupUnavailable ? (
                        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                          <p className="font-semibold">
                            Your entries are kept. You can save without finding
                            a listing.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {showPricingListingPicker ? (
                    <ListingCandidatePicker
                      source={{
                        instrumentName: draft.instrumentName ?? draft.name,
                        exchange: draft.exchange,
                        isin: draft.isin,
                        matchMethod: draft.matchMethod as
                          ResolvedInstrument["matchMethod"] | undefined,
                        matchConfidence: draft.matchConfidence,
                        candidates: listingCandidates,
                      }}
                      selectedProviderSymbol={draft.providerSymbol}
                      onSelect={selectListing}
                    />
                  ) : null}

                  {draft.providerSymbol ? (
                    <ConfirmedListingIdentity holding={draft} />
                  ) : null}

                  <Field
                    label="Quantity"
                    type="number"
                    min="0"
                    step="any"
                    value={draft.quantity}
                    onChange={(value) =>
                      setDraft({ ...draft, quantity: Number(value) })
                    }
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={`Cost basis, optional (${editorCurrencyLocked})`}
                      type="number"
                      prefix={portfolioBaseCurrencySymbol(editorCurrencyLocked)}
                      min="0"
                      step="any"
                      required={false}
                      value={draft.purchasePrice}
                      onChange={(value) =>
                        setDraft({ ...draft, purchasePrice: Number(value) })
                      }
                    />
                    <Field
                      label={`Current price (${editorCurrencyLocked})`}
                      type="number"
                      prefix={portfolioBaseCurrencySymbol(editorCurrencyLocked)}
                      min="0"
                      step="any"
                      required={false}
                      value={draft.currentPrice}
                      onChange={(value) =>
                        setDraft({ ...draft, currentPrice: Number(value) })
                      }
                    />
                  </div>

                  {editorError ? (
                    <p
                      className="text-sm font-semibold text-red-700"
                      role="alert"
                    >
                      {editorError}
                    </p>
                  ) : null}
                  {!canPersistMonetary && baseCurrency !== "EUR" ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                      <p>{FX_UNAVAILABLE_SAVE_MESSAGE}</p>
                      <button
                        type="button"
                        onClick={() => {
                          refreshFx();
                          editorSessionRef.current = snapshot;
                        }}
                        className="mt-2 inline-flex min-h-[44px] items-center font-semibold underline"
                      >
                        Retry conversion
                      </button>
                    </div>
                  ) : null}
                </div>
              )}

              {draft.assetType === "cash" && editorError ? (
                <p
                  className="mt-5 text-sm font-semibold text-red-700"
                  role="alert"
                >
                  {editorError}
                </p>
              ) : null}
              {draft.assetType === "cash" &&
              !canPersistMonetary &&
              baseCurrency !== "EUR" ? (
                <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                  <p>{FX_UNAVAILABLE_SAVE_MESSAGE}</p>
                  <button
                    type="button"
                    onClick={() => refreshFx()}
                    className="mt-2 inline-flex min-h-[44px] items-center font-semibold underline"
                  >
                    Retry conversion
                  </button>
                </div>
              ) : null}
            </div>

            <div className="shrink-0 border-t border-slate-100 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
              <button
                type="submit"
                disabled={
                  !canPersistBaseCurrencyAmounts(
                    editorSessionRef.current ?? snapshot,
                  ) ||
                  (editorCurrencyLocked !== "EUR" &&
                    baseCurrency !== editorCurrencyLocked)
                }
                className="inline-flex min-h-[48px] w-full items-center justify-center rounded-xl bg-brand px-5 py-3.5 text-[16px] font-bold text-brand-navy hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {holdings.some((item) => item.id === draft.id)
                  ? "Save holding"
                  : "Add holding"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  prefix,
  min,
  step,
  required = type === "number",
  helpTerm,
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  prefix?: string;
  min?: string;
  step?: string;
  required?: boolean;
  helpTerm?: "ticker" | "isin" | "exchange" | "currency";
}) {
  const labelText = (
    <span
      className={
        type === "number"
          ? "text-[15px] font-bold text-slate-800"
          : "text-sm font-bold text-slate-700"
      }
    >
      {label}
    </span>
  );
  const labelNode = helpTerm ? (
    <HoldingIdentifierLabel term={helpTerm}>{labelText}</HoldingIdentifierLabel>
  ) : (
    labelText
  );
  const Wrapper = helpTerm ? "div" : "label";

  if (type === "number") {
    return (
      <Wrapper className="block min-w-0">
        {labelNode}
        <span className="mt-2 flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
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
      </Wrapper>
    );
  }

  return (
    <Wrapper className="block min-w-0">
      {labelNode}
      <span className="mt-2 flex items-center rounded-xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400">
        {prefix && <span className="font-bold text-slate-400">{prefix}</span>}
        <input
          required={required}
          type={type}
          min={min}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-w-0 flex-1 bg-transparent px-2 py-3.5 font-bold outline-none"
        />
      </span>
    </Wrapper>
  );
}
