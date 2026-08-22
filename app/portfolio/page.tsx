"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  BarChart3,
  CircleDollarSign,
  History,
  Loader2,
  Pencil,
  PieChart,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import { PortfolioFundingSection } from "@/components/contributions/PortfolioFundingSection";
import { PortfolioHistoryNavCard } from "@/components/portfolioHistory/PortfolioHistoryNavCard";
import { PortfolioAllocationNavCard } from "@/components/portfolio/PortfolioAllocationNavCard";
import { formatListingLookupGuidance } from "@/lib/client/listingLookupGuidance";
import { needsManualPricingSelection } from "@/lib/client/holdingVenuePresentation";
import {
  AppPageLoading,
  PageContainer,
} from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageRelatedLinks } from "@/components/layout/PageRelatedLinks";
import { AuthenticatedFourQuestionsNav } from "@/components/fourQuestions/AuthenticatedFourQuestionsNav";
import { EmptyPortfolioGuide } from "@/components/onboarding/EmptyPortfolioGuide";
import {
  firstIntelligenceDashboardHref,
  markFirstIntelligencePending,
} from "@/lib/client/firstIntelligence";
import { ExportPortfolioButton } from "@/components/export/ExportPortfolioButton";
import {
  ANALYSIS_PATH,
  MARKET_PULSE_PATH,
  PORTFOLIO_HISTORY_PATH,
  PORTFOLIO_HEALTH_PATH,
} from "@/lib/navigation/appRoutes";
import { PAGE_PURPOSE } from "@/lib/navigation/productArchitecture";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import {
  describeHoldingKindLabel,
  formatAllocationPercent,
} from "@/lib/services/classification";
import { runPortfolioExport } from "@/lib/client/runPortfolioExport";
import { usePortfolioContributions } from "@/lib/client/usePortfolioContributions";
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
import {
  appCardValueClass,
  appDarkCardClass,
  appDarkCardPaddingClass,
  appDashboardDarkBodyClass,
  appHeroMetricLabelClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
  appTableNameClass,
  appTableValueClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import NumericInput from "@/components/NumericInput";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import PortfolioSyncBanner from "@/components/PortfolioSyncBanner";
import CryptoRefreshTechnicalDetails from "@/components/portfolio/CryptoRefreshTechnicalDetails";
import { RefreshPricesButton } from "@/components/portfolio/RefreshPricesButton";
import { PortfolioHeroAddMenu } from "@/components/portfolio/PortfolioHeroAddMenu";
import { HoldingVenueSummary } from "@/components/instruments/HoldingVenueSummary";
import { ListingCandidatePicker } from "@/components/instruments/ListingCandidatePicker";
import { HoldingDividendMeta } from "@/components/analysis/DividendIntelligenceSection";
import { HoldingAnalystMeta } from "@/components/analysis/AnalystIntelligenceSection";
import { ExchangeFieldEditor } from "@/components/import/ExchangeFieldEditor";
import { HoldingIdentifierLabel } from "@/components/import/HoldingIdentifierHelp";
import { AddCryptoHoldingForm } from "@/components/portfolio/AddCryptoHoldingForm";
import { buildPortfolioAnalysis } from "@/lib/client/portfolioAnalysis";
import {
  getHoldingCostBasis,
  getHoldingMarketValue,
} from "@/lib/client/holdingValuation";
import {
  holdingPriceHoldingsLabel,
  holdingValueUnavailableLabel,
  isEstimatedHoldingPrice,
  resolveHoldingDisplayPrice,
  resolveHoldingPriceTrustStatus,
} from "@/lib/client/holdingDisplayPrice";
import {
  buildCryptoPriceMetadataLine,
  CRYPTO_PRICING_DISCLOSURE,
  formatCrypto24hChange,
  formatCryptoPairPrice,
} from "@/lib/client/cryptoPriceDisplay";
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
import { findDividendQuoteForHolding } from "@/lib/client/portfolioDividends";
import { findAnalystQuoteForHolding } from "@/lib/client/portfolioAnalyst";
import { calculateImpliedUpsidePercent } from "@/lib/services/analyst/analystCalculations";
import { formatDividendFrequency } from "@/lib/services/dividends";
import { rememberConfirmedHolding } from "@/lib/services/import/mappingMemory";
import { describePricingSource } from "@/lib/services/instruments/listingConfirmation";
import {
  holdingMatchStatusLabel,
  resolveHoldingMatchStatus,
  validateManualHoldingForSave,
} from "@/lib/services/portfolio/holdingValidation";
import {
  createEmptyCryptoDraft,
  isCryptoHolding,
  mergeHoldingOnSave,
} from "@/lib/services/portfolio/cryptoHolding";
import { applyCryptoSearchResultToHolding } from "@/lib/services/portfolio/cryptoCatalog";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import { usePortfolioDividends } from "@/lib/client/usePortfolioDividends";
import { usePortfolioAnalyst } from "@/lib/client/usePortfolioAnalyst";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import { resolvePortfolioDisplayFreshness } from "@/lib/client/portfolioDisplayFreshness";
import { holdingDetailPath } from "@/lib/navigation/appRoutes";
import { ViewHoldingCue } from "@/components/holding/ViewHoldingCue";

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

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}

function costOf(holding: Holding) {
  return getHoldingCostBasis(holding);
}

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
  const addParamHandledRef = useRef(false);
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
  const { entries: contributionEntries } = usePortfolioContributions(
    totalValue,
    performance.totalValueAvailable,
    holdings.length > 0,
    contributionHoldings,
  );
  const totalReturn = performance.totalReturn;
  const totalReturnPercent = performance.totalReturnPercent;
  const cashValue = performance.cashValue;
  const largest = portfolioAnalysis.largestPosition?.holding ?? null;
  const largestWeightPercent =
    portfolioAnalysis.largestPosition?.weightPercent ?? 0;
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

  if (!portfolioReady) {
    return <AppPageLoading />;
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
    saveHoldings(holdings.filter((item) => item.id !== holding.id));
  }

  return (
    <>
      <PageContainer>
        <PageHero
          title="Portfolio"
          subtitle={
            <span className="inline-flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              {heroFreshness.label ? (
                <span data-testid="portfolio-hero-freshness">
                  {heroFreshness.label}
                </span>
              ) : null}
              <RefreshPricesButton
                variant="compact"
                appearance="onLight"
                onClick={() => void refreshPrices()}
                isRefreshing={isRefreshing}
                disabled={refreshDisabled}
                status={refreshStatus}
              />
            </span>
          }
          backToDashboard
          actions={
            <>
              <Link
                href={PORTFOLIO_HISTORY_PATH}
                aria-label="Portfolio History"
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-brand-navy hover:bg-brand-hover"
              >
                <History className="h-4 w-4" aria-hidden="true" />
                History
              </Link>
              <ExportPortfolioButton
                label="Export"
                onExport={() =>
                  runPortfolioExport({
                    holdings,
                    entries: contributionEntries,
                    portfolioValueEur: totalValue,
                    portfolioValueAvailable: performance.totalValueAvailable,
                    baseCurrency,
                    convertEur,
                  })
                }
              />
              <PortfolioHeroAddMenu
                onAddInvestment={() => openAdd("investment")}
                onAddCrypto={openAddCrypto}
                onAddCash={() => openAdd("cash")}
              />
            </>
          }
        />

        <PageRelatedLinks
          purpose={PAGE_PURPOSE.portfolio}
          links={[
            { href: PORTFOLIO_HISTORY_PATH, label: "Portfolio History" },
            { href: PORTFOLIO_HEALTH_PATH, label: "Portfolio Scorecard" },
            { href: ANALYSIS_PATH, label: "Open Analysis" },
            { href: MARKET_PULSE_PATH, label: "Market Pulse" },
          ]}
        />

        <AuthenticatedFourQuestionsNav />

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

        <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <p>{message}</p>
          {showRefreshDiagnostics && refreshDiagnostics ? (
            <CryptoRefreshTechnicalDetails diagnostics={refreshDiagnostics} />
          ) : null}
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Metric
            icon={<CircleDollarSign className="h-5 w-5" />}
            label="Total value"
            value={
              performance.totalValueAvailable
                ? formatEur(totalValue)
                : "Unavailable"
            }
            detail={performance.totalValueCoverageMessage ?? undefined}
          />
          <Metric
            icon={<BarChart3 className="h-5 w-5" />}
            label="Since purchase"
            value={
              performance.canShowPerformance
                ? `${totalReturn >= 0 ? "+" : ""}${formatEur(totalReturn)}`
                : "Unavailable"
            }
            detail={
              performance.canShowPerformance
                ? percent(totalReturnPercent)
                : "Price data required"
            }
            tone={
              performance.canShowPerformance
                ? totalReturn >= 0
                  ? "positive"
                  : "negative"
                : "neutral"
            }
          />
          <Metric
            icon={<Banknote className="h-5 w-5" />}
            label="Cash"
            value={formatEur(cashValue)}
            detail={
              performance.totalValueAvailable && totalValue > 0
                ? `${((cashValue / totalValue) * 100).toFixed(1)}% of portfolio`
                : performance.totalValueAvailable
                  ? "Share unavailable"
                  : "Portfolio value unavailable"
            }
          />
          <Metric
            icon={<PieChart className="h-5 w-5" />}
            label="Largest position"
            value={largest?.symbol ?? "—"}
            detail={
              largest && totalValue > 0
                ? `${largestWeightPercent.toFixed(1)}% of portfolio`
                : holdings.length > 0
                  ? "Awaiting price data"
                  : "No holdings"
            }
          />
        </section>
        <ConversionDetailsDisclosure compactTrigger />

        <PortfolioHistoryNavCard variant="card" />
        <PortfolioAllocationNavCard />

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

        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5 sm:px-7">
            <div>
              <h2 className={appSectionTitleClass}>Holdings</h2>
              <p className={`mt-1.5 ${appSectionMetaClass}`}>
                {holdings.length} positions
              </p>
            </div>
            <Link
              href="/upload"
              className="inline-flex items-center gap-2 text-sm font-bold text-brand-navy hover:text-brand"
            >
              <Upload className="h-4 w-4" /> Import
            </Link>
          </div>

          {holdings.length === 0 ? (
            <div className="px-4 py-6 sm:px-6">
              <EmptyPortfolioGuide
                density="compact"
                title="No holdings yet"
                body="Import a CSV or Excel file, or add an investment, crypto or cash position to get started."
                className="border-0 shadow-none"
              />
            </div>
          ) : (
            <div className="min-w-0 overflow-x-clip">
              {holdings.some((holding) => isCryptoHolding(holding)) ? (
                <p
                  className={`border-b border-slate-100 px-4 py-2.5 text-sm text-slate-600 sm:px-5`}
                >
                  {CRYPTO_PRICING_DISCLOSURE}
                </p>
              ) : null}
              <div className="divide-y divide-slate-200">
                {holdings.map((holding) => {
                  const holdingValue = getHoldingMarketValue(holding);
                  const priceTrust = resolveHoldingPriceTrustStatus(holding);
                  const priceTrustBadge = holdingPriceHoldingsLabel(priceTrust);
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
                  const isCrypto = isCryptoHolding(holding);
                  const kindLabel = describeHoldingKindLabel(holding);
                  const allocationLabel =
                    holdingValue === null
                      ? "—"
                      : formatAllocationPercent(allocation);
                  const cryptoDisplayPrice = isCrypto
                    ? resolveHoldingDisplayPrice(holding)
                    : null;
                  const cryptoMetadataLine = isCrypto
                    ? buildCryptoPriceMetadataLine(holding)
                    : null;
                  const impliedUpsidePercent =
                    analystQuote && holding.currentPrice > 0
                      ? calculateImpliedUpsidePercent(
                          holding.currentPrice,
                          analystQuote.averagePriceTarget,
                        )
                      : null;
                  const detailHref =
                    holding.assetType === "cash"
                      ? null
                      : holdingDetailPath(holding.symbol);
                  const quantityLabel =
                    holding.assetType === "cash"
                      ? "Cash"
                      : `${holding.quantity.toLocaleString("en-GB")}${
                          isCrypto ? "" : " units"
                        }`;
                  return (
                    <article
                      key={holding.id}
                      className={`min-w-0 px-4 py-3.5 sm:px-5 sm:py-4 ${detailHref ? "cursor-pointer transition-colors hover:bg-slate-50/80 focus-within:bg-slate-50/80" : ""}`}
                      onClick={
                        detailHref
                          ? () => {
                              router.push(detailHref);
                            }
                          : undefined
                      }
                      onKeyDown={
                        detailHref
                          ? (event) => {
                              if (event.key === "Enter" || event.key === " ") {
                                event.preventDefault();
                                router.push(detailHref);
                              }
                            }
                          : undefined
                      }
                      tabIndex={detailHref ? 0 : undefined}
                      role={detailHref ? "link" : undefined}
                      aria-label={
                        detailHref
                          ? `Open ${holding.name} holding details`
                          : undefined
                      }
                    >
                      {/* Mobile-first compact row */}
                      <div className="flex min-w-0 items-start gap-3 lg:hidden">
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`inline-flex shrink-0 rounded-lg px-2 py-1 text-[13px] font-bold ${holding.assetType === "cash" ? "bg-emerald-100 text-emerald-800" : isCrypto ? "bg-q2-soft text-q2-deep" : "bg-navy-hero text-white"}`}
                            >
                              {holding.symbol}
                            </span>
                            <p className="min-w-0 truncate text-[14px] font-semibold text-slate-900">
                              {holding.name}
                            </p>
                            {kindLabel ? (
                              <span className="shrink-0 text-[13px] font-medium text-q3-strong">
                                {kindLabel}
                              </span>
                            ) : null}
                          </div>
                          {detailHref ? (
                            <ViewHoldingCue className="mt-1 block" />
                          ) : null}
                          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1.5">
                            <div className="min-w-0">
                              <p className={appSectionLabelClass}>
                                Value
                              </p>
                              <p className="truncate text-[14px] font-bold tabular-nums text-slate-950">
                                {holdingValue === null
                                  ? holdingValueUnavailableLabel(holding)
                                  : formatEur(holdingValue)}
                                {priceTrustBadge && holdingValue !== null ? (
                                  <span className="ml-1 text-[13px] font-semibold text-amber-800">
                                    {priceTrustBadge}
                                  </span>
                                ) : null}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className={appSectionLabelClass}>
                                Gain / loss
                              </p>
                              <p
                                className={`truncate text-[14px] font-bold tabular-nums ${holdingReturn === null ? "text-slate-600" : holdingReturn >= 0 ? "text-emerald-700" : "text-red-700"}`}
                              >
                                {holding.assetType === "cash"
                                  ? "Stable"
                                  : holdingReturn === null
                                    ? holdingValueUnavailableLabel(holding)
                                    : `${holdingReturn >= 0 ? "+" : ""}${formatEur(holdingReturn)}`}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className={appSectionLabelClass}>
                                Qty
                              </p>
                              <p className="truncate text-[13px] font-semibold tabular-nums text-slate-700">
                                {quantityLabel}
                              </p>
                            </div>
                            <div className="min-w-0">
                              <p className={appSectionLabelClass}>
                                Allocation
                              </p>
                              <p className="truncate text-[13px] font-semibold tabular-nums text-slate-700">
                                {allocationLabel}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div
                          className="flex shrink-0 flex-col items-center gap-1"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(holding)}
                            aria-label={`Edit ${holding.name}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHolding(holding)}
                            aria-label={`Remove ${holding.name}`}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Desktop row */}
                      <div className="hidden min-w-0 gap-4 lg:grid lg:grid-cols-[0.55fr_1.4fr_1fr_0.7fr_1fr_auto] lg:items-start">
                        <div className="flex items-start">
                          <span
                            className={`inline-flex rounded-xl px-3 py-2 ${appTableValueClass} ${holding.assetType === "cash" ? "bg-emerald-100 text-emerald-800" : isCrypto ? "bg-q2-soft text-q2-deep" : "bg-navy-hero text-white"}`}
                          >
                            {holding.symbol}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className={appTableNameClass}>{holding.name}</p>
                          <p className={`mt-1 ${appSectionMetaClass}`}>
                            {holding.assetType === "cash"
                              ? "Cash holding"
                              : isCrypto
                                ? `${holding.quantity.toLocaleString("en-GB")} · ${holding.tradingPair ?? `${holding.symbol}/${holding.pairCurrency ?? "EUR"}`}`
                                : `${holding.quantity.toLocaleString("en-GB")} units · ${holdingMatchStatusLabel(matchStatus, holding.assetType)}${kindLabel ? ` · ${kindLabel}` : ""}`}
                          </p>
                          {isCrypto ? (
                            <div className="mt-2 space-y-1">
                              <p className={`${appTableValueClass}`}>
                                {formatCryptoPairPrice(
                                  cryptoDisplayPrice?.price ?? null,
                                  holding.pairCurrency ?? null,
                                )}
                              </p>
                              <p className={`${appSectionMetaClass}`}>
                                {formatCrypto24hChange(
                                  holding.change24hPercent ??
                                    holding.changePercent,
                                  holding.change24hAmount,
                                )}
                              </p>
                              {cryptoMetadataLine ? (
                                <p className={`${appTickerClass} normal-case`}>
                                  {cryptoMetadataLine}
                                </p>
                              ) : holding.pricingStatus !== "manual" ? (
                                <p className="text-sm font-semibold text-amber-800">
                                  Live price unavailable
                                </p>
                              ) : null}
                            </div>
                          ) : null}
                          {holding.pricingExchange && holding.providerSymbol ? (
                            <p className={`mt-1 ${appTickerClass} normal-case`}>
                              {describePricingSource({
                                exchange: holding.exchange ?? null,
                                pricingExchange: holding.pricingExchange,
                                providerSymbol: holding.providerSymbol,
                              })}
                            </p>
                          ) : null}
                        </div>
                        <div>
                          <p className={appTableValueClass}>
                            {holdingValue === null
                              ? holdingValueUnavailableLabel(holding)
                              : formatEur(holdingValue)}
                            {priceTrustBadge && holdingValue !== null ? (
                              <span className="ml-1 text-[13px] font-semibold text-amber-800">
                                {priceTrustBadge}
                              </span>
                            ) : null}
                          </p>
                        </div>
                        <div>
                          <p className={appTableValueClass}>
                            {allocationLabel}
                          </p>
                        </div>
                        <div>
                          <p
                            className={`${appTableValueClass} ${holdingReturn === null ? "text-slate-600" : holdingReturn >= 0 ? "text-emerald-700" : "text-red-700"}`}
                          >
                            {holding.assetType === "cash"
                              ? "Stable"
                              : holdingReturn === null
                                ? holdingValueUnavailableLabel(holding)
                                : `${holdingReturn >= 0 ? "+" : ""}${formatEur(holdingReturn)}`}
                          </p>
                        </div>
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(event) => event.stopPropagation()}
                          onKeyDown={(event) => event.stopPropagation()}
                        >
                          {detailHref ? (
                            <Link
                              href={detailHref}
                              aria-label={`View ${holding.name} holding`}
                              className="inline-flex items-center rounded-lg px-2 py-2 text-[13px] font-semibold text-brand-navy hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                            >
                              View holding →
                            </Link>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => openEdit(holding)}
                            aria-label={`Edit ${holding.name}`}
                            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeHolding(holding)}
                            aria-label={`Remove ${holding.name}`}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      {dividendQuote?.paysDividends ? (
                        <HoldingDividendMeta
                          yieldPercent={dividendQuote.dividendYield}
                          annualIncomeEur={
                            dividendQuote.estimatedAnnualDividendEur
                          }
                          nextPaymentEur={dividendQuote.estimatedNextPaymentEur}
                          nextExDate={dividendQuote.nextExDate}
                          nextPaymentDate={dividendQuote.nextPaymentDate}
                          frequency={formatDividendFrequency(
                            dividendQuote.frequency,
                          )}
                        />
                      ) : null}
                      {analystQuote ? (
                        <HoldingAnalystMeta
                          quote={analystQuote}
                          currentPriceEur={
                            holding.currentPrice > 0
                              ? holding.currentPrice
                              : null
                          }
                          impliedUpsidePercent={impliedUpsidePercent}
                        />
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        <section className={`${appDarkCardClass} ${appDarkCardPaddingClass}`}>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl bg-white/10 p-3 text-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className={appHeroMetricLabelClass}>Portfolio insight</p>
              <p className={`mt-3 max-w-3xl ${appDashboardDarkBodyClass}`}>
                {largest && totalValue > 0
                  ? `${largest.symbol} is your largest position at ${largestWeightPercent.toFixed(1)}%. `
                  : performance.hasUnvaluedInvestments
                    ? "Some holdings are excluded until market prices are available. "
                    : ""}
                {cashValue > 0 && totalValue > 0
                  ? `Cash represents ${((cashValue / totalValue) * 100).toFixed(1)}% of total portfolio value.`
                  : "No cash holding is currently recorded."}
              </p>
            </div>
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
                    <HoldingVenueSummary
                      exchange={draft.exchange}
                      pricingExchange={draft.pricingExchange}
                      providerSymbol={draft.providerSymbol}
                      instrumentName={draft.instrumentName ?? draft.name}
                      confirmationSource={draft.confirmationSource}
                      showPurchaseExchange={false}
                    />
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

function Metric({
  icon,
  label,
  value,
  detail,
  tone = "neutral",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail?: string;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
        {icon}
      </div>
      <p className={`mt-4 ${appSectionLabelClass}`}>{label}</p>
      <p
        className={`mt-2 ${appCardValueClass} ${tone === "positive" ? "text-emerald-700" : tone === "negative" ? "text-red-700" : "text-slate-950"}`}
      >
        {value}
      </p>
      {detail && <p className={`mt-1.5 ${appSectionMetaClass}`}>{detail}</p>}
    </article>
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
