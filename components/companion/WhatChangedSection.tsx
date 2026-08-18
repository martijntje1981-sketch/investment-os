import {
  CHANGE_INTELLIGENCE_COMPLETE_TEASE,
  FIRST_HISTORY_COPY,
  NO_MATERIAL_CHANGE_COPY,
} from "@/lib/services/changeIntelligence/config";
import type { ChangeIntelligenceSummary } from "@/lib/services/changeIntelligence/types";
import type { FourQuestionsIntelligenceDepth } from "@/lib/services/fourQuestions/types";
import { appSectionMetaClass } from "@/components/layout/appSurface";

type WhatChangedSectionProps = {
  summary: ChangeIntelligenceSummary;
  firstHistoryCopy?: string | null;
  intelligenceDepth: FourQuestionsIntelligenceDepth;
  /** Hide entirely on daily review. */
  visible: boolean;
};

/**
 * Concise Review "What changed?" block. Omits when there is nothing honest to show.
 */
export function WhatChangedSection({
  summary,
  firstHistoryCopy = null,
  intelligenceDepth,
  visible,
}: WhatChangedSectionProps) {
  if (!visible) return null;

  if (firstHistoryCopy || summary.status === "insufficient_history") {
    if (!firstHistoryCopy) return null;
    return (
      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          What changed?
        </p>
        <p className={`mt-2 ${appSectionMetaClass}`}>{FIRST_HISTORY_COPY}</p>
      </section>
    );
  }

  if (summary.noMaterialChange || !summary.freeHeadline) {
    if (summary.status !== "ready") return null;
    return (
      <section className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
          What changed?
        </p>
        <p className="mt-2 text-[15px] font-semibold text-slate-950">
          {NO_MATERIAL_CHANGE_COPY}
        </p>
      </section>
    );
  }

  const complete = intelligenceDepth === "complete";
  const story = summary.primaryStory;
  const headline = complete
    ? story?.headline ?? summary.freeHeadline
    : summary.freeHeadline;

  return (
    <section className="mt-5 rounded-2xl border border-brand/20 bg-brand-soft/40 px-4 py-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-brand-navy">
        What changed?
      </p>
      <p className="mt-2 text-[15px] font-semibold text-slate-950">{headline}</p>
      {complete && story?.relatedLines[0] ? (
        <p className={`mt-2 ${appSectionMetaClass}`}>{story.relatedLines[0]}</p>
      ) : null}
      {complete &&
      summary.goalChange &&
      !summary.goalChange.goalDefinitionChanged &&
      story ? (
        <p className={`mt-1 ${appSectionMetaClass}`}>{summary.goalChange.headline}</p>
      ) : null}
      {complete && summary.resilienceChange && story ? (
        <p className={`mt-1 ${appSectionMetaClass}`}>
          {summary.resilienceChange.headline}
        </p>
      ) : null}
      {!complete && summary.completeTease ? (
        <p className="mt-2 text-[13px] font-semibold text-brand-navy">
          {CHANGE_INTELLIGENCE_COMPLETE_TEASE}
        </p>
      ) : null}
    </section>
  );
}
