/**
 * Renderer-facing view of PeriodIntelligenceReview.
 * Maps fields only. Does not recompute performance, change, goals, or resilience.
 */

import { TRUST_NOT_ADVICE_SHORT } from "@/lib/content/productTrust";
import type {
  PeriodIntelligenceContextItem,
  PeriodIntelligenceReview,
  PeriodIntelligenceSection,
  PeriodReportHeroMetric,
} from "@/lib/services/periodIntelligence/types";

export type PersonalReportAccent = "cyan" | "violet" | "amber" | "teal" | "slate";

export type PersonalReportSectionView = {
  id: string;
  title: string;
  headline: string;
  whyItMatters: string | null;
  evidence: string[];
  href: string | null;
  accent: PersonalReportAccent;
};

export type PersonalReportViewModel = {
  kind: PeriodIntelligenceReview["kind"];
  depth: PeriodIntelligenceReview["intelligenceDepth"];
  ready: boolean;
  kicker: string;
  conclusion: string;
  dateRangeLabel: string;
  metrics: PeriodReportHeroMetric[];
  dataAsOf: string | null;
  isDemo: boolean;
  executiveSummary: string[];
  sections: PersonalReportSectionView[];
  context: PeriodIntelligenceContextItem | null;
  confidenceNotes: string[];
  completeTease: string | null;
  trustLine: string;
};

const SECTION_ACCENT: Record<string, PersonalReportAccent> = {
  happened: "cyan",
  changed: "slate",
  matters: "violet",
  goal: "amber",
  ahead: "teal",
};

function evidenceLimit(
  kind: PeriodIntelligenceReview["kind"],
  depth: PeriodIntelligenceReview["intelligenceDepth"],
  sectionId: string,
): number {
  if (depth === "free") return sectionId === "happened" ? 2 : 0;
  if (kind === "weekly") return sectionId === "changed" ? 2 : 2;
  return sectionId === "changed" ? 4 : 3;
}

function mapSection(
  review: PeriodIntelligenceReview,
  section: PeriodIntelligenceSection | null,
  href: string | null,
): PersonalReportSectionView | null {
  if (!section) return null;
  const complete = review.intelligenceDepth === "complete";
  const limit = evidenceLimit(review.kind, review.intelligenceDepth, section.id);
  return {
    id: section.id,
    title: section.title,
    headline: section.headline,
    whyItMatters:
      complete && section.id === "happened" && review.kind === "weekly"
        ? null
        : complete
          ? section.whyItMatters
          : null,
    evidence: section.evidence.slice(0, limit),
    href,
    accent: SECTION_ACCENT[section.id] ?? "slate",
  };
}

function formatDataAsOf(value: string | null): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return day ? `Data as of ${day}` : null;
}

/**
 * Convert the canonical period object into a renderer-safe report view.
 */
export function toPersonalReportViewModel(
  review: PeriodIntelligenceReview,
): PersonalReportViewModel {
  const hero = review.hero;
  const conclusion =
    hero?.conclusion ?? review.headline ?? review.period.label;
  const explore = review.explore;

  const sections = [
    mapSection(review, review.happened, explore.happened),
    mapSection(
      review,
      review.changed,
      review.firstHistory || review.noMaterialChange ? null : explore.changed,
    ),
    mapSection(review, review.matters, explore.matters),
    mapSection(review, review.goal, explore.goal),
    mapSection(review, review.ahead, explore.ahead),
  ].filter((row): row is PersonalReportSectionView => row != null);

  const confidenceNotes =
    review.intelligenceDepth === "complete"
      ? review.confidence.notes.slice(0, review.kind === "weekly" ? 2 : 4)
      : [];

  return {
    kind: review.kind,
    depth: review.intelligenceDepth,
    ready: review.ready,
    kicker: hero?.kicker ?? (review.kind === "monthly" ? "Your month" : "Your week"),
    conclusion,
    dateRangeLabel: hero?.dateRangeLabel ?? review.period.dateRangeLabel,
    metrics: hero?.metrics ?? [],
    dataAsOf: formatDataAsOf(review.dataAsOf),
    isDemo: review.isDemo,
    executiveSummary: review.executiveSummary.slice(
      0,
      review.kind === "weekly" ? 2 : 3,
    ),
    sections,
    context:
      review.intelligenceDepth === "complete" ? review.context : null,
    confidenceNotes,
    completeTease: review.completeTease,
    trustLine: TRUST_NOT_ADVICE_SHORT,
  };
}
