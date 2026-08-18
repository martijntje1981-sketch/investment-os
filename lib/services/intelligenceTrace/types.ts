/**
 * Phase 7A — reusable traceable intelligence model.
 * Presentation layers map to glance → expand → explore without UI coupling.
 */

export type IntelligenceTraceLayerId =
  | "evidence"
  | "change"
  | "meaning"
  | "sensitivity"
  | "goal_impact"
  | "calculation"
  | "confidence";

/** Where the layer appears in the Four Questions stack. */
export type IntelligenceTracePresentation = "expand" | "explore";

export type IntelligenceTraceLayer = {
  id: IntelligenceTraceLayerId;
  /** User-facing section title, e.g. "Evidence", "What it means". */
  title: string;
  detail: string;
  bullets?: string[];
  presentation: IntelligenceTracePresentation;
  href?: string | null;
  hrefExternal?: boolean;
};

export type IntelligenceTrace = {
  /** Mirrors the glance conclusion — useful for tests and hub reuse. */
  insight: string;
  layers: IntelligenceTraceLayer[];
  /** Layers intentionally omitted because data was unavailable. */
  omittedLayerIds?: IntelligenceTraceLayerId[];
};
