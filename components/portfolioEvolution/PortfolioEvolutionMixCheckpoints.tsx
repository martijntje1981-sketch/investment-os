"use client";

import {
  EXPOSURE_GROUP_BAR_CLASS,
  EXPOSURE_GROUP_LABELS,
  type ExposureGroupId,
} from "@/lib/services/classification";
import {
  EVOLUTION_SPARSE_MIX_NOTE,
  type EvolutionMixCheckpoint,
} from "@/lib/services/portfolioEvolution";
import { appSectionLabelClass, appSectionMetaClass } from "@/components/layout/appSurface";
import { formatPerformanceAxisDate } from "@/lib/client/performance";

const MIX_ORDER: ExposureGroupId[] = [
  "crypto",
  "diversified_equity",
  "technology_communication",
  "industrials_resources",
  "fixed_income",
  "precious_metals",
  "cash",
  "other_unclassified",
  "healthcare",
  "consumer",
  "financials_real_estate",
];

function weight(
  checkpoint: EvolutionMixCheckpoint,
  groupId: ExposureGroupId,
): number {
  return checkpoint.groups.find((row) => row.groupId === groupId)?.weightPercent ?? 0;
}

export function PortfolioEvolutionMixCheckpoints({
  checkpoints,
}: {
  checkpoints: EvolutionMixCheckpoint[];
}) {
  const present = MIX_ORDER.filter((groupId) =>
    checkpoints.some((checkpoint) => weight(checkpoint, groupId) > 0),
  );

  return (
    <section
      className="min-w-0 overflow-x-clip"
      aria-labelledby="evolution-mix-heading"
      data-testid="evolution-mix-checkpoints"
    >
      <p className={appSectionLabelClass} id="evolution-mix-heading">
        Mix checkpoints
      </p>
      <div className="mt-3 flex min-w-0 flex-col gap-3">
        {checkpoints.map((checkpoint, index) => (
          <div
            key={`${checkpoint.date}-${checkpoint.sourceQuality}`}
            className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3"
          >
            <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-q1-strong">
              {checkpoint.sourceQuality === "current"
                ? "Now"
                : formatPerformanceAxisDate(checkpoint.date)}
            </p>
            <div>
              <div className="flex h-3 overflow-hidden rounded-full ring-1 ring-cyan-100">
                {present.map((groupId) => {
                  const value = weight(checkpoint, groupId);
                  if (value <= 0) return null;
                  return (
                    <span
                      key={groupId}
                      className={EXPOSURE_GROUP_BAR_CLASS[groupId]}
                      style={{ width: `${value}%` }}
                      title={`${EXPOSURE_GROUP_LABELS[groupId]} ${value}%`}
                    />
                  );
                })}
              </div>
              {index < checkpoints.length - 1 ? (
                <div className="ml-2 h-2 w-px bg-brand/40" aria-hidden />
              ) : null}
            </div>
          </div>
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1">
        {present.map((groupId) => (
          <li key={groupId} className={`flex items-center gap-1.5 ${appSectionMetaClass}`}>
            <span className={`h-2 w-2 rounded-full ${EXPOSURE_GROUP_BAR_CLASS[groupId]}`} />
            {EXPOSURE_GROUP_LABELS[groupId]}
          </li>
        ))}
      </ul>
      <p className={`mt-2 ${appSectionMetaClass}`}>{EVOLUTION_SPARSE_MIX_NOTE}</p>
    </section>
  );
}
