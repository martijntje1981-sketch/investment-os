/**
 * Shared exposure-group color tokens for Dashboard and Analysis.
 * Keep bar and legend colors identical across surfaces.
 */

import type { ExposureGroupId } from "@/lib/services/classification/types";

export const EXPOSURE_GROUP_BAR_CLASS: Record<ExposureGroupId, string> = {
  technology_communication: "bg-brand-strong",
  healthcare: "bg-rose-500",
  consumer: "bg-orange-500",
  financials_real_estate: "bg-indigo-600",
  industrials_resources: "bg-amber-600",
  diversified_equity: "bg-slate-700",
  fixed_income: "bg-teal-700",
  precious_metals: "bg-yellow-700",
  crypto: "bg-q2-strong",
  cash: "bg-emerald-600",
  other_unclassified: "bg-slate-300",
};

export const EXPOSURE_GROUP_DOT_CLASS: Record<ExposureGroupId, string> = {
  technology_communication: "bg-brand-strong",
  healthcare: "bg-rose-500",
  consumer: "bg-orange-500",
  financials_real_estate: "bg-indigo-600",
  industrials_resources: "bg-amber-600",
  diversified_equity: "bg-slate-700",
  fixed_income: "bg-teal-700",
  precious_metals: "bg-yellow-700",
  crypto: "bg-q2-strong",
  cash: "bg-emerald-600",
  other_unclassified: "bg-slate-300",
};
