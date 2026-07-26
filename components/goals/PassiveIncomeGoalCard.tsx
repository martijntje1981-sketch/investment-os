"use client";

import { useId, useState } from "react";
import { ChevronDown, TrendingUp } from "lucide-react";

import { PassiveIncomeUserEstimateControl } from "@/components/goals/PassiveIncomeUserEstimateControl";
import { ConversionDetailsDisclosure } from "@/components/currency/ConversionDetailsDisclosure";
import {
  appSectionLabelClass,
  appSectionSubtitleClass,
  appSectionTitleClass,
  appValueClass,
} from "@/components/layout/appSurface";
import { useBaseCurrencyDisplay } from "@/lib/client/baseCurrencyDisplay";
import { hasPassiveIncomeTarget } from "@/lib/client/goalPassiveIncome";
import { formatPortfolioPercent } from "@/lib/client/portfolioAnalysis";
import {
  buildPassiveIncomeGoalProgressState,
} from "@/lib/services/dividends/passiveIncomeProjection";
import {
  buildGoalDividendMessage,
  getGoalDividendReliability,
} from "@/lib/services/goals/goalDividendStatus";
import type { PassiveIncomeHoldingRecord } from "@/lib/types/dividends";
import type { PortfolioDividendSnapshot } from "@/lib/types/dividends";
import type { PassiveIncomeUserEstimate } from "@/lib/types/passiveIncomeUserEstimate";

function policyBadgeClass(policy: PassiveIncomeHoldingRecord["distributionPolicy"]): string {
  switch (policy) {
    case "distributing":
      return "bg-emerald-50 text-emerald-800 ring-emerald-200";
    case "accumulating":
      return "bg-amber-50 text-amber-900 ring-amber-200";
    case "non_distributing":
      return "bg-slate-100 text-slate-800 ring-slate-300";
    case "not_applicable":
      return "bg-slate-100 text-slate-700 ring-slate-200";
    default:
      return "bg-slate-100 text-slate-700 ring-slate-200";
  }
}

function formatPolicyLabel(policy: PassiveIncomeHoldingRecord["distributionPolicy"]): string {
  switch (policy) {
    case "distributing":
      return "Distributing";
    case "accumulating":
      return "Accumulating";
    case "non_distributing":
      return "No current distributions";
    case "not_applicable":
      return "Not applicable";
    default:
      return "Unknown";
  }
}

function formatEstimateSource(source: PassiveIncomeHoldingRecord["estimateSource"]): string {
  switch (source) {
    case "provider":
      return "Provider data";
    case "user_annual_yield":
      return "User estimate (annual yield)";
    case "user_annual_cash_amount":
      return "User estimate (annual cash amount)";
    default:
      return "Unavailable";
  }
}

function PassiveIncomeGoalDetails({
  records,
  onEstimateChange,
  formatEur,
}: {
  records: PassiveIncomeHoldingRecord[];
  onEstimateChange?: (
    holdingId: string,
    estimate: PassiveIncomeUserEstimate | null,
  ) => void;
  formatEur: (value: number) => string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonId = useId();

  if (records.length === 0) {
    return null;
  }

  return (
    <div className="mt-5 border-t border-slate-200 pt-4">
      <button
        id={buttonId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-[44px] w-full items-center justify-between gap-3 rounded-xl px-1 py-2 text-left text-sm font-semibold text-slate-800 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto"
      >
        <span>{open ? "Hide details" : "Show details"}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div
          id={panelId}
          role="region"
          aria-labelledby={buttonId}
          className="mt-3 space-y-3"
        >
          {records.map((record) => {
            const showEstimateEditor =
              Boolean(onEstimateChange) &&
              record.distributionPolicy !== "not_applicable" &&
              (record.acceptsUserEstimate ||
                record.estimateSource === "provider" ||
                (record.eligibility === "ineligible" &&
                  record.storedUserEstimate != null));

            return (
              <article
                key={record.holdingId}
                className="rounded-[18px] border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{record.symbol}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{record.name}</p>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${policyBadgeClass(record.distributionPolicy)}`}
                  >
                    {formatPolicyLabel(record.distributionPolicy)}
                  </span>
                </div>

                <p className="mt-3 text-sm leading-6 text-slate-700">{record.explanation}</p>

                <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="font-semibold text-slate-500">Status</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {record.eligibility === "eligible" ? "Eligible" : "Ineligible"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Evidence</dt>
                    <dd className="mt-0.5 text-slate-800">{record.confidenceLabel}</dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">Estimate source</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {formatEstimateSource(record.estimateSource)}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-semibold text-slate-500">
                      Estimated annual cash distribution
                    </dt>
                    <dd className="mt-0.5 font-semibold text-slate-900">
                      {record.estimatedAnnualCashDistributionEur != null
                        ? formatEur(
                            record.estimatedAnnualCashDistributionEur,
                          )
                        : "Unavailable"}
                    </dd>
                  </div>
                  {record.dataUpdatedAt ? (
                    <div className="sm:col-span-2">
                      <dt className="font-semibold text-slate-500">Updated</dt>
                      <dd className="mt-0.5 text-slate-800">
                        {formatShortDate(record.dataUpdatedAt)}
                      </dd>
                    </div>
                  ) : null}
                </dl>

                {showEstimateEditor && onEstimateChange ? (
                  <div className="mt-4">
                    <PassiveIncomeUserEstimateControl
                      currentEstimate={record.storedUserEstimate}
                      providerDataUsed={
                        record.eligibility === "eligible" &&
                        record.estimateSource === "provider"
                      }
                      retainedButExcluded={
                        record.eligibility === "ineligible" &&
                        record.storedUserEstimate != null
                      }
                      exclusionReason={record.explanation}
                      onSave={(estimate) =>
                        onEstimateChange(record.holdingId, estimate)
                      }
                      onRemove={() => onEstimateChange(record.holdingId, null)}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function formatShortDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatProgressPercent(value: number | null): string {
  if (value == null || !Number.isFinite(value)) {
    return "—";
  }
  return formatPortfolioPercent(Math.min(value, 9999));
}

export function PassiveIncomeGoalCard({
  snapshot,
  passiveIncomeTarget,
  onEstimateChange,
}: {
  snapshot: PortfolioDividendSnapshot;
  passiveIncomeTarget?: number | null;
  onEstimateChange?: (
    holdingId: string,
    estimate: PassiveIncomeUserEstimate | null,
  ) => void;
}) {
  const { formatEur } = useBaseCurrencyDisplay();
  const projection = snapshot.passiveIncome;
  const progressState = buildPassiveIncomeGoalProgressState({
    projection,
    passiveIncomeTargetEur: passiveIncomeTarget,
  });
  const hasTarget = hasPassiveIncomeTarget(passiveIncomeTarget);
  const reliability = getGoalDividendReliability(projection);
  const dividendMessage = buildGoalDividendMessage(reliability, projection);
  const showEstimate = progressState.status === "ready";
  const showUnavailableEstimate =
    hasTarget &&
    (progressState.status === "estimate-unavailable" ||
      progressState.status === "no-eligible-holdings");

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className={`${appSectionLabelClass} text-emerald-700`}>
            Passive income goal
          </p>
          <h2 className={`mt-2 ${appSectionTitleClass}`}>
            Estimated annual cash distributions
          </h2>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
          <TrendingUp className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Estimated annual cash distributions"
          value={
            showEstimate
              ? formatEur(progressState.eligibleEstimatedAnnualEur)
              : showUnavailableEstimate
                ? "Unavailable"
                : projection.hasUsableEstimate
                  ? formatEur(projection.eligibleEstimatedAnnualCashDistributionEur)
                  : "Unavailable"
          }
        />
        <Stat
          label="Annual target"
          value={
            hasTarget
              ? formatEur(passiveIncomeTarget!)
              : "Not set"
          }
        />
        <Stat
          label="Remaining"
          value={
            showEstimate && progressState.remainingAnnualEur != null
              ? formatEur(progressState.remainingAnnualEur)
              : "—"
          }
        />
        <Stat
          label="Achieved"
          value={
            showEstimate && progressState.displayProgressPercent != null
              ? formatProgressPercent(progressState.displayProgressPercent)
              : hasTarget
                ? "—"
                : "—"
          }
          detail={
            showEstimate &&
            progressState.rawProgressPercent != null &&
            progressState.rawProgressPercent > 100
              ? `${formatProgressPercent(progressState.rawProgressPercent)} of target`
              : undefined
          }
        />
      </div>

      {showEstimate && progressState.estimatedMonthlyEquivalentEur != null ? (
        <p className={`mt-4 ${appSectionSubtitleClass}`}>
          Estimated monthly equivalent:{" "}
          <span className="font-semibold text-slate-800">
            {formatEur(progressState.estimatedMonthlyEquivalentEur)}
          </span>
          {" "}(estimate)
        </p>
      ) : null}

      <p className={`mt-3 ${appSectionSubtitleClass}`}>
        Based on {projection.eligibleHoldingsCount} eligible holding
        {projection.eligibleHoldingsCount === 1 ? "" : "s"}
        {projection.excludedHoldingsCount > 0
          ? ` · ${projection.excludedHoldingsCount} excluded or awaiting reliable data`
          : ""}
        .
      </p>

      {projection.includesUserEstimates ? (
        <p className={`mt-1 ${appSectionSubtitleClass}`}>Includes user estimates.</p>
      ) : null}

      <p className={`mt-2 ${appSectionSubtitleClass}`}>{dividendMessage}</p>

      <p className={`mt-2 ${appSectionSubtitleClass}`}>
        Accumulating funds reinvest internally and are not counted as cash income.
      </p>

      {hasTarget && showEstimate ? (
        <div className="mt-5">
          <div
            className="relative h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressState.fillProgressPercent}
            aria-label="Passive income goal progress"
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 motion-reduce:transition-none transition-[width] duration-500"
              style={{ width: `${Math.max(progressState.fillProgressPercent, progressState.fillProgressPercent > 0 ? 4 : 0)}%` }}
            />
          </div>
        </div>
      ) : null}

      {!hasTarget ? (
        <p className={`mt-5 ${appSectionSubtitleClass}`}>
          Set a passive income target above to track conservative cash-distribution
          progress toward your long-term income goal.
        </p>
      ) : null}

      <div className="mt-4">
        <ConversionDetailsDisclosure compactTrigger />
      </div>

      <PassiveIncomeGoalDetails
        records={projection.holdingRecords}
        onEstimateChange={onEstimateChange}
        formatEur={formatEur}
      />
    </section>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className={appSectionLabelClass}>{label}</p>
      <p className={`mt-1.5 break-words ${appValueClass}`}>{value}</p>
      {detail ? (
        <p className={`mt-1 ${appSectionSubtitleClass}`}>{detail}</p>
      ) : null}
    </div>
  );
}
