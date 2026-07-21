"use client";

/**
 * Portfolio import — screenshot, spreadsheet, and confidence-based review.
 *
 * Architecture:
 * - lib/services/import/* — parsing, confidence policy, finalize, mapping memory
 * - lib/client/importMatchClient.ts — Match Engine API wrapper
 * - components/import/* — mobile-first import UI
 *
 * Future broker feeds plug into the same ImportRow pipeline.
 */

import { ChangeEvent, DragEvent, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Check, Info, Sparkles } from "lucide-react";

import BottomNavigation from "@/components/home/BottomNav";
import { ImportAutoHoldingsList, ImportSummaryCard } from "@/components/import/ImportSummaryCard";
import { ImportDropzone } from "@/components/import/ImportDropzone";
import { ImportMethodPicker } from "@/components/import/ImportMethodPicker";
import { ImportProcessingState } from "@/components/import/ImportProcessingState";
import { ImportReviewList } from "@/components/import/ImportReviewList";
import { ImportTrustBanner } from "@/components/import/ImportTrustBanner";
import PortfolioRecoveryBanner from "@/components/PortfolioRecoveryBanner";
import { matchSingleImportRow, runImportPipeline } from "@/lib/client/importMatchClient";
import { resolveExchangeForMatching } from "@/lib/services/instruments/exchangeNormalizer";
import { saveImportedPortfolio } from "@/lib/client/importSavePortfolio";
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
  isSupportedScreenshotFile,
  isSupportedSpreadsheetFileName,
  parseSpreadsheetBuffer,
  rememberConfirmedImportMappings,
  selectImportCandidate,
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

  const imageInput = useRef<HTMLInputElement>(null);
  const sheetInput = useRef<HTMLInputElement>(null);

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

  const plan = useMemo(() => buildImportReviewPlan(rows), [rows]);

  const sourceLabel =
    source === "screenshot"
      ? "AI screenshot recognition"
      : source === "spreadsheet"
        ? "Spreadsheet import"
        : "Import";

  function applyMemory(rowsToEnhance: ImportRow[]) {
    return applySavedMappingsToRows(userSub, rowsToEnhance).map(annotateImportRow);
  }

  async function processFile(file: File, importSource: ImportSource) {
    setError("");
    setImportNotice("");
    setSuccessMessage("");
    setPhase("processing");
    setProcessingStep(
      importSource === "screenshot" ? "Reading screenshot" : "Reading file",
    );
    setProcessingMessage(
      importSource === "screenshot"
        ? "AI is reading your portfolio screenshot…"
        : "Reading your spreadsheet…",
    );

    try {
      if (importSource === "screenshot") {
        const validation = isSupportedScreenshotFile(file);
        if (!validation.ok) throw new Error(validation.message);
      } else {
        if (!isSupportedSpreadsheetFileName(file.name)) {
          throw new Error("Choose an Excel (.xlsx or .xls) or CSV file.");
        }
      }

      setProcessingStep("Matching instruments");
      setProcessingMessage("Matching every holding to the correct instrument…");

      const result = await runImportPipeline({
        source: importSource,
        file,
        userSub,
        parseSpreadsheet: parseSpreadsheetBuffer,
        applySavedMappings: applyMemory,
      });

      setRows(result.rows);
      setBroker(result.broker);
      setSource(importSource);
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
    if (file.type.startsWith("image/")) {
      void processFile(file, "screenshot");
      return;
    }
    void processFile(file, "spreadsheet");
  }

  function onImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file, "screenshot");
    event.target.value = "";
  }

  function onSheetChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void processFile(file, "spreadsheet");
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) processDroppedOrSelected(file);
  }

  function resetImport() {
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

  function commitRowExchange(
    id: string,
    exchangeCode: string | null,
    confirmed: boolean,
  ) {
    if (!confirmed || !exchangeCode) {
      return;
    }

    const normalizedExchange = resolveExchangeForMatching(exchangeCode);
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

  async function importPortfolio(mode: "replace" | "merge") {
    const validation = canImportRows(rows);
    if (!validation.ok) {
      setError(validation.message ?? "Complete the review before importing.");
      return;
    }

    if (!userSub) {
      setError("Sign in to save your portfolio.");
      return;
    }

    setIsSaving(true);
    setError("");
    setImportNotice("");

    try {
      const prepared = finalizeImportRowsForSave(rows);
      rememberConfirmedImportMappings(userSub, rows);

      const existing = storedHoldings as StoredPortfolioHolding[];
      const next =
        mode === "replace" ? prepared : [...existing, ...prepared];

      const saved = await saveImportedPortfolio({
        userSub,
        holdings: next,
        newProviderSymbols: prepared
          .map((holding) => holding.providerSymbol)
          .filter((symbol): symbol is string => Boolean(symbol)),
      });

      if (!saved.ok) {
        setError(
          saved.stage === "cloud_save"
            ? saved.message
            : `${saved.message} Your import was not completed.`,
        );
        return;
      }

      const messages = [
        saved.priceWarning ??
          "Portfolio imported successfully.",
      ];
      setSuccessMessage(messages.join(" "));
      window.setTimeout(() => router.push("/dashboard"), 900);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Your portfolio could not be saved.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <main className="min-h-screen max-w-full overflow-x-hidden bg-[#F4F7FB] px-4 pb-28 pt-7 text-slate-950 sm:px-8 sm:pt-12">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-700">
            Portfolio setup
          </p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
            Import your portfolio
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">
            Upload a screenshot or spreadsheet. Investment OS reads your
            holdings, matches every instrument, and builds your portfolio in
            seconds.
          </p>

          <PortfolioRecoveryBanner
            offer={recoveryOffer}
            onRecover={recoverPortfolio}
            onDismiss={dismissRecovery}
          />

          {phase === "choose" ? (
            <>
              <div className="mt-8">
                <ImportMethodPicker
                  onScreenshotClick={() => imageInput.current?.click()}
                  onSpreadsheetClick={() => sheetInput.current?.click()}
                />
              </div>

              <ImportDropzone
                isDragging={isDragging}
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
              />
            </>
          ) : null}

          <input
            ref={imageInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onImageChange}
            className="hidden"
          />
          <input
            ref={sheetInput}
            type="file"
            accept=".xlsx,.xls,.csv,text/csv"
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
            <div className="mt-8 space-y-5">
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
                onRemove={removeRow}
              />

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-[-0.03em]">
                      {plan.readyToImport
                        ? "Ready to import"
                        : "Almost there"}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      {plan.readyToImport
                        ? "Your portfolio will activate your dashboard, news, goals, analytics, and AI insights immediately."
                        : "Confirm the holdings above, then import your portfolio."}
                    </p>
                  </div>
                </div>

                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetImport}
                    className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700"
                  >
                    Upload another file
                  </button>
                  {storedHoldings.length > 0 ? (
                    <button
                      type="button"
                      disabled={!plan.readyToImport || isSaving}
                      onClick={() => void importPortfolio("merge")}
                      className="min-h-[48px] rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold disabled:opacity-40"
                    >
                      Add to existing portfolio
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={!plan.readyToImport || isSaving}
                    onClick={() => void importPortfolio("replace")}
                    className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-40"
                  >
                    <Check className="h-4 w-4" />
                    {isSaving ? "Importing…" : "Import portfolio"}
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {phase === "choose" ? <ImportTrustBanner /> : null}
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
