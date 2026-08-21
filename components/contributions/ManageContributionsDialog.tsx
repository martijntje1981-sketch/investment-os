"use client";

import { FormEvent, useMemo, useState } from "react";
import { Loader2, Pencil, Trash2, X } from "lucide-react";

import NumericInput from "@/components/NumericInput";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appSectionTitleClass,
} from "@/components/layout/appSurface";
import {
  CONTRIBUTIONS_EXPLANATORY_COPY,
  CONTRIBUTIONS_MANAGE_LABEL,
  CONTRIBUTIONS_ONBOARDING_COPY,
  CONTRIBUTIONS_OPENING_LABEL,
  CONTRIBUTION_DEFAULT_DESTINATION_ACTION,
  CONTRIBUTION_FUNDING_ONLY_NOTE,
  CONTRIBUTION_HOLDING_DESTINATION_ACTION,
} from "@/lib/client/contributionsCopy";
import { formatContributionBaseAmount } from "@/lib/client/contributionsFormat";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { formatSignedPortfolioCurrency } from "@/lib/client/portfolioMovementFormat";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import { activityTypeLabel } from "@/lib/services/contributions/activityLabels";
import { formatContributionDestinationLines } from "@/lib/services/contributions/destination";
import type {
  ContributionEntryDraft,
  ContributionHoldingOption,
  ContributionSummary,
  PortfolioContributionEntry,
} from "@/lib/services/contributions/types";
import {
  deriveHoldingContributionAmount,
  todayIsoDate,
  validateContributionDraft,
} from "@/lib/services/contributions/validation";
import {
  portfolioBaseCurrencySymbol,
  type PortfolioBaseCurrency,
} from "@/lib/types/portfolioBaseCurrency";

type ManageContributionsDialogProps = {
  entries: PortfolioContributionEntry[];
  summary: ContributionSummary;
  holdings?: ContributionHoldingOption[];
  isMutating: boolean;
  mutationError: string | null;
  portfolioValueAvailable: boolean;
  onClose: () => void;
  onSave: (
    draft: Partial<ContributionEntryDraft>,
    entryId?: string,
  ) => Promise<PortfolioContributionEntry>;
  onDelete: (entryId: string) => Promise<void>;
};

type FormMode = "create" | "edit";

function buildEmptyDraft(
  baseCurrency: PortfolioBaseCurrency,
  source: ContributionEntryDraft["source"] = "manual",
): ContributionEntryDraft {
  return {
    entryType: "contribution",
    amount: 0,
    currency: baseCurrency,
    entryDate: todayIsoDate(),
    note: null,
    source,
    destinationType: "cash",
    destinationHoldingId: null,
    destinationHoldingSymbol: null,
    destinationQuantity: null,
    destinationPricePerUnit: null,
    destinationFee: null,
  };
}

function entryToDraft(entry: PortfolioContributionEntry): ContributionEntryDraft {
  return {
    entryType: entry.entryType,
    amount: entry.amount,
    currency: entry.currency,
    entryDate: entry.entryDate,
    note: entry.note,
    source: entry.source,
    destinationType: entry.destinationType,
    destinationHoldingId: entry.destinationHoldingId,
    destinationHoldingSymbol: entry.destinationHoldingSymbol,
    destinationQuantity: entry.destinationQuantity,
    destinationPricePerUnit: entry.destinationPricePerUnit,
    destinationFee: entry.destinationFee,
  };
}

function formatEntryDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function ManageContributionsDialog({
  entries,
  summary,
  holdings = [],
  isMutating,
  mutationError,
  portfolioValueAvailable,
  onClose,
  onSave,
  onDelete,
}: ManageContributionsDialogProps) {
  const { formatEur, convertToEur, baseCurrency } = useBaseCurrencyDisplay();
  const formatContributionAmount = (amount: number) =>
    formatContributionBaseAmount(amount, formatEur, convertToEur);
  const investableHoldings = useMemo(
    () =>
      holdings.filter(
        (holding) => holding.assetType !== "cash" && holding.id && holding.symbol,
      ),
    [holdings],
  );
  const [mode, setMode] = useState<FormMode>("create");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ContributionEntryDraft>(() =>
    buildEmptyDraft(
      baseCurrency,
      entries.length === 0 ? "opening_balance" : "manual",
    ),
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const currencySymbol = portfolioBaseCurrencySymbol(baseCurrency);
  const showOpeningBalance = entries.length === 0 && mode === "create";
  const showDestination =
    draft.entryType === "contribution" || mode === "edit";
  const investDestination = draft.destinationType === "holding";
  const derivedInvestAmount =
    investDestination &&
    draft.destinationQuantity != null &&
    draft.destinationPricePerUnit != null &&
    draft.destinationQuantity > 0 &&
    draft.destinationPricePerUnit > 0
      ? deriveHoldingContributionAmount(
          draft.destinationQuantity,
          draft.destinationPricePerUnit,
          draft.destinationFee,
        )
      : null;

  const valueAbovePercent =
    summary.valueAboveContributionsPercent != null &&
    Number.isFinite(summary.valueAboveContributionsPercent)
      ? `${summary.valueAboveContributionsPercent >= 0 ? "+" : "−"}${formatPortfolioPercent(
          Math.abs(summary.valueAboveContributionsPercent),
        )}`
      : null;

  const dialogTitle = useMemo(() => {
    if (mode === "edit") {
      return "Edit entry";
    }
    return showOpeningBalance ? CONTRIBUTIONS_OPENING_LABEL : "Add entry";
  }, [mode, showOpeningBalance]);

  function resetCreateForm() {
    setMode("create");
    setEditingId(null);
    setDraft(
      buildEmptyDraft(
        baseCurrency,
        entries.length === 0 ? "opening_balance" : "manual",
      ),
    );
    setFormError(null);
    setDeleteConfirmId(null);
  }

  function startEdit(entry: PortfolioContributionEntry) {
    setMode("edit");
    setEditingId(entry.id);
    setDraft(entryToDraft(entry));
    setFormError(null);
    setDeleteConfirmId(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isMutating) {
      return;
    }

    const validation = validateContributionDraft(draft, baseCurrency, {
      allowedHoldings: investableHoldings,
    });
    if (!validation.ok) {
      setFormError(validation.message);
      return;
    }

    setFormError(null);

    try {
      await onSave(validation.draft, editingId ?? undefined);
      resetCreateForm();
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not save this contribution entry.",
      );
    }
  }

  async function handleDelete(entryId: string) {
    if (isMutating) {
      return;
    }

    try {
      await onDelete(entryId);
      if (editingId === entryId) {
        resetCreateForm();
      }
      setDeleteConfirmId(null);
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : "Could not delete this contribution entry.",
      );
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-contributions-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:rounded-[28px]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <p className={appSectionLabelClass}>Contributions</p>
            <h2 id="manage-contributions-title" className={`mt-2 ${appSectionTitleClass}`}>
              {CONTRIBUTIONS_MANAGE_LABEL}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
          {entries.length === 0 ? (
            <p className={`mb-5 ${appSectionBodyClass}`}>
              {CONTRIBUTIONS_ONBOARDING_COPY}
            </p>
          ) : (
            <div className="mb-5 grid gap-3 sm:grid-cols-3">
              <SummaryMetric
                label="Net contributed"
                value={formatContributionAmount(summary.netContributed)}
              />
              <SummaryMetric
                label="Current value"
                value={
                  portfolioValueAvailable && summary.currentValue != null
                    ? formatEur(summary.currentValue)
                    : "Unavailable"
                }
              />
              <SummaryMetric
                label="Value above contributions"
                value={
                  portfolioValueAvailable &&
                  summary.valueAboveContributions != null
                    ? `${formatSignedPortfolioCurrency(
                        summary.valueAboveContributions,
                        formatContributionAmount,
                      )}${valueAbovePercent ? ` · ${valueAbovePercent}` : ""}`
                    : "Unavailable"
                }
              />
            </div>
          )}

          <p className={`mb-5 ${appSectionMetaClass}`}>
            {CONTRIBUTIONS_EXPLANATORY_COPY}
          </p>

          {mutationError ? (
            <p className="mb-4 text-sm text-red-700" role="alert">
              {mutationError}
            </p>
          ) : null}

          <form
            onSubmit={(event) => void handleSubmit(event)}
            className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5"
            noValidate
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-slate-900">{dialogTitle}</h3>
              {mode === "edit" ? (
                <button
                  type="button"
                  onClick={resetCreateForm}
                  className="text-sm font-semibold text-blue-700 hover:text-blue-800"
                >
                  Cancel edit
                </button>
              ) : null}
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className={appSectionLabelClass}>Type</span>
                <select
                  value={draft.entryType}
                  onChange={(event) => {
                    const entryType =
                      event.target.value as ContributionEntryDraft["entryType"];
                    setDraft((current) => ({
                      ...current,
                      entryType,
                      destinationType:
                        entryType === "withdrawal"
                          ? "cash"
                          : current.destinationType,
                      destinationHoldingId:
                        entryType === "withdrawal"
                          ? null
                          : current.destinationHoldingId,
                      destinationHoldingSymbol:
                        entryType === "withdrawal"
                          ? null
                          : current.destinationHoldingSymbol,
                      destinationQuantity:
                        entryType === "withdrawal"
                          ? null
                          : current.destinationQuantity,
                      destinationPricePerUnit:
                        entryType === "withdrawal"
                          ? null
                          : current.destinationPricePerUnit,
                      destinationFee:
                        entryType === "withdrawal"
                          ? null
                          : current.destinationFee,
                    }));
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                >
                  <option value="contribution">Contribution</option>
                  <option value="withdrawal">Withdrawal</option>
                </select>
              </label>

              <label className="block space-y-2">
                <span className={appSectionLabelClass}>Date</span>
                <input
                  type="date"
                  value={draft.entryDate}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      entryDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  required
                />
              </label>

              {showDestination ? (
                <fieldset className="space-y-2 sm:col-span-2">
                  <legend className={appSectionLabelClass}>Destination</legend>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
                      <input
                        type="radio"
                        name="contribution-destination"
                        checked={draft.destinationType === "cash"}
                        disabled={draft.entryType === "withdrawal"}
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            destinationType: "cash",
                            destinationHoldingId: null,
                            destinationHoldingSymbol: null,
                            destinationQuantity: null,
                            destinationPricePerUnit: null,
                            destinationFee: null,
                          }))
                        }
                      />
                      {CONTRIBUTION_DEFAULT_DESTINATION_ACTION}
                    </label>
                    <label className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-800">
                      <input
                        type="radio"
                        name="contribution-destination"
                        checked={draft.destinationType === "holding"}
                        disabled={
                          draft.entryType === "withdrawal" ||
                          investableHoldings.length === 0
                        }
                        onChange={() =>
                          setDraft((current) => ({
                            ...current,
                            destinationType: "holding",
                            destinationHoldingId:
                              current.destinationHoldingId ??
                              investableHoldings[0]?.id ??
                              null,
                            destinationHoldingSymbol:
                              current.destinationHoldingSymbol ??
                              investableHoldings[0]?.symbol ??
                              null,
                            destinationQuantity:
                              current.destinationQuantity ?? 0,
                            destinationPricePerUnit:
                              current.destinationPricePerUnit ?? 0,
                          }))
                        }
                      />
                      {CONTRIBUTION_HOLDING_DESTINATION_ACTION}
                    </label>
                  </div>
                  {draft.entryType === "contribution" &&
                  investableHoldings.length === 0 ? (
                    <p className={appSectionMetaClass}>
                      Add an investment holding first to record an invested
                      contribution.
                    </p>
                  ) : null}
                </fieldset>
              ) : null}

              {investDestination ? (
                <>
                  <label className="block space-y-2 sm:col-span-2">
                    <span className={appSectionLabelClass}>Holding</span>
                    <select
                      value={draft.destinationHoldingId ?? ""}
                      onChange={(event) => {
                        const selected = investableHoldings.find(
                          (holding) => holding.id === event.target.value,
                        );
                        setDraft((current) => ({
                          ...current,
                          destinationHoldingId: selected?.id ?? null,
                          destinationHoldingSymbol: selected?.symbol ?? null,
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                      required
                    >
                      <option value="" disabled>
                        Select a holding
                      </option>
                      {investableHoldings.map((holding) => (
                        <option key={holding.id} value={holding.id}>
                          {holding.symbol} — {holding.name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block space-y-2">
                    <span className={appSectionLabelClass}>Quantity</span>
                    <NumericInput
                      value={draft.destinationQuantity ?? 0}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          destinationQuantity: value,
                        }))
                      }
                      placeholder="0"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none"
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className={appSectionLabelClass}>
                      Price per unit ({baseCurrency})
                    </span>
                    <span className="flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-400">
                      <span className="font-semibold text-slate-400">
                        {currencySymbol}
                      </span>
                      <NumericInput
                        value={draft.destinationPricePerUnit ?? 0}
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            destinationPricePerUnit: value,
                          }))
                        }
                        placeholder="0"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                      />
                    </span>
                  </label>

                  <label className="block space-y-2 sm:col-span-2">
                    <span className={appSectionLabelClass}>
                      Fee (optional, {baseCurrency})
                    </span>
                    <span className="flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-400">
                      <span className="font-semibold text-slate-400">
                        {currencySymbol}
                      </span>
                      <NumericInput
                        value={draft.destinationFee ?? 0}
                        onChange={(value) =>
                          setDraft((current) => ({
                            ...current,
                            destinationFee: value,
                          }))
                        }
                        placeholder="0"
                        className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                      />
                    </span>
                  </label>

                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                    <p className={appSectionLabelClass}>Contribution amount</p>
                    <p className="mt-1 text-base font-semibold text-slate-900">
                      {derivedInvestAmount != null
                        ? formatContributionAmount(derivedInvestAmount)
                        : "Enter quantity and price"}
                    </p>
                    <p className={`mt-1 ${appSectionMetaClass}`}>
                      {CONTRIBUTION_FUNDING_ONLY_NOTE}
                    </p>
                  </div>
                </>
              ) : (
                <label className="block space-y-2 sm:col-span-2">
                  <span className={appSectionLabelClass}>
                    Amount ({baseCurrency})
                  </span>
                  <span className="flex min-h-[44px] items-center rounded-xl border border-slate-200 bg-white px-3 focus-within:border-blue-400">
                    <span className="font-semibold text-slate-400">
                      {currencySymbol}
                    </span>
                    <NumericInput
                      value={draft.amount}
                      onChange={(value) =>
                        setDraft((current) => ({
                          ...current,
                          amount: value,
                          currency: baseCurrency,
                        }))
                      }
                      placeholder="0"
                      className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none"
                    />
                  </span>
                  <span className={appSectionMetaClass}>
                    Entries are stored in your portfolio base currency (
                    {baseCurrency}).
                  </span>
                </label>
              )}

              <label className="block space-y-2 sm:col-span-2">
                <span className={appSectionLabelClass}>Note (optional)</span>
                <input
                  type="text"
                  value={draft.note ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  maxLength={500}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
                  placeholder={
                    showOpeningBalance
                      ? "e.g. Total contributed before using Tobailey"
                      : "Optional note"
                  }
                />
              </label>
            </div>

            {formError ? (
              <p className="mt-3 text-sm text-red-700" role="alert">
                {formError}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isMutating}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMutating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  Saving…
                </>
              ) : mode === "edit" ? (
                "Save changes"
              ) : showOpeningBalance ? (
                "Save opening contribution"
              ) : (
                "Add entry"
              )}
            </button>
          </form>

          {entries.length > 0 ? (
            <div className="mt-6 space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">Entries</h3>
              <ul className="space-y-3">
                {entries.map((entry) => {
                  const isDeleting = deleteConfirmId === entry.id;
                  const destinationLines = formatContributionDestinationLines(
                    entry,
                    formatContributionAmount,
                  );

                  return (
                    <li
                      key={entry.id}
                      className="rounded-2xl border border-slate-200 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900">
                            {activityTypeLabel(entry)}
                          </p>
                          <p className={`mt-1 ${appSectionMetaClass}`}>
                            {formatEntryDate(entry.entryDate)} ·{" "}
                            {entry.entryType === "withdrawal" ? "−" : ""}
                            {formatContributionAmount(entry.baseAmount)}
                          </p>
                          {destinationLines.map((line) => (
                            <p
                              key={line}
                              className={`mt-1 ${appSectionMetaClass}`}
                            >
                              {line}
                            </p>
                          ))}
                          {entry.note ? (
                            <p className={`mt-1 ${appSectionBodyClass}`}>
                              {entry.note}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(entry)}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl hover:bg-slate-100"
                            aria-label={`Edit ${entry.entryType} on ${entry.entryDate}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(entry.id)}
                            className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl hover:bg-red-50"
                            aria-label={`Delete ${entry.entryType} on ${entry.entryDate}`}
                          >
                            <Trash2 className="h-4 w-4 text-red-700" />
                          </button>
                        </div>
                      </div>

                      {isDeleting ? (
                        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-red-50 px-3 py-3">
                          <p className="text-sm text-red-800">
                            Delete this entry permanently?
                          </p>
                          <button
                            type="button"
                            disabled={isMutating}
                            onClick={() => void handleDelete(entry.id)}
                            className="rounded-lg bg-red-700 px-3 py-1.5 text-sm font-semibold text-white"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(null)}
                            className="text-sm font-semibold text-slate-700"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function SummaryMetric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <p className={appSectionLabelClass}>{label}</p>
      <p className="mt-1 truncate text-base font-semibold text-slate-900">{value}</p>
    </div>
  );
}
