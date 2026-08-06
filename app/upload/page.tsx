"use client";

/**
 * Portfolio import — spreadsheet and confidence-based review.
 *
 * Architecture:
 * - lib/services/import/* — parsing, confidence policy, finalize, mapping memory
 * - lib/client/importMatchClient.ts — Match Engine API wrapper
 * - components/import/* — mobile-first import UI
 *
 * Future broker feeds plug into the same ImportRow pipeline.
 */

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Info, RefreshCw, Sparkles } from "lucide-react";

import BottomNavigation from "@/components/home/BottomNav";
import { SupportedInstrumentsCallout } from "@/components/marketing/SupportedInstrumentsCallout";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { ImportAutoHoldingsList, ImportSummaryCard } from "@/components/import/ImportSummaryCard";
import { ImportDropzone } from "@/components/import/ImportDropzone";
import { ImportMethodPicker } from "@/components/import/ImportMethodPicker";
import { ImportProcessingState } from "@/components/import/ImportProcessingState";
import { ImportReviewList } from "@/components/import/ImportReviewList";
import { ImportProgressSteps } from "@/components/import/ImportProgressSteps";
import { ImportTrustBanner } from "@/components/import/ImportTrustBanner";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { matchSingleImportRow, runImportPipeline } from "@/lib/client/importMatchClient";
import {
  applyManualExactListingToImportRow,
} from "@/lib/services/instruments/listingConfirmation";
import { parseProviderSymbolInput } from "@/lib/services/instruments/providerSymbolInput";
import { normalizeExchange } from "@/lib/services/instruments/exchangeNormalizer";
import { mergeImportedHoldings } from "@/lib/client/importMergeHoldings";
import { saveImportedPortfolio } from "@/lib/client/importSavePortfolio";
import {
  clearPendingImportSession,
  createImportIdempotencyKey,
  readPendingImportSession,
  writePendingImportSession,
} from "@/lib/client/importSessionStorage";
import {
  appSolidButtonClass,
  appGhostButtonClass,
} from "@/components/layout/appSurface";
import type { ExtractionReviewField } from "@/lib/services/extraction/fieldConfidence";
import { useUserPortfolio } from "@/lib/client/useUserPortfolio";
import {
  annotateImportRow,
  applySavedMappingsToRows,
  applyImportPurchaseDateToRow,
  buildImportReviewPlan,
  canImportRows,
  confirmImportRow,
  finalizeImportRowsForSave,
  parseSpreadsheetBuffer,
  rememberConfirmedImportMappings,
  selectImportCandidate,
  validateSpreadsheetImportFile,
  type ImportRow,
  type ImportSource,
} from "@/lib/services/import";
import type { ResolvedInstrument } from "@/lib/types/instrument";
import type { StoredPortfolioHolding } from "@/lib/types/portfolioStorage";

type ImportPhase = "choose" | "processing" | "ready";

export default function UploadPage() {
  const router = useRouter();
  const {
    userSub,
    holdings: storedHoldings,
    recoveryOffer,
    recoverPortfolio,
    dismissRecovery,
  } = useUserPortfolio();

  const sheetInput = useRef<HTMLInputElement>(null);
  const importIdempotencyKeyRef = useRef<string | null>(null);
  const importModeRef = useRef<"replace" | "merge">("replace");

  const [phase, setPhase] = useState<ImportPhase>("choose");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [broker, setBroker] = useState<string | null>(null);
  const [source, setSource] = useState<ImportSource | null>(null);
  const [processingMessage, setProcessingMessage] = useState("");
  const [processingStep, setProcessingStep] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState("");
  const [importNotice, setImportNotice] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [syncFailed, setSyncFailed] = useState(false);

  useEffect(() => {
    if (!userSub) return;

    const pending = readPendingImportSession(userSub);
    if (!pending || pending.rows.length === 0) return;

    setRows(pending.rows);
    setBroker(pending.broker);
    setSource(pending.source);
    setPhase("ready");
    importIdempotencyKeyRef.current = pending.idempotencyKey;
    importModeRef.current = pending.mode;
    if (pending.syncError) {
      setSyncFailed(true);
      setError(pending.syncError);
    }
  }, [userSub]);

  function persistImportSession(
    nextRows: ImportRow[],
    mode: "replace" | "merge",
    syncError?: string | null,
    syncErrorCode?: string | null,
  ) {
    if (!userSub || nextRows.length === 0) return;

    if (!importIdempotencyKeyRef.current) {
      importIdempotencyKeyRef.current = createImportIdempotencyKey(userSub);
    }

    writePendingImportSession(userSub, {
      version: 1,
      rows: nextRows,
      broker,
      source,
      mode,
      idempotencyKey: importIdempotencyKeyRef.current,
      syncError: syncError ?? null,
      syncErrorCode: syncErrorCode ?? null,
      updatedAt: new Date().toISOString(),
    });
  }

  const plan = useMemo(() => buildImportReviewPlan(rows), [rows]);

  const sourceLabel =
    source === "spreadsheet" ? "Spreadsheet import" : "Import";

  function applyMemory(rowsToEnhance: ImportRow[]) {
    return applySavedMappingsToRows(userSub, rowsToEnhance).map(annotateImportRow);
  }

  async function processFile(file: File) {
    setError("");
    setImportNotice("");
    setSuccessMessage("");
    setPhase("processing");
    setProcessingStep("Reading file");
    setProcessingMessage("Reading your spreadsheet…");

    try {
      const validation = validateSpreadsheetImportFile(file);
      if (!validation.ok) throw new Error(validation.message);

      setProcessingStep("Matching instruments");
      setProcessingMessage("Matching every holding to the correct instrument…");

      const result = await runImportPipeline({
        source: "spreadsheet",
        file,
        userSub,
        parseSpreadsheet: parseSpreadsheetBuffer,
        applySavedMappings: applyMemory,
      });

      setRows(result.rows);
      setBroker(result.broker);
      setSource("spreadsheet");
      importIdempotencyKeyRef.current = userSub
        ? createImportIdempotencyKey(userSub)
        : null;
      importModeRef.current = "replace";
      setSyncFailed(false);
      if (userSub) {
        writePendingImportSession(userSub, {
          version: 1,
          rows: result.rows,
          broker: result.broker,
          source: "spreadsheet",
          mode: "replace",
          idempotencyKey: importIdempotencyKeyRef.current!,
          syncError: null,
          syncErrorCode: null,
          updatedAt: new Date().toISOString(),
        });
      }
      if (result.matchQuotaWarning) {
        setImportNotice(result.matchQuotaWarning);
      }
      setPhase("ready");
      setProcessingMessage("");
      setProcessingStep("");
    } catch (caught) {
      setPhase("choose");
      setError(
        caught instanceof Error
          ? caught.message
          : "Something went wrong while importing your file.",
      );
      setProcessingMessage("");
      setProcessingStep("");
    }
  }

  function processDroppedOrSelected(file: File) {
    void processFile(file);
  }

  function onSheetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processDroppedOrSelected(file);
  }

  function resetImport() {
    if (userSub) {
      clearPendingImportSession(userSub);
    }
    importIdempotencyKeyRef.current = null;
    importModeRef.current = "replace";
    setSyncFailed(false);
    setRows([]);
    setBroker(null);
    setSource(null);
    setPhase("choose");
    setError("");
    setImportNotice("");
    setSuccessMessage("");
  }

  function confirmRow(id: string) {
    setRows((current) =>
      current.map((row) => (row.id === id ? confirmImportRow(row) : row)),
    );
  }

  function pickCandidate(id: string, candidate: ResolvedInstrument) {
    setRows((current) =>
      current.map((row) =>
        row.id === id ? selectImportCandidate(row, candidate) : row,
      ),
    );
  }

  function clearMatchState(row: ImportRow): ImportRow {
    return {
      ...row,
      providerSymbol: null,
      matchMethod: undefined,
      matchConfidence: undefined,
      requiresConfirmation: undefined,
      matchWarnings: undefined,
      userConfirmed: false,
      candidates: undefined,
    };
  }

  function rematchRow(id: string, row: ImportRow) {
    if (row.assetType === "cash") return;

    void matchSingleImportRow(row)
      .then((matched) => {
        setRows((rowsNow) =>
          rowsNow.map((item) => (item.id === id ? matched : item)),
        );
      })
      .catch(() => {
        // Keep editable row state; user can still pick a candidate manually.
      });
  }

  function applyManualExactListing(id: string, providerSymbol: string) {
    const parsed = parseProviderSymbolInput(providerSymbol);
    if (!parsed.ok) {
      return;
    }

    setRows((current) =>
      current.map((row) =>
        row.id === id ? applyManualExactListingToImportRow(row, parsed) : row,
      ),
    );
  }

  function commitRowExchange(
    id: string,
    exchangeCode: string | null,
    confirmed: boolean,
  ) {
    if (!confirmed || !exchangeCode) {
      return;
    }

    const normalizedExchange = normalizeExchange(exchangeCode);
    if (!normalizedExchange) {
      return;
    }

    setRows((current) => {
      const updated = current.map((row) => {
        if (row.id !== id) return row;

        const next: ImportRow = {
          ...clearMatchState(row),
          exchange: normalizedExchange,
        };

        if (confirmed && next.extractionFieldConfidence) {
          next.extractionFieldConfidence = {
            ...next.extractionFieldConfidence,
            exchange: 1,
          };
        }

        return annotateImportRow(next);
      });

      const changed = updated.find((row) => row.id === id);
      if (changed) {
        rematchRow(id, changed);
      }

      return updated;
    });
  }

  function updateRowField(
    id: string,
    field: ExtractionReviewField,
    value: string | number,
  ) {
    setRows((current) => {
      const updated = current.map((row) => {
        if (row.id !== id) return row;

        let next: ImportRow = { ...row };
        const numeric =
          typeof value === "number" ? value : Number(value);

        switch (field) {
          case "name":
            next.name = String(value);
            break;
          case "isin":
            next.isin = String(value).trim().toUpperCase() || null;
            break;
          case "ticker":
            next.symbol = String(value).trim().toUpperCase();
            break;
          case "quantity":
            next.quantity = numeric;
            break;
          case "purchasePrice":
            next.purchasePrice = numeric;
            break;
          case "currentPrice":
            next.currentPrice = numeric;
            break;
          case "purchaseDate":
            return applyImportPurchaseDateToRow(row, value);
          default:
            break;
        }

        if (["isin", "ticker", "name"].includes(field)) {
          next = clearMatchState(next);
        }

        if (["isin", "ticker", "name"].includes(field)) {
          if (next.extractionFieldConfidence) {
            next.extractionFieldConfidence = {
              ...next.extractionFieldConfidence,
              [field === "ticker" ? "ticker" : field]: 1,
            };
          }
        }

        return annotateImportRow(next);
      });

      if (["isin", "ticker", "name"].includes(field)) {
        const changed = updated.find((row) => row.id === id);
        if (changed && changed.assetType !== "cash") {
          rematchRow(id, changed);
        }
      }

      return updated;
    });
  }

  function removeRow(id: string) {
    setRows((current) => current.filter((row) => row.id !== id));
  }

  async function importPortfolio(
    mode: "replace" | "merge",
    options?: { readyOnly?: boolean },
  ) {
    if (isSaving) return;

    const rowsToImport = options?.readyOnly
      ? rows.filter(
          (row) =>
            annotateImportRow(row).reviewTier === "auto" ||
            row.userConfirmed === true,
        )
      : rows;

    const validation = canImportRows(rowsToImport);
    if (!validation.ok) {
      setError(validation.message ?? "Complete the review before importing.");
      return;
    }

    if (!userSub) {
      setError("Sign in to save your portfolio.");
      return;
    }

    importModeRef.current = mode;
    setIsSaving(true);
    setError("");
    setImportNotice("");
    setSyncFailed(false);
    persistImportSession(rowsToImport, mode);

    try {
      const prepared = finalizeImportRowsForSave(rowsToImport);
      rememberConfirmedImportMappings(userSub, rowsToImport);

      const existing = storedHoldings as StoredPortfolioHolding[];
      let next = prepared;
      let skippedDuplicates = 0;
      // Partial "ready only" never replaces the whole book — merge into existing.
      const shouldMerge = mode === "merge" || Boolean(options?.readyOnly);
      if (shouldMerge) {
        const merged = mergeImportedHoldings(existing, prepared);
        next = merged.holdings;
        skippedDuplicates = merged.skippedDuplicates;
      }

      if (!importIdempotencyKeyRef.current) {
        importIdempotencyKeyRef.current = createImportIdempotencyKey(userSub);
      }

      const saved = await saveImportedPortfolio({
        userSub,
        holdings: next,
        idempotencyKey: importIdempotencyKeyRef.current ?? undefined,
        newProviderSymbols: syncFailed
          ? []
          : prepared
              .map((holding) => holding.providerSymbol)
              .filter((symbol): symbol is string => Boolean(symbol)),
      });

      if (!saved.ok) {
        const message =
          saved.stage === "cloud_save"
            ? saved.message
            : `${saved.message} Your import was not completed.`;
        setSyncFailed(true);
        setError(message);
        persistImportSession(rows, mode, message);
        return;
      }

      clearPendingImportSession(userSub);
      importIdempotencyKeyRef.current = null;
      setSyncFailed(false);

      const importedCount = Math.max(0, prepared.length - skippedDuplicates);
      const parts = [
        "Your portfolio is ready.",
        `${importedCount} holding${importedCount === 1 ? "" : "s"} imported successfully.`,
      ];
      if (skippedDuplicates > 0) {
        parts.push(
          `${skippedDuplicates} duplicate${skippedDuplicates === 1 ? "" : "s"} skipped.`,
        );
      }
      if (saved.priceWarning) {
        parts.push(saved.priceWarning);
      }
      setSuccessMessage(parts.join(" "));
      window.setTimeout(() => router.push("/dashboard"), 1200);
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message
          : "Your portfolio could not be saved.";
      setSyncFailed(true);
      setError(message);
      persistImportSession(rowsToImport, mode, message);
    } finally {
      setIsSaving(false);
    }
  }

  function retrySync() {
    void importPortfolio(importModeRef.current);
  }

  const progressPhase = successMessage
    ? "success"
    : phase === "choose"
      ? "choose"
      : phase === "processing"
        ? "processing"
        : "ready";

  const canImportReadyOnly =
    plan.autoCount > 0 &&
    (plan.reviewCount > 0 || plan.blockedCount > 0) &&
    !plan.readyToImport;

  return (
    <>
      <PageContainer>
        <PageHero
          title="Import Portfolio"
          subtitle="Upload your broker export. Tobailey detects holdings before anything is added."
          backToDashboard
        />

          <ImportProgressSteps phase={progressPhase} />

          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={recoverPortfolio}
            onDismiss={dismissRecovery}
          />

          {phase === "choose" ? (
            <>
              <ImportMethodPicker onSpreadsheetClick={() => sheetInput.current?.click()} />

              <ImportDropzone
                isDragging={isDragging}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              />

              <SupportedInstrumentsCallout />
            </>
          ) : null}

          <input
            ref={sheetInput}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={onSheetChange}
            className="hidden"
          />

          {phase === "processing" ? (
            <ImportProcessingState
              message={processingMessage}
              step={processingStep}
            />
          ) : null}

          {importNotice ? (
            <div className="mt-5 flex items-start gap-2 rounded-[24px] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              {importNotice}
            </div>
          ) : null}

          {error ? (
            <div className="mt-5 flex items-start gap-2 rounded-[24px] border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-5 rounded-[24px] border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">
              {successMessage}
            </div>
          ) : null}

          {phase === "ready" && rows.length > 0 ? (
            <div className="space-y-5">
              <ImportSummaryCard
                plan={plan}
                broker={broker}
                sourceLabel={sourceLabel}
              />

              <ImportAutoHoldingsList holdings={plan.autoRows} />

              <ImportReviewList
                rows={[...plan.reviewRows, ...plan.blockedRows]}
                onConfirm={confirmRow}
                onSelectCandidate={pickCandidate}
                onFieldChange={updateRowField}
                onExchangeCommit={commitRowExchange}
                onManualExactListing={applyManualExactListing}
                onRemove={removeRow}
              />

              <section className="rounded-[24px] border border-slate-200/80 bg-white p-5 md:rounded-[28px] sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-brand-soft p-3 text-brand-navy">
                    <Sparkles className="h-5 w-5" aria-hidden />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold tracking-[-0.02em] text-slate-950">
                      {plan.readyToImport
                        ? "Ready to import"
                        : "Almost there"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {plan.readyToImport
                        ? "You review everything before import. Ambiguous rows stay out until confirmed."
                        : canImportReadyOnly
                          ? "Fix remaining rows, or import only the holdings that are already ready."
                          : "Confirm or exclude the holdings that need attention, then import."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <button
                    type="button"
                    onClick={resetImport}
                    className={appGhostButtonClass}
                  >
                    Upload another file
                  </button>
                  {storedHoldings.length > 0 && plan.readyToImport ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void importPortfolio("merge")}
                      className={`${appGhostButtonClass} disabled:opacity-40`}
                    >
                      Merge into my portfolio
                    </button>
                  ) : null}
                  {canImportReadyOnly ? (
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() =>
                        void importPortfolio("merge", { readyOnly: true })
                      }
                      className={`${appGhostButtonClass} disabled:opacity-40`}
                    >
                      {`Import ${plan.autoCount} ready holding${plan.autoCount === 1 ? "" : "s"} only`}
                    </button>
                  ) : null}
                  {syncFailed ? (
                    <button
                      type="button"
                      disabled={!plan.readyToImport || isSaving}
                      onClick={retrySync}
                      className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-5 py-3 text-sm font-bold text-red-900 disabled:opacity-40"
                    >
                      <RefreshCw className="h-4 w-4" aria-hidden />
                      {isSaving ? "Retrying sync…" : "Retry sync"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!plan.readyToImport || isSaving}
                    onClick={() =>
                      void importPortfolio(
                        storedHoldings.length > 0 ? "merge" : "replace",
                      )
                    }
                    className={`${appSolidButtonClass} disabled:opacity-40`}
                    aria-label={
                      plan.autoCount > 0
                        ? `Import ${plan.autoCount} holdings`
                        : "Import portfolio"
                    }
                  >
                    <Check className="h-4 w-4" aria-hidden />
                    {isSaving
                      ? "Importing…"
                      : syncFailed
                        ? "Import portfolio again"
                        : plan.autoCount > 0
                          ? `Import ${plan.autoCount} holding${plan.autoCount === 1 ? "" : "s"}`
                          : "Import portfolio"}
                  </button>
                </div>
                {successMessage ? (
                  <Link
                    href="/dashboard"
                    className={`mt-4 ${appSolidButtonClass}`}
                  >
                    View my Dashboard
                  </Link>
                ) : null}
              </section>
            </div>
          ) : null}

          {phase === "choose" ? <ImportTrustBanner /> : null}
      </PageContainer>
      <BottomNavigation />
    </>
  );
}
