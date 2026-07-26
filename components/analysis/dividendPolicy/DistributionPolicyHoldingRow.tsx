"use client";

import { useId } from "react";

import {
  DistributionPolicyConfidenceBadge,
  DistributionPolicyConflictBadge,
  DistributionPolicyStatusBadge,
} from "@/components/analysis/dividendPolicy/DistributionPolicyBadges";
import {
  appSectionBodyClass,
  appSectionLabelClass,
  appSectionMetaClass,
  appTableNameClass,
  appTickerClass,
} from "@/components/layout/appSurface";
import {
  confidenceBadgeLabel,
  formatPolicyUpdatedAt,
} from "@/lib/client/dividendPolicy/buildDividendPolicyViewModel";
import { DistributionPolicyOfficialSourceLink } from "@/components/analysis/dividendPolicy/DistributionPolicyOfficialSourceLink";
import type { DistributionPolicyHoldingViewModel } from "@/lib/client/dividendPolicy/buildDividendPolicyViewModel";
import type { DistributionPolicyUserOverride } from "@/lib/types/distributionPolicy";

function canReviewDistributionPolicy(
  holding: DistributionPolicyHoldingViewModel["holding"],
): boolean {
  return holding.assetType !== "cash" && holding.assetType !== "crypto";
}

export function DistributionPolicyUserConfirmControl({
  currentOverride,
  onChange,
  disabled = false,
}: {
  currentOverride: DistributionPolicyUserOverride | undefined;
  onChange: (value: DistributionPolicyUserOverride) => void;
  disabled?: boolean;
}) {
  const groupId = useId();

  const options: Array<{
    value: DistributionPolicyUserOverride;
    label: string;
    helper?: string;
  }> = [
    { value: "distributing", label: "Pays cash distributions" },
    { value: "accumulating", label: "Reinvests internally" },
    {
      value: "non_distributing",
      label: "No current cash distributions",
      helper: "Distribution policies can change over time.",
    },
    { value: null, label: "Not sure — use automatic classification" },
  ];

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className={`${appSectionLabelClass} mb-1`}>
        Review distribution policy
      </legend>
      <p className={`${appSectionMetaClass}`}>
        This setting affects classification only. It does not record dividend income.
      </p>
      <div className="space-y-2">
        {options.map((option) => {
          const inputId = `${groupId}-${option.value ?? "auto"}`;
          const checked = (currentOverride ?? null) === option.value;

          return (
            <label
              key={inputId}
              htmlFor={inputId}
              className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-emerald-700"
            >
              <input
                id={inputId}
                type="radio"
                name={groupId}
                className="mt-1 h-4 w-4 shrink-0"
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              <span className="min-w-0">
                <span className={`${appSectionBodyClass} break-words text-slate-900`}>
                  {option.label}
                </span>
                {option.helper ? (
                  <span className={`mt-1 block break-words ${appSectionMetaClass}`}>
                    {option.helper}
                  </span>
                ) : null}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function DistributionPolicyHoldingRow({
  item,
  expanded,
  onToggle,
  onPolicyOverrideChange,
  canEdit = true,
}: {
  item: DistributionPolicyHoldingViewModel;
  expanded: boolean;
  onToggle: () => void;
  onPolicyOverrideChange?: (value: DistributionPolicyUserOverride) => void;
  canEdit?: boolean;
}) {
  const { holding, classification } = item;
  const updatedLabel = formatPolicyUpdatedAt(classification.dataUpdatedAt);
  const detailsId = `distribution-policy-${holding.id}`;
  const showReviewControl = canReviewDistributionPolicy(holding);

  return (
    <article className="rounded-[20px] border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-3">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className={`truncate ${appTableNameClass}`}>{holding.name}</p>
            <p className={`truncate ${appTickerClass}`}>{holding.symbol}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <DistributionPolicyStatusBadge policy={classification.policy} />
            <DistributionPolicyConfidenceBadge
              label={confidenceBadgeLabel(classification)}
            />
          </div>
        </div>

        <p className={`${appSectionBodyClass}`}>{classification.evidenceSummary}</p>

        {classification.policy === "non_distributing" ? (
          <p className={appSectionMetaClass}>
            This investment is not currently expected to make cash distributions.
            Distribution policies can change over time.
          </p>
        ) : null}

        {classification.conflictDetected && classification.conflictSummary ? (
          <DistributionPolicyConflictBadge message={classification.conflictSummary} />
        ) : null}

        <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4">
          <p className={appSectionMetaClass}>
            Source: {classification.classificationSource}
          </p>
          {updatedLabel ? (
            <p className={appSectionMetaClass}>Updated: {updatedLabel}</p>
          ) : null}
          {classification.isin ? (
            <p className={`${appSectionMetaClass} break-all`}>ISIN: {classification.isin}</p>
          ) : null}
        </div>

        {showReviewControl ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex min-h-[44px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 sm:w-auto sm:justify-start"
            aria-expanded={expanded}
            aria-controls={detailsId}
          >
            {expanded ? "Hide review" : "Review"}
          </button>
        ) : null}

        {showReviewControl && expanded ? (
          <div id={detailsId} className="space-y-4 border-t border-slate-200 pt-4">
            <DistributionPolicyOfficialSourceLink classification={classification} />
            {canEdit && onPolicyOverrideChange ? (
              <DistributionPolicyUserConfirmControl
                currentOverride={holding.distributionPolicyUserOverride}
                onChange={onPolicyOverrideChange}
              />
            ) : null}
          </div>
        ) : null}

        {!showReviewControl && classification.policy === "not_applicable" ? (
          <DistributionPolicyOfficialSourceLink classification={classification} />
        ) : null}
      </div>
    </article>
  );
}
